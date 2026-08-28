import { Test, TestingModule } from '@nestjs/testing';

import { PaymentsController } from './payments.controller';

import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const paymentsServiceMock = {
    handleWebhook: jest.fn(),
    createPayment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve chamar o PaymentsService ao processar o webhook', async () => {
    const request = {
      body: {
        type: 'payment_intent.succeeded',
      },
    };

    paymentsServiceMock.handleWebhook.mockResolvedValue({
      received: true,
    });

    const result = await controller.handleWebhook(request);

    expect(paymentsServiceMock.handleWebhook).toHaveBeenCalledWith(request);
    expect(result).toEqual({
      received: true,
    });
  });

  it('deve criar um pagamento para o pedido do usuário', async () => {
    const orderId = 'order-1';

    const req = {
      user: {
        id: 'user-1',
      },
    };

    paymentsServiceMock.createPayment.mockResolvedValue({
      paymentId: 'payment-1',
      clientSecret: 'client-secret',
    });

    const result = await controller.createPayment(orderId, req);

    expect(paymentsServiceMock.createPayment).toHaveBeenCalledWith(
      orderId,
      'user-1',
    );

    expect(result).toEqual({
      paymentId: 'payment-1',
      clientSecret: 'client-secret',
    });
  });
});