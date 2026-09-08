import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VobizService {
  private readonly logger = new Logger(VobizService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolvePublicHost(providedHost: string): Promise<string> {
    if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/^https?:\/\//, '');
    if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/^https?:\/\//, '');
    if (process.env.NGROK_URL) return process.env.NGROK_URL.replace(/^https?:\/\//, '');
    const ngrokEndpoints = ['http://127.0.0.1:4040/api/tunnels', 'http://localhost:4040/api/tunnels', 'http://127.0.0.1:4041/api/tunnels'];
    for (const endpoint of ngrokEndpoints) {
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json() as any;
          const tunnel = data.tunnels?.find((t: any) => t.proto === 'https' || t.public_url?.startsWith('https'));
          if (tunnel?.public_url) {
            this.logger.log(`Auto-detected public ngrok tunnel from ${endpoint}: ${tunnel.public_url}`);
            return tunnel.public_url.replace(/^https?:\/\//, '');
          }
        }
      } catch {}
    }

    const allowedHosts = (process.env.ALLOWED_HOSTS || 'localhost:3005,127.0.0.1:3005').split(',');
    if (providedHost && allowedHosts.includes(providedHost)) {
      return providedHost;
    }
    
    return providedHost || 'localhost:3005';
  }

  async generateIncomingVXML(callData: any, host: string, q: any = {}): Promise<string> {
    const from = callData?.from || callData?.caller_id || callData?.From || callData?.CallerName || 'Unknown';
    const callSid = callData?.call_sid || callData?.CallSid || callData?.CallUUID || callData?.id || '';
    const direction = q.direction || 'inbound';
    const leadId = q.leadId || '';
    const leadName = q.leadName || '';
    const campaignId = q.campaignId || '';
    const customPrompt = q.customPrompt || '';
    const workspaceId = q.workspaceId || '';
    const agentId = q.agentId || '';

    this.logger.log(`Handling ${direction} call from ${from} (SID: ${callSid})`);
    
    const pHost = await this.resolvePublicHost(host);
    const isLocal = pHost.includes('localhost');
    const wsUrl = `${isLocal ? 'ws' : 'wss'}://${pHost}/vobiz-stream`;

    if (callSid && workspaceId && agentId) {
      try {
        const cData = {
          fromNumber: from,
          status: 'in-progress',
          direction,
          ...(leadId && { leadId }),
          ...(campaignId && { campaignId }),
          ...(customPrompt && { customContext: { prompt: customPrompt } })
        };
        
        await this.prisma.call.upsert({
          where: { callSid },
          create: { workspaceId, agentId, callSid, durationSec: 0, interruptions: 0, ...cData },
          update: cData
        });

        const conversation = await this.prisma.conversation.findFirst({
          where: { callSid, workspaceId }
        });

        if (!conversation) {
          await this.prisma.conversation.create({
            data: {
              workspaceId,
              agentId,
              channel: 'phone',
              callSid,
              visitorLabel: leadName || (direction === 'outbound' ? 'Lead' : from),
              durationSec: 0,
              startedAt: new Date(),
              score: 'Warm'
            }
          });
        }
      } catch (e: any) {
        this.logger.warn(`Could not log call ${callSid}: ${e.message}`);
      }
    }

    const params = new URLSearchParams({
      workspaceId,
      agentId,
      callSid,
      direction,
      leadId,
      leadName,
      campaignId,
      customPrompt
    }).toString();

    const secret = process.env.JWT_ACCESS_SECRET || 'default_secret';
    const signature = require('crypto').createHmac('sha256', secret).update(params).digest('hex');
    
    const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c: string) => (({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' } as Record<string, string>)[c] || c));
    
    const wsUrlWithParams = escapeXml(`${wsUrl}?${params}&signature=${signature}`);
    const protocol = isLocal ? 'http' : 'https';
    const recordingCallbackUrl = escapeXml(`${protocol}://${pHost}/api/v1/vobiz/recording?${params}&signature=${signature}`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record action="${recordingCallbackUrl}" callbackUrl="${recordingCallbackUrl}" method="POST" callbackMethod="POST" recordSession="true" redirect="false" maxLength="3600" fileFormat="wav" />
  <Stream bidirectional="true" keepCallAlive="true">${wsUrlWithParams}</Stream>
</Response>`;
  }

  async initiateOutboundCall(payload: {
    agentId: string;
    workspaceId: string;
    to: string;
    from: string;
    host: string;
    direction?: string;
    leadId?: string;
    leadName?: string;
    campaignId?: string;
    customPrompt?: string;
  }) {
    this.logger.log(`Initiating outbound call from ${payload.from} to ${payload.to}...`);
    
    const authId = process.env.VOBIZ_AUTH_ID;
    const authToken = process.env.VOBIZ_AUTH_TOKEN;
    if (!authId || !authToken) {
      throw new HttpException('Vobiz authentication not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const publicHost = await this.resolvePublicHost(payload.host);
    const protocol = publicHost.includes('localhost') ? 'http' : 'https';
    
    const query = new URLSearchParams({
      agentId: payload.agentId,
      workspaceId: payload.workspaceId,
      direction: 'outbound',
      ...(payload.leadId && { leadId: payload.leadId }),
      ...(payload.leadName && { leadName: payload.leadName }),
      ...(payload.campaignId && { campaignId: payload.campaignId }),
      ...(payload.customPrompt && { customPrompt: payload.customPrompt })
    }).toString();
    
    const webhookUrl = `${protocol}://${publicHost}/api/v1/vobiz/incoming?${query}`;
    const statusWebhookUrl = `${protocol}://${publicHost}/api/v1/vobiz/status?${query}`;
    
    try {
      const res = await fetch(`https://api.vobiz.ai/api/v1/Account/${authId}/Call/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-ID': authId,
          'X-Auth-Token': authToken
        },
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          answer_url: webhookUrl,
          answer_method: 'POST',
          hangup_url: statusWebhookUrl,
          hangup_method: 'POST'
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Vobiz outbound call failed: ${res.status} - ${errorText}`);
        throw new HttpException(errorText, HttpStatus.BAD_REQUEST);
      }

      const data = await res.json();
      if (data.error) {
        this.logger.error(`Vobiz outbound call API error: ${data.error}`);
        throw new HttpException(data.error, HttpStatus.BAD_REQUEST);
      }

      const callSid = data.call_sid || data.id || data.request_uuid || data.api_id;
      
      if (callSid) {
        await this.prisma.call.create({
          data: {
            workspaceId: payload.workspaceId,
            agentId: payload.agentId,
            callSid,
            fromNumber: payload.from,
            direction: 'outbound',
            status: 'in-progress',
            durationSec: 0,
            interruptions: 0,
            ...(payload.leadId && { leadId: payload.leadId }),
            ...(payload.campaignId && { campaignId: payload.campaignId }),
            ...(payload.customPrompt && { customContext: { prompt: payload.customPrompt } })
          }
        });
      }
      return data;
    } catch (e) {
      this.logger.error('Error initiating outbound call:', e);
      throw e;
    }
  }

  /**
   * Handles webhook status updates (e.g. call completed, busy, no-answer).
   */
  async handleCallStatus(payload: any) {
    const callSid = payload.call_sid || payload.CallSid || payload.CallUUID || payload.id;
    const callStatus = payload.status || payload.CallStatus || payload.event;
    const duration = parseInt(payload.duration || payload.CallDuration || payload.Duration || payload.BillDuration || '0', 10);
    const recordingUrl =
      payload.recording_url ||
      payload.RecordingUrl ||
      payload.RecordingURL ||
      payload.RecordFile ||
      payload.RecordUrl;
    const fromNumber = payload.from || payload.From || payload.CallerName;
    
    if (!callSid) return { success: false, reason: 'No CallSid' };

    const validStatuses = ['queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'];
    let safeStatus = 'unknown';
    if (callStatus && validStatuses.includes(callStatus.toLowerCase())) {
      safeStatus = callStatus.toLowerCase();
    }

    this.logger.log(`Received call status update: ${callSid} -> ${safeStatus} (Duration: ${duration}s)`);

    try {
      await this.prisma.call.updateMany({
        where: { callSid },
        data: {
          status: safeStatus,
          durationSec: duration,
          disposition: safeStatus,
          ...(fromNumber && { fromNumber }),
          outcome: safeStatus,
        },
      });

      // Also update duration in conversation if it exists
      await this.prisma.conversation.updateMany({
        where: { callSid },
        data: { durationSec: duration },
      });

      return { success: true };
    } catch (e: any) {
      this.logger.warn(`Failed to update call status for SID ${callSid}: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  async handleCallRecording(payload: any) {
    const callSid = payload.callSid || payload.call_sid || payload.CallSid || payload.CallUUID || payload.id || payload.RecordingID;
    const recordingUrl = payload.RecordFile || payload.RecordUrl || payload.recording_url || payload.RecordingUrl || payload.RecordingURL;
    const duration = parseInt(payload.RecordingDuration || payload.duration || payload.CallDuration || payload.Duration || '0', 10);
    
    if (!callSid && !recordingUrl) {
      return { success: false, reason: 'No CallSid or RecordingUrl' };
    }

    this.logger.log(`Recording completed for CallSid: ${callSid}, URL: ${recordingUrl}, Duration: ${duration}s`);
    
    try {
      if (callSid && recordingUrl) {
        await this.prisma.call.updateMany({
          where: { callSid },
          data: {
            recordingUrl,
            ...(duration > 0 ? { durationSec: duration } : {})
          }
        });
      }
      return { success: true, recordingUrl };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Proxies and streams Vobiz recording media with required authentication headers.
   */
  async streamRecordingMedia(callSid: string, workspaceId: string, res: any, req: any) {
    const call = await this.prisma.call.findFirst({
      where: {
        workspaceId,
        OR: [{ callSid }, { id: callSid }],
      },
      select: { recordingUrl: true, callSid: true },
    });

    if (!call || !call.recordingUrl) {
      return res.status(404).json({ error: 'Recording not found for this call' });
    }

    const authId = process.env.VOBIZ_AUTH_ID;
    const authToken = process.env.VOBIZ_AUTH_TOKEN;

    try {
      let recordingUrlObj: URL;
      try {
        recordingUrlObj = new URL(call.recordingUrl);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid recording URL format' });
      }

      if (!recordingUrlObj.hostname.endsWith('vobiz.ai')) {
        return res.status(403).json({ error: 'Untrusted recording URL host' });
      }

      const headers: any = {
        'X-Auth-ID': authId || '',
        'X-Auth-Token': authToken || '',
      };
      
      const rangeHeader = req.headers['range'];
      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }

      const response = await fetch(call.recordingUrl, {
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        this.logger.error(`Vobiz media proxy failed: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: 'Failed to fetch recording from provider' });
      }

      const contentType = response.headers.get('content-type') || 'audio/wav';
      const contentLength = response.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="call_${call.callSid}.wav"`);

      if (!response.body) {
        return res.status(500).json({ error: 'No media body returned from provider' });
      }

      const { Readable } = require('stream');
      const readableStream = Readable.fromWeb(response.body as any);
      readableStream.pipe(res);
      return;
    } catch (e: any) {
      this.logger.error(`Error proxying recording media for SID ${callSid}: ${e.message}`);
      return res.status(500).json({ error: e.message });
    }
  }
}
