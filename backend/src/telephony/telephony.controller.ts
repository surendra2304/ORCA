import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Request } from 'express';
import { randomBytes } from 'crypto';

@Controller('telephony')
export class TelephonyController {
  constructor(private prisma: PrismaService) {}

  @Get('numbers')
  @UseGuards(WorkspaceGuard)
  async getPhoneNumbers(@CurrentWorkspace() workspaceId: string) {
    return this.prisma.phoneNumber.findMany({
      where: { workspaceId },
      include: {
        agent: {
          select: { id: true, name: true, voiceName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('numbers/connect')
  @UseGuards(WorkspaceGuard)
  async connectNumber(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { agentId: string; phoneE164: string },
  ) {
    if (!body.agentId || !body.phoneE164) throw new BadRequestException('agentId and phoneE164 are required');
    const agent = await this.prisma.agent.findFirst({ where: { id: body.agentId, workspaceId } });
    if (!agent) throw new BadRequestException('Invalid agent ID for this workspace');

    // Generate ephemeral token for Twilio webhook route authentication
    const agentToken = randomBytes(16).toString('hex');

    // Create or update connection
    const connection = await this.prisma.phoneNumber.upsert({
      where: { agentToken },
      update: {
        agentId: body.agentId,
        e164: body.phoneE164,
        status: 'pending',
      },
      create: {
        workspaceId,
        agentId: body.agentId,
        e164: body.phoneE164,
        agentToken,
        status: 'pending',
      },
    });

    return {
      connectionId: connection.id,
      agentToken,
      webhookUrl: `/api/v1/telephony/twilio/incoming/${agentToken}`,
      instructions: `Point your Twilio incoming Voice webhook URL to: /api/v1/telephony/twilio/incoming/${agentToken}`,
    };
  }

  @Post('numbers/verify')
  @UseGuards(WorkspaceGuard)
  async verifyNumber(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { agentToken: string },
  ) {
    if (!body.agentToken) throw new BadRequestException('agentToken is required');
    const connection = await this.prisma.phoneNumber.findFirst({ where: { agentToken: body.agentToken, workspaceId } });
    if (!connection) throw new BadRequestException('Telephony connection not found');

    // Verification check: if it is pending, set it to connected to simulate success
    const updated = await this.prisma.phoneNumber.update({
      where: { id: connection.id },
      data: { status: 'connected', connectedAt: new Date() },
    });

    return {
      status: updated.status,
      connectedAt: updated.connectedAt,
    };
  }

  @Get('calls')
  @UseGuards(WorkspaceGuard)
  async getCalls(@CurrentWorkspace() workspaceId: string) {
    const calls = await this.prisma.call.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    const callSids = calls.map(c => c.callSid).filter(Boolean);
    const convos = await this.prisma.conversation.findMany({ where: { workspaceId, callSid: { in: callSids } }, select: { callSid: true, score: true, captured: true } });
    const convoMap = new Map(convos.map(c => [c.callSid, c]));

    return calls.map(call => {
      const c = convoMap.get(call.callSid);
      const url = call.recordingUrl;
      const recordingUrl = url ? (url.includes('media.vobiz.ai') ? `/api/v1/vobiz/recording/media/${encodeURIComponent(call.callSid)}` : url) : null;
      return { ...call, recordingUrl, score: c?.score || null, captured: c?.captured || false };
    });
  }

  @Get('calls/:callSid/conversation')
  @UseGuards(WorkspaceGuard)
  async getCallConversation(@CurrentWorkspace() workspaceId: string, @Param('callSid') callSid: string) {
    const convo = await this.prisma.conversation.findFirst({ where: { callSid, workspaceId }, include: { messages: { orderBy: { createdAt: 'asc' } }, leads: { take: 1 } } });
    if (!convo) return null;
    return { id: convo.id, captured: convo.captured, score: convo.score, messages: convo.messages, lead: convo.leads[0] || null };
  }

  @Post('twilio/incoming/:agentToken')
  @Public()
  @Header('Content-Type', 'text/xml')
  @HttpCode(HttpStatus.OK)
  async handleIncomingCall(
    @Param('agentToken') agentToken: string,
    @Req() req: any,
  ) {
    const connection = await this.prisma.phoneNumber.findFirst({
      where: { agentToken },
    });

    if (!connection) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Invalid voice token configuration. Goodbye.</Say>
  <Reject />
</Response>`;
    }

    // Determine host & protocol for Twilio WebSocket Stream pointing back to MediaBridgeGateway
    const host = req.headers.host || 'localhost:3005';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const protocol = isSecure ? 'wss' : 'ws';
    
    // Construct local or public stream url (port 3005 is standard dev NestJS server)
    const streamUrl = `${protocol}://${host}/telephony/twilio/incoming/${agentToken}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you to our AI receptionist.</Say>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;
  }
}
