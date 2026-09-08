import { Test, TestingModule } from '@nestjs/testing';
import { VoiceService } from './voice.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { randomUUID } from 'crypto';
import { LlmService } from '../llm/llm.service';

// Mock fastembed to avoid Jest crashes in native ONNX
jest.mock('fastembed', () => {
  return {
    FlagEmbedding: {
      init: jest.fn().mockResolvedValue({
        embed: jest.fn().mockImplementation((texts: string[]) => {
          const dummyBatch = texts.map(() => Array(384).fill(0.25));
          return (async function* () {
            yield dummyBatch;
          })();
        }),
        queryEmbed: jest.fn().mockResolvedValue(Array(384).fill(0.25)),
      }),
    },
    EmbeddingModel: {
      BGESmallENV15: 'bge-small-en-v1.5',
    },
  };
}, { virtual: true });

// Mock @google/genai
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        authTokens: {
          create: jest.fn().mockImplementation(async (params) => {
            (global as any).lastTokenConfig = params.config;
            return {
              name: 'mocked_ephemeral_token_name',
              expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            };
          }),
        },
      };
    }),
    Modality: {
      AUDIO: 'AUDIO',
      TEXT: 'TEXT',
      IMAGE: 'IMAGE',
      VIDEO: 'VIDEO',
      MODALITY_UNSPECIFIED: 'MODALITY_UNSPECIFIED',
    },
  };
});

describe('VoiceService (Workspace Isolation)', () => {
  let service: VoiceService;
  let prisma: PrismaService;
  let workspaceIdA: string;
  let workspaceIdB: string;
  let agentIdA: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
      ],
      providers: [
        VoiceService,
        {
          provide: LlmService,
          useValue: {
            scoreConversation: jest.fn().mockResolvedValue({
              score: 'Hot',
              intent: 'Interested in product follow-up',
              aiNote: 'Mocked intent note',
              name: 'John Doe',
              email: 'john@example.com',
              phone: '123456789',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VoiceService>(VoiceService);
    prisma = module.get<PrismaService>(PrismaService);
    await prisma.onModuleInit();

    workspaceIdA = randomUUID();
    workspaceIdB = randomUUID();
    agentIdA = randomUUID();

    // Create Workspaces
    await prisma.workspace.create({
      data: {
        id: workspaceIdA,
        name: 'Workspace A',
        publicKey: 'pub_key_a_' + randomUUID(),
      },
    });

    await prisma.workspace.create({
      data: {
        id: workspaceIdB,
        name: 'Workspace B',
        publicKey: 'pub_key_b_' + randomUUID(),
      },
    });

    // Create Agent for Workspace A
    await prisma.agent.create({
      data: {
        id: agentIdA,
        workspaceId: workspaceIdA,
        kind: 'voice',
        name: 'Aria Assistant',
        voiceName: 'aria',
        persona: 'Polite',
        greeting: 'Hello from Aria',
        goal: 'support',
        captureFields: ['email'],
        status: 'draft',
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.agent.deleteMany({
        where: { id: agentIdA },
      });
      await prisma.workspace.deleteMany({
        where: { id: { in: [workspaceIdA, workspaceIdB] } },
      });
      await prisma.onModuleDestroy();
    }
  });

  it('should create an ephemeral token for a valid workspace and agent ID combination', async () => {
    const result = await service.createToken(workspaceIdA, agentIdA);
    expect(result).toBeDefined();
    expect(result.token).toBe('mocked_ephemeral_token_name');
    expect(result.model).toContain('gemini-2.5');
    expect((global as any).lastTokenConfig.liveConnectConstraints.config.sessionResumption).toEqual({});
  });

  it('should enforce strict workspace isolation (Workspace B cannot access Workspace A agent)', async () => {
    await expect(
      service.createToken(workspaceIdB, agentIdA)
    ).rejects.toThrow();
  });

  it('should accept resumptionHandle and configure sessionResumption with handle', async () => {
    const result = await service.createToken(workspaceIdA, agentIdA, 'test_handle_123');
    expect(result).toBeDefined();
    expect((global as any).lastTokenConfig.liveConnectConstraints.config.sessionResumption).toEqual({
      handle: 'test_handle_123',
    });
  });
});
