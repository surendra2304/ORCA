import { Controller, Post, Get, Body, Req, Res, Headers, UnauthorizedException, Param, UseGuards, Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { VobizService } from './vobiz.service';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';

@Injectable()
export class VobizWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest(), sig = req.headers['x-webhook-signature'], sec = process.env.VOBIZ_WEBHOOK_SECRET;
    if (!sec) return true;
    if (!sig) return false;
    try {
      const s = Buffer.from(sec), p = Buffer.from(sig);
      return s.length === p.length && crypto.timingSafeEqual(s, p);
    } catch { return false; }
  }
}

function getTrustedHost(h: string): string {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/^https?:\/\//, '');
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/^https?:\/\//, '');
  return ['localhost:3005', '127.0.0.1:3005'].includes(h) ? h : 'localhost:3005';
}

@Controller('vobiz')
export class VobizController {
  constructor(private readonly vobizService: VobizService) {}

  @Public() @UseGuards(VobizWebhookGuard) @Post('incoming')
  async handleIncomingCallPost(@Body() body: any, @Req() req: Request, @Res() res: Response) { return this._handleIncomingCall(body, req, res); }

  @Public() @UseGuards(VobizWebhookGuard) @Get('incoming')
  async handleIncomingCallGet(@Req() req: Request, @Res() res: Response) { return this._handleIncomingCall(req.query, req, res); }

  private async _handleIncomingCall(data: any, req: Request, res: Response) {
    const vxml = await this.vobizService.generateIncomingVXML(data, getTrustedHost(req.headers.host || ''), req.query);
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(vxml);
  }

  @Public() @UseGuards(VobizWebhookGuard) @Post('status')
  async handleCallStatusPost(@Body() body: any) { return this.vobizService.handleCallStatus(body); }

  @Public() @UseGuards(VobizWebhookGuard) @Get('status')
  async handleCallStatusGet(@Req() req: Request) { return this.vobizService.handleCallStatus(req.query); }

  @Public() @UseGuards(VobizWebhookGuard) @Post('recording')
  async handleCallRecordingPost(@Body() body: any, @Req() req: Request) { return this.vobizService.handleCallRecording({ ...body, ...req.query }); }

  @Public() @UseGuards(VobizWebhookGuard) @Get('recording')
  async handleCallRecordingGet(@Req() req: Request) { return this.vobizService.handleCallRecording(req.query); }

  @Get('recording/media/:callSid') @UseGuards(WorkspaceGuard)
  async streamRecordingMedia(@Param('callSid') callSid: string, @CurrentWorkspace() workspaceId: string, @Res() res: Response, @Req() req: Request) {
    return this.vobizService.streamRecordingMedia(callSid, workspaceId, res, req);
  }
}
