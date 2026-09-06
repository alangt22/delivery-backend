import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';

import Stripe from 'stripe';

import { PrismaService } from 'src/prisma/prisma.service';

import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';


@Injectable()
export class PaymentsService {
    private readonly stripe: Stripe;
    private readonly logger = new Logger(PaymentsService.name);

    constructor(private prisma: PrismaService) {
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

        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
                'Só é possível realizar o pagamento de pedidos pendentes',
            );
        }

        const existingPayment = await this.prisma.payment.findUnique({
            where: {
                orderId,
            },
        });

        if (existingPayment) {
            const paymentIntent =
                await this.stripe.paymentIntents.retrieve(
                    existingPayment.stripePaymentIntentId,
                );

            return {
                paymentId: existingPayment.id,
                clientSecret: paymentIntent.client_secret,
            };
        }

        const paymentIntent = await this.stripe.paymentIntents.create(
            {
                amount: order.totalAmount.mul(100).toDecimalPlaces(0).toNumber(),
                currency: 'brl',
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
                metadata: {
                    orderId: order.id,
                },
            },
            {
                idempotencyKey: `order-payment-${order.id}`,
            },
        );

        let payment;

        try {
            payment = await this.prisma.payment.create({
                data: {
                    orderId: order.id,
                    stripePaymentIntentId: paymentIntent.id,
                    amount: order.totalAmount,
                },
            });
        } catch (error) {
            if (this.isPrismaUniqueConstraintError(error)) {
                const existingPayment = await this.prisma.payment.findUnique({
                    where: {
                        orderId,
                    },
                });

                if (!existingPayment) {
                    throw error;
                }

                const existingPaymentIntent =
                    await this.stripe.paymentIntents.retrieve(
                        existingPayment.stripePaymentIntentId,
                    );

                return {
                    paymentId: existingPayment.id,
                    clientSecret: existingPaymentIntent.client_secret,
                };
            }

            throw error;
        }

        return {
            paymentId: payment.id,
            clientSecret: paymentIntent.client_secret,
        };
    }

    private isPrismaUniqueConstraintError(error: unknown): boolean {
        return (
            error instanceof Prisma.PrismaClientKnownRequestError ||
            (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code?: string }).code === 'P2002')
        );
    }

    async cancelPaymentForOrder(orderId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: {
                orderId,
            },
        });

        // Pedido pode ser cancelado sem nunca ter iniciado pagamento.
        if (!payment) {
            return;
        }

        if (payment.status === PaymentStatus.SUCCEEDED) {
            await this.stripe.refunds.create({
                payment_intent: payment.stripePaymentIntentId,
            });

            return;
        }

        if (payment.status === PaymentStatus.PENDING) {
            await this.stripe.paymentIntents.cancel(
                payment.stripePaymentIntentId,
            );
        }
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

        this.logger.log(`Webhook recebido: ${event.type}`);

        /*
         * Verifica se este evento Stripe já foi processado.
         *
         * O eventId agora fica em uma tabela própria (StripeEvent),
         * permitindo guardar o histórico completo dos eventos.
         */
        const existingEvent = await this.prisma.stripeEvent.findUnique({
            where: {
                eventId: event.id,
            },
        });

        if (existingEvent) {
            return { received: true };
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            this.logger.log(`PaymentIntent: ${paymentIntent.id}`);

            const payment = await this.prisma.payment.findUnique({
                where: {
                    stripePaymentIntentId: paymentIntent.id,
                },
            });

            if (!payment) {
                throw new NotFoundException('Pagamento não encontrado.');
            }

            // Pagamento já finalizado. Não altera novamente o estado.
            if (payment.status === PaymentStatus.SUCCEEDED) {
                return { received: true };
            }

            const order = await this.prisma.order.findFirst({
                where: {
                    id: payment.orderId,
                },
            });

            if (!order) {
                throw new NotFoundException('Pedido não encontrado.');
            }

            const operations: any[] = [
                this.prisma.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: PaymentStatus.SUCCEEDED,
                        stripeEventId: event.id,
                    },
                }),

                this.prisma.stripeEvent.create({
                    data: {
                        eventId: event.id,
                        type: event.type,
                        paymentId: payment.id,
                    },
                }),
            ];

            // Só confirma pedido que ainda está PENDING.
            if (order.status === OrderStatus.PENDING) {
                operations.push(
                    this.prisma.order.update({
                        where: {
                            id: payment.orderId,
                        },
                        data: {
                            status: OrderStatus.CONFIRMED,
                        },
                    }),
                );
            }

            try {
                await this.prisma.$transaction(operations);
            } catch (error) {
                if (this.isPrismaUniqueConstraintError(error)) {
                    return { received: true };
                }

                throw error;
            }
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

            // Não permite estados finais serem alterados.
            if (
                payment.status === PaymentStatus.SUCCEEDED ||
                payment.status === PaymentStatus.FAILED
            ) {
                return { received: true };
            }

            try {
                await this.prisma.$transaction([
                    this.prisma.payment.update({
                        where: {
                            id: payment.id,
                        },
                        data: {
                            status: PaymentStatus.FAILED,
                            stripeEventId: event.id,
                        },
                    }),

                    this.prisma.stripeEvent.create({
                        data: {
                            eventId: event.id,
                            type: event.type,
                            paymentId: payment.id,
                        },
                    }),
                ]);
            } catch (error) {
                if (this.isPrismaUniqueConstraintError(error)) {
                    return { received: true };
                }

                throw error;
            }
        }

        return { received: true };
    }
}
