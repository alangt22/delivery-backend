import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) { }


  @Post('webhook')
  async handleWebhook(@Req() req: any) {
    return this.paymentsService.handleWebhook(req);
  }


  @Post(':orderId')
  @UseGuards(JwtAuthGuard)
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