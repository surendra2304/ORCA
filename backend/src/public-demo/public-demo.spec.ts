import { Test, TestingModule } from '@nestjs/testing';
import { PublicDemoService } from './public-demo.service';
import { PublicDemoController } from './public-demo.controller';
import { PrismaService } from '../prisma/prisma.service';
import { KbService } from '../kb/kb.service';
import { ConversationService } from '../conversation/conversation.service';
import { NotFoundException } from '@nestjs/common';

describe('PublicDemo Module', () => {
  let controller: PublicDemoController;
  let service: PublicDemoService;
  let prisma: PrismaService;
  let kbService: KbService;
  let conversationService: ConversationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicDemoController],
      providers: [
        PublicDemoService,
        {
          provide: PrismaService,
          useValue: {
            workspace: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
            agent: {
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: KbService,
          useValue: {
            createDocument: jest.fn(),
            queryKb: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            handlePublicChatTurn: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicDemoController>(PublicDemoController);
    service = module.get<PublicDemoService>(PublicDemoService);
    prisma = module.get<PrismaService>(PrismaService);
    kbService = module.get<KbService>(KbService);
    conversationService = module.get<ConversationService>(ConversationService);

    // Mock module lifecycle hooks to avoid scheduling intervals during tests
    jest.spyOn(service, 'onModuleInit').mockImplementation(() => {});
    jest.spyOn(service, 'onModuleDestroy').mockImplementation(() => {});
  });

  describe('createDemoWorkspace', () => {
    it('should create a demo workspace, agent, and vertical KB document', async () => {
      const mockWorkspace = { id: 'ws-demo-id', name: 'Demo (SaaS)', isDemo: true };
      const mockAgent = { id: 'agent-demo-id', greeting: 'Hello!' };
      const mockDoc = { id: 'doc-demo-id' };

      jest.spyOn(prisma.workspace, 'create').mockResolvedValue(mockWorkspace as any);
      jest.spyOn(prisma.agent, 'create').mockResolvedValue(mockAgent as any);
      jest.spyOn(kbService, 'createDocument').mockResolvedValue(mockDoc as any);
      jest.spyOn(prisma.agent, 'update').mockResolvedValue(mockAgent as any);

      const result = await service.createDemoWorkspace({ vertical: 'saas' });

      expect(prisma.workspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDemo: true,
          }),
        }),
      );
      expect(prisma.agent.create).toHaveBeenCalled();
      expect(kbService.createDocument).toHaveBeenCalled();
      expect(prisma.agent.update).toHaveBeenCalled();
      expect(result.demoId).toBe(mockWorkspace.id);
      expect(result.agentId).toBe(mockAgent.id);
    });

    it('should create a demo workspace and trigger URL scraping when url is provided', async () => {
      const mockWorkspace = { id: 'ws-demo-id', name: 'Demo (example.com)', isDemo: true };
      const mockAgent = { id: 'agent-demo-id', greeting: 'Hello!' };
      const mockDoc = { id: 'doc-demo-id' };

      jest.spyOn(prisma.workspace, 'create').mockResolvedValue(mockWorkspace as any);
      jest.spyOn(prisma.agent, 'create').mockResolvedValue(mockAgent as any);
      jest.spyOn(kbService, 'createDocument').mockResolvedValue(mockDoc as any);
      jest.spyOn(prisma.agent, 'update').mockResolvedValue(mockAgent as any);

      const result = await service.createDemoWorkspace({ url: 'https://example.com' });

      expect(kbService.createDocument).toHaveBeenCalledWith(
        mockWorkspace.id,
        'https://example.com',
        'WEBSITE',
        { url: 'https://example.com' },
      );
      expect(result.demoId).toBe(mockWorkspace.id);
    });
  });

  describe('PublicDemoController chat turn', () => {
    it('should throw NotFoundException if workspace is not a demo workspace', async () => {
      jest.spyOn(prisma.workspace, 'findFirst').mockResolvedValue(null);

      await expect(
        controller.chat({ demoId: 'non-existent', message: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invoke handlePublicChatTurn if workspace is verified as a demo workspace', async () => {
      jest.spyOn(prisma.workspace, 'findFirst').mockResolvedValue({ id: 'ws-id', isDemo: true } as any);
      jest.spyOn(conversationService, 'handlePublicChatTurn').mockResolvedValue({ reply: 'Hello back' } as any);

      const result = await controller.chat({ demoId: 'ws-id', message: 'Hello' });

      expect(conversationService.handlePublicChatTurn).toHaveBeenCalledWith('ws-id', {
        conversationId: undefined,
        message: 'Hello',
      });
      expect(result).toEqual({ reply: 'Hello back' });
    });
  });

  describe('purgeExpiredDemos', () => {
    it('should fetch expired workspaces and delete them', async () => {
      const expiredMock = [{ id: 'expired-1' }, { id: 'expired-2' }];
      jest.spyOn(prisma.workspace, 'findMany').mockResolvedValue(expiredMock as any);
      jest.spyOn(prisma.workspace, 'delete').mockResolvedValue({} as any);

      await service.purgeExpiredDemos();

      expect(prisma.workspace.findMany).toHaveBeenCalled();
      expect(prisma.workspace.delete).toHaveBeenCalledTimes(2);
      expect(prisma.workspace.delete).toHaveBeenNthCalledWith(1, { where: { id: 'expired-1' } });
      expect(prisma.workspace.delete).toHaveBeenNthCalledWith(2, { where: { id: 'expired-2' } });
    });
  });
});
