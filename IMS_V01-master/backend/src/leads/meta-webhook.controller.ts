import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Post, Query, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MetaLeadsService } from './meta-leads.service';

/**
 * Public endpoints called by Meta. Protected by the verify token (GET)
 * and the X-Hub-Signature-256 HMAC (POST) instead of a login.
 *
 * Callback URL to enter in Meta:  https://<your-backend-domain>/webhooks/meta
 */
@Controller('webhooks/meta')
export class MetaWebhookController {
  constructor(private readonly meta: MetaLeadsService) {}

  @Public()
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const result = this.meta.verifySubscription(mode, token, challenge);
    if (result === null) throw new ForbiddenException('Verification token mismatch.');
    return result;
  }

  @Public()
  @Post()
  @HttpCode(200)
  async receive(@Req() req: any, @Headers('x-hub-signature-256') signature: string, @Body() body: any) {
    if (!this.meta.verifySignature(req.rawBody, signature)) {
      throw new ForbiddenException('Invalid signature.');
    }
    return this.meta.handleWebhook(body);
  }
}
