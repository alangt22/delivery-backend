import {
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('webhook')
  @ApiOperation({
    summary: 'Receber webhook do Stripe',
    description:
      'Recebe e processa eventos enviados pelo Stripe relacionados aos pagamentos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Webhook inválido ou assinatura ausente/inválida.',
  })
  async handleWebhook(@Req() req: any) {
    return this.paymentsService.handleWebhook(req);
  }

  @Post(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Criar pagamento de um pedido',
    description:
      'Cria um PaymentIntent no Stripe para o pedido informado. Se já existir um pagamento para o pedido, o pagamento existente pode ser reutilizado.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID do pedido que será pago',
    example: 'order-123',
  })
  @ApiResponse({
    status: 201,
    description: 'Pagamento criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Não foi possível criar o pagamento.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pedido não encontrado ou não pertence ao usuário.',
  })
  async createPayment(
    @Param('orderId') orderId: string,
    @Req() req,
  ) {
    return this.paymentsService.createPayment(
      orderId,
      req.user.id,
    );
  }
}