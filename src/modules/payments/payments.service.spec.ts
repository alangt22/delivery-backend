import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
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
      stripeEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
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
    const order = { id: 'order-1', totalAmount: new Prisma.Decimal(42), status: OrderStatus.PENDING };
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

  it('deve permitir uma nova tentativa quando o pagamento anterior falhou', async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      customerId: 'customer-1',
      totalAmount: new Prisma.Decimal(49.9),
      status: OrderStatus.PENDING,
    });

    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      stripePaymentIntentId: 'pi-123',
      amount: 49.9,
      status: PaymentStatus.FAILED,
    });

    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi-123',
      client_secret: 'secret-123',
    });

    const result = await service.createPayment(
      'order-1',
      'customer-1',
    );

    expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith(
      'pi-123',
    );

    expect(result).toEqual({
      paymentId: 'payment-1',
      clientSecret: 'secret-123',
    });

    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('deve criar PaymentIntent e persistir o pagamento para um novo pedido', async () => {
    const order = {
      id: 'order-1',
      totalAmount: new Prisma.Decimal(42),
      status: OrderStatus.PENDING,
    };

    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.payment.findUnique.mockResolvedValue(null);
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_new',
      client_secret: 'cs_new',
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'payment-1' });

    const result = await service.createPayment('order-1', 'customer-1');

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      {
        amount: order.totalAmount.mul(100).toDecimalPlaces(0).toNumber(),
        currency: 'brl',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          orderId: 'order-1',
        },
      },
      {
        idempotencyKey: 'order-payment-order-1',
      },
    );
    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        stripePaymentIntentId: 'pi_new',
        amount: new Prisma.Decimal(42),
      },
    });
    expect(result).toEqual({
      paymentId: 'payment-1',
      clientSecret: 'cs_new',
    });
  });

  it('deve converter valores decimais para centavos com precisão', async () => {
    const order = { id: 'order-1', totalAmount: new Prisma.Decimal(19.995), status: OrderStatus.PENDING };

    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.payment.findUnique.mockResolvedValue(null);
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_decimal',
      client_secret: 'cs_decimal',
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'payment-1' });

    await service.createPayment('order-1', 'customer-1');

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: Math.round(19.995 * 100)
      }),
      {
        idempotencyKey: 'order-payment-order-1',
      }
    );
  });

  it('deve propagar erro do Stripe sem persistir pagamento', async () => {
    const stripeError = new Error('Stripe indisponível');

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      totalAmount: new Prisma.Decimal(42),
      status: OrderStatus.PENDING,
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
      data: {
        object: {
          id: 'pi_succeeded',
        },
      },
    };

    const payment = {
      id: 'payment-1',
      orderId: 'order-1',
      stripeEventId: null,
      status: PaymentStatus.PENDING,
    };

    const order = {
      id: 'order-1',
      status: OrderStatus.PENDING,
    };

    const paymentUpdate = Promise.resolve({
      id: 'payment-1',
    });

    const stripeEventCreate = Promise.resolve({
      id: 'stripe-event-1',
    });

    const orderUpdate = Promise.resolve({
      id: 'order-1',
    });

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.stripeEvent.findUnique.mockResolvedValue(null);

    prismaMock.payment.findUnique.mockResolvedValue(payment);

    prismaMock.order.findFirst.mockResolvedValue(order);

    prismaMock.payment.update.mockReturnValue(paymentUpdate);

    prismaMock.stripeEvent.create.mockReturnValue(stripeEventCreate);

    prismaMock.order.update.mockReturnValue(orderUpdate);

    prismaMock.$transaction.mockResolvedValue([]);

    const result = await service.handleWebhook({
      headers: {
        'stripe-signature': 'signature-value',
      },
      rawBody,
    });

    expect(prismaMock.stripeEvent.findUnique).toHaveBeenCalledWith({
      where: {
        eventId: 'evt_succeeded',
      },
    });

    expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
      where: {
        stripePaymentIntentId: 'pi_succeeded',
      },
    });

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
    });

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: {
        id: 'payment-1',
      },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripeEventId: 'evt_succeeded',
      },
    });

    expect(prismaMock.stripeEvent.create).toHaveBeenCalledWith({
      data: {
        eventId: 'evt_succeeded',
        type: 'payment_intent.succeeded',
        paymentId: 'payment-1',
      },
    });

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: OrderStatus.CONFIRMED,
      },
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      paymentUpdate,
      stripeEventCreate,
      orderUpdate,
    ]);

    expect(result).toEqual({
      received: true,
    });
  });

  it('deve marcar pagamento como falho para payment_intent.payment_failed', async () => {
    const event = {
      id: 'evt_failed',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_failed',
        },
      },
    };

    const payment = {
      id: 'payment-1',
      orderId: 'order-1',
      stripeEventId: null,
      status: PaymentStatus.PENDING,
    };

    const paymentUpdate = Promise.resolve({
      id: 'payment-1',
    });

    const stripeEventCreate = Promise.resolve({
      id: 'stripe-event-1',
    });

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.stripeEvent.findUnique.mockResolvedValue(null);

    prismaMock.payment.findUnique.mockResolvedValue(payment);

    prismaMock.payment.update.mockReturnValue(paymentUpdate);

    prismaMock.stripeEvent.create.mockReturnValue(stripeEventCreate);

    prismaMock.$transaction.mockResolvedValue([]);

    const result = await service.handleWebhook({
      headers: {
        'stripe-signature': 'signature-value',
      },
      rawBody: Buffer.from('failed-event'),
    });

    expect(prismaMock.stripeEvent.findUnique).toHaveBeenCalledWith({
      where: {
        eventId: 'evt_failed',
      },
    });

    expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
      where: {
        stripePaymentIntentId: 'pi_failed',
      },
    });

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: {
        id: 'payment-1',
      },
      data: {
        status: PaymentStatus.FAILED,
        stripeEventId: 'evt_failed',
      },
    });

    expect(prismaMock.stripeEvent.create).toHaveBeenCalledWith({
      data: {
        eventId: 'evt_failed',
        type: 'payment_intent.payment_failed',
        paymentId: 'payment-1',
      },
    });

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      paymentUpdate,
      stripeEventCreate,
    ]);

    expect(result).toEqual({
      received: true,
    });
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

  it('deve ignorar evento já processado pelo StripeEvent', async () => {
    const event = {
      id: 'evt_processed',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_processed',
        },
      },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.stripeEvent.findUnique.mockResolvedValue({
      id: 'stripe-event-1',
      eventId: 'evt_processed',
      type: 'payment_intent.succeeded',
      paymentId: 'payment-1',
    });

    const result = await service.handleWebhook({
      headers: {
        'stripe-signature': 'signature-value',
      },
      rawBody: Buffer.from('processed-event'),
    });

    expect(prismaMock.stripeEvent.findUnique).toHaveBeenCalledWith({
      where: {
        eventId: 'evt_processed',
      },
    });

    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.stripeEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(result).toEqual({
      received: true,
    });
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

  it('não deve confirmar pedido CANCELLED após payment_intent.succeeded', async () => {
    const event = {
      id: 'evt_cancelled_order',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_cancelled_order' } },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
      stripeEventId: null,
    });

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.CANCELLED,
    });

    prismaMock.payment.update.mockResolvedValue({
      id: 'payment-1',
    });

    const paymentUpdate = Promise.resolve({
      id: 'payment-1',
    });

    prismaMock.payment.update.mockReturnValue(paymentUpdate);

    prismaMock.$transaction.mockResolvedValue([]);

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('cancelled-order-event'),
    });

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripeEventId: 'evt_cancelled_order',
      },
    });

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      paymentUpdate,
    ]);

    expect(result).toEqual({ received: true });
  });

  it('não deve permitir SUCCEEDED voltar para FAILED', async () => {
    const event = {
      id: 'evt_failed_after_success',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_success' } },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.SUCCEEDED,
      stripeEventId: 'evt_succeeded',
    });

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('failed-after-success'),
    });

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(result).toEqual({ received: true });
  });

  it('deve permitir FAILED -> SUCCEEDED e confirmar pedido PENDING', async () => {
    const event = {
      id: 'evt_success_after_failure',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_retry_success' } },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.FAILED,
      stripeEventId: 'evt_failed',
    });

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    const paymentUpdate = Promise.resolve({ id: 'payment-1' });
    const stripeEventCreate = Promise.resolve({ id: 'stripe-event-1' });
    const orderUpdate = Promise.resolve({ id: 'order-1' });

    prismaMock.payment.update.mockReturnValue(paymentUpdate);
    prismaMock.stripeEvent.create.mockReturnValue(stripeEventCreate);
    prismaMock.order.update.mockReturnValue(orderUpdate);

    prismaMock.$transaction.mockResolvedValue([]);

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('success-after-failure'),
    });

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripeEventId: 'evt_success_after_failure',
      },
    });

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: OrderStatus.CONFIRMED,
      },
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      paymentUpdate,
      stripeEventCreate,
      orderUpdate,
    ]);

    expect(result).toEqual({ received: true });
  });

  it('não deve processar novo evento succeeded para pagamento já SUCCEEDED', async () => {
    const event = {
      id: 'evt_new_success',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_already_success' } },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.SUCCEEDED,
      stripeEventId: 'evt_old_success',
    });

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('new-success-event'),
    });

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(result).toEqual({ received: true });
  });

  it('não deve processar novo evento failed para pagamento já FAILED', async () => {
    const event = {
      id: 'evt_new_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_already_failed' } },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.FAILED,
      stripeEventId: 'evt_old_failed',
    });

    const result = await service.handleWebhook({
      headers: { 'stripe-signature': 'signature-value' },
      rawBody: Buffer.from('new-failed-event'),
    });

    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(result).toEqual({ received: true });
  });

  it('deve impedir pagamento de um pedido que não está PENDING', async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      customerId: 'customer-1',
      totalAmount: new Prisma.Decimal(42),
      status: OrderStatus.CONFIRMED,
    });

    await expect(
      service.createPayment(
        'order-1',
        'customer-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it('deve ignorar evento succeeded já registrado em StripeEvent', async () => {
    const event = {
      id: 'evt_duplicate',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_duplicate',
        },
      },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.stripeEvent.findUnique.mockResolvedValue({
      id: 'stripe-event-1',
      eventId: 'evt_duplicate',
      type: 'payment_intent.succeeded',
      paymentId: 'payment-1',
    });

    const result = await service.handleWebhook({
      headers: {
        'stripe-signature': 'signature-value',
      },
      rawBody: Buffer.from('duplicate-event'),
    });

    expect(prismaMock.stripeEvent.findUnique).toHaveBeenCalledWith({
      where: {
        eventId: 'evt_duplicate',
      },
    });

    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.stripeEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(result).toEqual({
      received: true,
    });
  });

  it('deve ignorar evento failed já registrado em StripeEvent', async () => {
    const event = {
      id: 'evt_duplicate_failed',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_duplicate_failed',
        },
      },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.stripeEvent.findUnique.mockResolvedValue({
      id: 'stripe-event-2',
      eventId: 'evt_duplicate_failed',
      type: 'payment_intent.payment_failed',
      paymentId: 'payment-1',
    });

    const result = await service.handleWebhook({
      headers: {
        'stripe-signature': 'signature-value',
      },
      rawBody: Buffer.from('duplicate-failed-event'),
    });

    expect(prismaMock.stripeEvent.findUnique).toHaveBeenCalledWith({
      where: {
        eventId: 'evt_duplicate_failed',
      },
    });

    expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.stripeEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    expect(result).toEqual({
      received: true,
    });
  });

  it('deve impedir processamento duplicado quando o mesmo evento chega simultaneamente', async () => {
    const event = {
      id: 'evt_concurrent',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_concurrent',
        },
      },
    };

    const payment = {
      id: 'payment-1',
      orderId: 'order-1',
      stripeEventId: null,
      status: PaymentStatus.PENDING,
    };

    const order = {
      id: 'order-1',
      status: OrderStatus.PENDING,
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.stripeEvent.findUnique.mockResolvedValue(null);

    prismaMock.payment.findUnique.mockResolvedValue(payment);

    prismaMock.order.findFirst.mockResolvedValue(order);

    prismaMock.payment.update.mockReturnValue(
      Promise.resolve({ id: 'payment-1' }),
    );

    prismaMock.order.update.mockReturnValue(
      Promise.resolve({ id: 'order-1' }),
    );

    let stripeEventCreateCalls = 0;

    prismaMock.stripeEvent.create.mockImplementation(async () => {
      stripeEventCreateCalls++;

      if (stripeEventCreateCalls === 1) {
        return {
          id: 'stripe-event-1',
          eventId: event.id,
        };
      }

      throw {
        code: 'P2002',
        meta: {
          target: ['eventId'],
        },
      };
    });

    prismaMock.$transaction.mockImplementation(
      async (operations: unknown[]) => {
        return Promise.all(operations as Promise<unknown>[]);
      },
    );

    const request = {
      headers: {
        'stripe-signature': 'signature-value',
      },
      rawBody: Buffer.from('concurrent-event'),
    };

    const [result1, result2] = await Promise.all([
      service.handleWebhook(request),
      service.handleWebhook(request),
    ]);

    expect(result1).toEqual({ received: true });
    expect(result2).toEqual({ received: true });

    expect(prismaMock.stripeEvent.create).toHaveBeenCalledTimes(2);
  });

  it('deve aceitar P2002 ao registrar StripeEvent como evento já processado', async () => {
    const event = {
      id: 'evt_unique_conflict',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_unique_conflict',
        },
      },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    prismaMock.stripeEvent.findUnique.mockResolvedValue(null);

    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      stripeEventId: null,
      status: PaymentStatus.PENDING,
    });

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    const prismaUniqueError = {
      code: 'P2002',
      meta: {
        target: ['eventId'],
      },
    };

    prismaMock.payment.update.mockReturnValue(
      Promise.resolve({ id: 'payment-1' }),
    );

    prismaMock.order.update.mockReturnValue(
      Promise.resolve({ id: 'order-1' }),
    );

    prismaMock.stripeEvent.create.mockRejectedValue(prismaUniqueError);

    prismaMock.$transaction.mockImplementation(async (operations) => {
      return Promise.all(operations);
    });

    await expect(
      service.handleWebhook({
        headers: {
          'stripe-signature': 'signature-value',
        },
        rawBody: Buffer.from('unique-conflict-event'),
      }),
    ).resolves.toEqual({
      received: true,
    });
  });
});
