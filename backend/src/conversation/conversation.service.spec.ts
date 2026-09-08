import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { KbService } from '../kb/kb.service';
import { RagService } from '../rag/rag.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { randomUUID } from 'crypto';

// Mock fastembed
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
        models: {
          generateContent: jest.fn().mockImplementation(async (args) => {
            const prompt = typeof args.contents === 'string' ? args.contents : '';
            const systemInstruction = args.config?.systemInstruction || '';

            // Check if it's the scoring call (returns JSON)
            if (args.config?.responseMimeType === 'application/json') {
              let score = 'Cold';
              let name: string | null = null;
              let email: string | null = null;
              let phone: string | null = null;
              let intent = 'casual browsing';
              let aiNote = 'No specific purchase intention detected.';

              if (prompt.includes('john.doe@example.com') || prompt.includes('John Doe')) {
                score = 'Hot';
                name = 'John Doe';
                email = 'john.doe@example.com';
                intent = 'Demo and pricing request';
                aiNote = 'User provided email address and requested demo details.';
              } else if (prompt.includes('555-0199')) {
                score = 'Warm';
                phone = '555-0199';
                intent = 'Asked about feature list';
                aiNote = 'Provided phone number for follow up.';
              }

              return {
                text: JSON.stringify({
                  score,
                  intent,
                  aiNote,
                  name,
                  email,
                  phone,
                }),
              };
            }

            // Chat generation call
            if (systemInstruction.includes('refund policy')) {
              return {
                text: 'According to our context, you have 30 days to request a full refund.',
              };
            }

            return {
              text: 'This is a mocked conversational response.',
            };
          }),
        },
      };
    }),
  };
});

describe('ConversationService Integration & Lead Capture', () => {
  let service: ConversationService;
  let prisma: PrismaService;
  let kbService: KbService;
  let moduleRef: TestingModule;

  let workspaceIdA: string;
  let workspaceIdB: string;

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = 'mocked_real_key';

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
        BillingModule,
      ],
      providers: [ConversationService, LlmService, KbService, RagService],
    }).compile();

    service = moduleRef.get<ConversationService>(ConversationService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    kbService = moduleRef.get<KbService>(KbService);

    await prisma.onModuleInit();

    workspaceIdA = randomUUID();
    workspaceIdB = randomUUID();

    // Create Workspaces
    await prisma.workspace.create({
      data: {
        id: workspaceIdA,
        name: 'Workspace A (Test)',
        publicKey: 'pub_key_a_' + randomUUID(),
      },
    });

    await prisma.workspace.create({
      data: {
        id: workspaceIdB,
        name: 'Workspace B (Test)',
        publicKey: 'pub_key_b_' + randomUUID(),
      },
    });

    // Seed FAQ into Workspace A
    const doc = await kbService.createDocument(workspaceIdA, 'Workspace A FAQ', 'FAQ', {
      faqItems: [{ q: 'What is the refund policy?', a: 'You have 30 days to request a full refund.' }],
    });
    // Wait for async ingestion
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    process.env.GEMINI_API_KEY = 'local_placeholder';
    if (prisma) {
      await prisma.workspace.deleteMany({
        where: { id: { in: [workspaceIdA, workspaceIdB] } },
      });
      await prisma.onModuleDestroy();
    }
  });

  it('should answer grounded questions using RAG and perform LLM lead capture', async () => {
    // 1. Send grounded query to Workspace A
    const turn1 = await service.handlePublicChatTurn(workspaceIdA, {
      message: 'What is the refund policy?',
      visitorMeta: { ip: '127.0.0.1' },
    });

    expect(turn1.conversationId).toBeDefined();
    expect(turn1.reply).toContain('30 days');
    expect(turn1.score).toBe('Cold'); // No contact details yet

    // 2. Provide contact details to qualify lead
    const turn2 = await service.handlePublicChatTurn(workspaceIdA, {
      conversationId: turn1.conversationId,
      message: 'Sure, contact me at john.doe@example.com. My name is John Doe.',
    });

    expect(turn2.reply).toBeDefined();
    expect(turn2.score).toBe('Hot');
    expect(turn2.captured?.fields).toContain('email');
    expect(turn2.captured?.fields).toContain('name');

    // 3. Verify lead is stored in DB
    const lead = await prisma.lead.findFirst({
      where: { workspaceId: workspaceIdA, email: 'john.doe@example.com' },
    });
    expect(lead).toBeDefined();
    expect(lead?.name).toBe('John Doe');
    expect(lead?.score).toBe('Hot');

    // 4. Verify conversation metadata updated
    const convo = await prisma.conversation.findUnique({
      where: { id: turn1.conversationId },
    });
    expect(convo?.captured).toBe(true);
    expect(convo?.score).toBe('Hot');
  });

  it('should enforce strict workspace isolation (scoping)', async () => {
    // 1. Start a chat in Workspace B
    const turnB = await service.handlePublicChatTurn(workspaceIdB, {
      message: 'What is the refund policy?',
    });

    // Workspace B does not have the FAQ document (only Workspace A does)
    // RAG context should be empty, so response should be default mock response or decline
    expect(turnB.reply).not.toContain('30 days');

    // 2. Try to send message to Workspace B using Workspace A\'s conversationId
    const turnA = await service.handlePublicChatTurn(workspaceIdA, {
      message: 'Ping from Workspace A',
    });

    await expect(
      service.handlePublicChatTurn(workspaceIdB, {
        conversationId: turnA.conversationId,
        message: 'Illegal attempt to access thread',
      }),
    ).rejects.toThrow();
  });
});
