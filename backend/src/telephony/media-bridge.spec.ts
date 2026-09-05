import { Test, TestingModule } from '@nestjs/testing';
import { TelephonyController } from './telephony.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AppCacheService } from '../common/cache/cache.service';
import { mulawToPcm16, pcm24ToMulaw, pcm16ToMulaw } from './media-bridge.gateway';

describe('MediaBridge Telephony & Transcoding', () => {
  let controller: TelephonyController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelephonyController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            agent: {
              findFirst: jest.fn(),
            },
            phoneNumber: {
              upsert: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            call: {
              findMany: jest.fn(),
            },
            conversation: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AppCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            deletePrefix: jest.fn(),
            getOrSet: jest.fn((k, ttl, fn) => fn()),
          },
        },
      ],
    }).compile();

    controller = module.get<TelephonyController>(TelephonyController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Audio Resampling Helpers', () => {
    it('should convert 8-bit G.711 mu-law samples to 16-bit PCM samples', () => {
      const mulaw = Buffer.from([0xff, 0x00]); // dummy mu-law buffer
      const pcm16 = mulawToPcm16(mulaw);
      
      // Output buffer length should be multiplied by 4 (upsampled + 16-bit)
      expect(pcm16.length).toBe(mulaw.length * 4);
    });

    it('should convert 24kHz 16-bit PCM down to 8kHz 8-bit G.711 mu-law', () => {
      // 24kHz PCM buffer (needs to be multiples of 6 bytes)
      const pcm24 = Buffer.alloc(12);
      pcm24.writeInt16LE(1000, 0);
      pcm24.writeInt16LE(2000, 2);
      pcm24.writeInt16LE(3000, 4);
      pcm24.writeInt16LE(1500, 6);
      
      const mulaw = pcm24ToMulaw(pcm24);
      expect(mulaw.length).toBe(2); // 12 / 6 = 2
    });

    it('should convert 16kHz 16-bit PCM down to 8kHz 8-bit G.711 mu-law', () => {
      // 16kHz PCM buffer (needs to be multiples of 4 bytes)
      const pcm16 = Buffer.alloc(8);
      pcm16.writeInt16LE(500, 0);
      pcm16.writeInt16LE(1000, 2);
      pcm16.writeInt16LE(1500, 4);
      pcm16.writeInt16LE(2000, 6);

      const mulaw = pcm16ToMulaw(pcm16);
      expect(mulaw.length).toBe(2); // 8 / 4 = 2
    });
  });

  describe('TelephonyController', () => {
    it('should connect phone number and generate agentToken', async () => {
      const agentId = 'agent_uuid_123';
      const phoneE164 = '+15550199';
      const workspaceId = 'ws_uuid_123';

      jest.spyOn(prisma.agent, 'findFirst').mockResolvedValue({ id: agentId } as any);
      jest.spyOn(prisma.phoneNumber, 'upsert').mockResolvedValue({
        id: 'conn_123',
        agentToken: 'token_123',
      } as any);

      const res = await controller.connectNumber(workspaceId, { agentId, phoneE164 });
      
      expect(res.connectionId).toBe('conn_123');
      expect(res.agentToken).toBeDefined();
      expect(res.webhookUrl).toContain('/telephony/twilio/incoming/');
      expect(prisma.phoneNumber.upsert).toHaveBeenCalled();
    });

    it('should verify connected phone number and return status', async () => {
      const agentToken = 'token_123';
      const workspaceId = 'ws_uuid_123';

      jest.spyOn(prisma.phoneNumber, 'findFirst').mockResolvedValue({
        id: 'conn_123',
        agentToken,
      } as any);
      
      jest.spyOn(prisma.phoneNumber, 'update').mockResolvedValue({
        status: 'connected',
        connectedAt: new Date(),
      } as any);

      const res = await controller.verifyNumber(workspaceId, { agentToken });

      expect(res.status).toBe('connected');
      expect(res.connectedAt).toBeDefined();
      expect(prisma.phoneNumber.update).toHaveBeenCalled();
    });

    it('should return call logs list without eager conversation loading', async () => {
      const workspaceId = 'ws_uuid_123';
      const mockCalls = [
        { id: 'call_1', callSid: 'sid_1', durationSec: 45, workspaceId, recordingUrl: 'http://rec1', captured: true, score: 'Hot' },
        { id: 'call_2', callSid: 'sid_2', durationSec: 90, workspaceId, recordingUrl: 'http://rec2', captured: false, score: 'Cold' },
      ];

      jest.spyOn(prisma.call, 'findMany').mockResolvedValue(mockCalls as any);

      const res = await controller.getCalls(workspaceId);

      expect(res).toEqual(mockCalls);
      expect(prisma.call.findMany).toHaveBeenCalledWith({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return conversation detail for a given callSid on demand', async () => {
      const workspaceId = 'ws_uuid_123';
      const callSid = 'sid_1';
      const mockConvo = {
        id: 'convo_1',
        captured: true,
        score: 'Hot',
        messages: [{ id: 'msg_1', role: 'visitor', content: 'Hi' }],
        leads: [{ id: 'lead_1', name: 'Alice' }],
      };

      jest.spyOn(prisma.conversation, 'findFirst').mockResolvedValue(mockConvo as any);

      const res = await controller.getCallConversation(workspaceId, callSid);

      expect(res).toEqual({
        id: 'convo_1',
        captured: true,
        score: 'Hot',
        messages: mockConvo.messages,
        lead: mockConvo.leads[0],
      });
      expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { callSid, workspaceId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          leads: { take: 1 },
        },
      });
    });
  });
});
