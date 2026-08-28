import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaMock: any;
  let stripeMock: any;
  const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const originalStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_payments_service';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_payments_service';

    prismaMock = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    stripeMock = {
      paymentIntents: {
        retrieve: jest.fn(),
        create: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    (service as any).stripe = stripeMock;
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalStripeSecretKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
    }

    if (originalStripeWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalStripeWebhookSecret;
    }
  });

  it('deve lançar NotFoundException quando o pedido não existe sem chamar o Stripe', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(
      service.createPayment('order-1', 'customer-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('deve reutilizar o PaymentIntent quando já existe pagamento para o pedido', async () => {
    const order = { id: 'order-1', totalAmount: 42 };
    const existingPayment = {
      id: 'payment-1',
      stripePaymentIntentId: 'pi_existing',
    };

    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.payment.findUnique.mockResolvedValue(existingPayment);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      client_secret: 'cs_existing',
    });

    const result = await service.createPayment('order-1', 'customer-1');

    expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith(
      'pi_existing',
    );
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      paymentId: 'payment-1',
      clientSecret: 'cs_existing',
    });
  });

  it('deve criar PaymentIntent e persistir o pagamento para um novo pedido', async () => {
    const order = { id: 'order-1', totalAmount: 42 };

    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.payment.findUnique.mockResolvedValue(null);
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_new',
      client_secret: 'cs_new',
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'payment-1' });

    const result = await service.createPayment('order-1', 'customer-1');

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
      amount: Math.round(order.totalAmount * 100),
      currency: 'brl',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: { orderId: 'order-1' },
    });
    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        stripePaymentIntentId: 'pi_new',
        amount: 42,
      },
    });
    expect(result).toEqual({
      paymentId: 'payment-1',
      clientSecret: 'cs_new',
    });
  });

  it('deve converter valores decimais para centavos com Math.round', async () => {
    const order = { id: 'order-1', totalAmount: 19.995 };

    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.payment.findUnique.mockResolvedValue(null);
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_decimal',
      client_secret: 'cs_decimal',
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'payment-1' });

    await service.createPayment('order-1', 'customer-1');

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: Math.round(19.995 * 100) }),
    );
  });

  it('deve propagar erro do Stripe sem persistir pagamento', async () => {
    const stripeError = new Error('Stripe indisponível');

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      totalAmount: 42,
    });
    prismaMock.payment.findUnique.mockResolvedValue(null);
    stripeMock.paymentIntents.create.mockRejectedValue(stripeError);

    await expect(
      service.createPayment('order-1', 'customer-1'),
    ).rejects.toBe(stripeError);

    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequestException sem stripe-signature', async () => {
    await expect(
      service.handleWebhook({ headers: {}, rawBody: Buffer.from('raw-body') }),
    ).rejects.toThrow(BadRequestException);

    expect(stripeMock.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it('deve confirmar pedido e pagamento para payment_intent.succeeded em transação', async () => {
    const rawBody = Buffer.from('succeeded-event');
    const event = {
      id: 'evt_succeeded',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_succeeded' } },
    };
    const payment = { id: 'payment-1', orderId: 'order-1', stripeEventId: null };
    const paymentUpdate = Promise.resolve({ id: 'payment-1' });
    const orderUpdate = Promise.resolve({ id: 'order-1' });

    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    prismaMock.payment.findUnique.mockResolvedValue(payment);
    prismaMock.payment.update.mockReturnValue(paymentUpdate);
    prismaMock.order.update.mockReturnValue(orderUpdate);
    prismaMock.$transaction.mockResolvedValue([]);

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody,
    });

    expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(
      rawBody,
      'signature-value',
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: 'pi_succeeded' },
    });
    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripeEventId: 'evt_succeeded',
      },
    });
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CONFIRMED' },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      paymentUpdate,
      orderUpdate,
    ]);
    expect(result).toEqual({ received: true });
  });

  it('deve marcar pagamento como falho para payment_intent.payment_failed', async () => {
    const event = {
      id: 'evt_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_failed' } },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      stripeEventId: null,
    });
    prismaMock.payment.update.mockResolvedValue({ id: 'payment-1' });

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('failed-event'),
    });

    expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: 'pi_failed' },
    });
    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: PaymentStatus.FAILED,
        stripeEventId: 'evt_failed',
      },
    });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });

  it.each([
    ['payment_intent.succeeded', 'pi_succeeded'],
    ['payment_intent.payment_failed', 'pi_failed'],
  ])(
    'deve lançar NotFoundException quando não encontra Payment para %s',
    async (type, paymentIntentId) => {
      stripeMock.webhooks.constructEvent.mockReturnValue({
        id: 'evt_missing_payment',
        type,
        data: { object: { id: paymentIntentId } },
      });
      prismaMock.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleWebhook({
          headers: { 'stripe-signature': 'signature-value' },
          rawBody: Buffer.from('missing-payment-event'),
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.payment.update).not.toHaveBeenCalled();
      expect(prismaMock.order.update).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    },
  );

  it('deve ignorar evento de sucesso já processado', async () => {
    const event = {
      id: 'evt_processed',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_processed' } },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      stripeEventId: 'evt_processed',
    });

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('processed-event'),
    });

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });

  it('deve aceitar evento Stripe não tratado sem atualizar Payment ou Order', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_unhandled',
      type: 'charge.refunded',
      data: { object: { id: 'ch_1' } },
    });

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('unhandled-event'),
    });

    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });
});
