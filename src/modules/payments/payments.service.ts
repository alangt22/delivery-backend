import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
    private stripe: Stripe;

    constructor(
        private prisma: PrismaService
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    }

    async createPayment(orderId: string, customerId: string) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                customerId,
            },
        });
        if (!order) {
            throw new NotFoundException('Pedido nao encontrado');
        }

        const existingPayment = await this.prisma.payment.findUnique({
            where: {
                orderId,
            },
        });
        if (existingPayment) {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(
                existingPayment.stripePaymentIntentId,
            );

            return {
                paymentId: existingPayment.id,
                clientSecret: paymentIntent.client_secret,
            };
        }

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(order.totalAmount * 100),
            currency: 'brl',
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never',
            },
            metadata: { orderId: order.id },
        });

        const payment = await this.prisma.payment.create({
            data: {
                orderId: order.id,
                stripePaymentIntentId: paymentIntent.id,
                amount: order.totalAmount,
            },
        });

        return {
            paymentId: payment.id,
            clientSecret: paymentIntent.client_secret,
        };
    }

    async handleWebhook(req: any) {
        const signature = req.headers['stripe-signature'];

        if (!signature) {
            throw new BadRequestException(
                'Assinatura do Stripe não encontrada.',
            );
        }

        const event = this.stripe.webhooks.constructEvent(
            req.rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!,
        );

        console.log('Webhook recebido:', event.type);

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            console.log('PaymentIntent:', paymentIntent.id);

            const payment = await this.prisma.payment.findUnique({
                where: {
                    stripePaymentIntentId: paymentIntent.id,
                },
            });

            if (!payment) {
                throw new NotFoundException('Pagamento não encontrado.');
            }

            if (payment.stripeEventId === event.id) {
                return { received: true };
            }


            await this.prisma.$transaction([
                this.prisma.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: PaymentStatus.SUCCEEDED,
                        stripeEventId: event.id,
                    },
                }),

                this.prisma.order.update({
                    where: {
                        id: payment.orderId,
                    },
                    data: {
                        status: 'CONFIRMED',
                    },
                }),
            ]);
        }

        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            const payment = await this.prisma.payment.findUnique({
                where: {
                    stripePaymentIntentId: paymentIntent.id,
                },
            });

            if (!payment) {
                throw new NotFoundException('Pagamento não encontrado.');
            }

            if (payment.stripeEventId === event.id) {
                return { received: true };
            }

            await this.prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    status: PaymentStatus.FAILED,
                    stripeEventId: event.id,
                },
            });
        }

        return { received: true };
    }
}