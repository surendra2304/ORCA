import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { randomBytes } from 'crypto';

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

describe('Billing Plan Gating & Checkout (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let billingService: BillingService;

  let ownerToken: string;
  let workspaceId: string;
  let publicKey: string;
  let chatAgentId: string;

  const email = `billing-owner-${randomBytes(6).toString('hex')}@example.com`;
  const password = 'Password123!';
  const companyName = 'Billing Test Co';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    billingService = moduleFixture.get<BillingService>(BillingService);
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();

    // 1. Sign up to get workspace and token
    const signupRes = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ companyName, email, password })
      .expect(201);

    ownerToken = signupRes.body.accessToken;
    workspaceId = signupRes.body.workspace.id;

    // Get public key
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { publicKey: true },
    });
    publicKey = ws!.publicKey;

    // Create an agent
    const agent = await prisma.agent.create({
      data: {
        workspaceId,
        kind: 'chat',
        name: 'Gated Chatbot',
        greeting: 'Hello from gated agent',
        status: 'live',
      },
    });
    chatAgentId = agent.id;
  }, 30000);

  afterAll(async () => {
    if (workspaceId) {
      await prisma.workspace.delete({
        where: { id: workspaceId },
      });
    }
    await app.close();
  });

  it('should allow chat messages when usage is below limit', async () => {
    // Should get a normal response (in tests it might fallback to mock or try gemini, which fails on API key quota but does not return 402)
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/chat')
      .send({
        workspacePublicKey: publicKey,
        agentId: chatAgentId,
        message: 'Hello, what is your name?',
      });

    // We expect either 201 (success) or 500 (from Gemini rate limit fallback if mock fails, but not 402!)
    // Wait! Let's check status: it should not be 402!
    expect(res.status).not.toBe(402);
  });

  it('should block chat messages (return 402) when usage exceeds starter limit', async () => {
    // 1. Seed usage events up to the starter limit (500 events)
    await prisma.usageEvent.createMany({
      data: Array(501).fill(null).map(() => ({
        workspaceId,
        type: 'chat_message',
        quantity: 1,
        agentId: chatAgentId,
      })),
    });

    // 2. Request should now be blocked with 402 Payment Required
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/chat')
      .send({
        workspacePublicKey: publicKey,
        agentId: chatAgentId,
        message: 'Hello, please answer me',
      })
      .expect(402);

    expect(res.body.message).toContain('Plan limit exceeded');
    expect(res.body.limitType).toBe('chatMessages');
  });

  it('should unblock chat messages when upgraded to growth plan', async () => {
    // 1. Trigger mock checkout/upgrade to growth
    await request(app.getHttpServer())
      .post('/api/v1/billing/mock-checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ plan: 'growth' })
      .expect(201);

    // 2. Request should now pass the gate and not return 402! (Growth limit is 5000)
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/chat')
      .send({
        workspacePublicKey: publicKey,
        agentId: chatAgentId,
        message: 'Hello, please answer me now',
      });

    expect(res.status).not.toBe(402);
  });
});
