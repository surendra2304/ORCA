import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { PrismaService } from '../prisma/prisma.service';
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

describe('WidgetController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let workspaceId: string;
  let publicKey: string;
  let secondChatAgentId: string;

  const email = `widget-owner-${randomBytes(6).toString('hex')}@example.com`;
  const password = 'Password123!';
  const companyName = 'Widget Test Co';

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

    // 2. Create sample agents
    const secondAgent = await prisma.agent.create({
      data: {
        workspaceId,
        kind: 'chat',
        name: 'Sales Bot',
        greeting: 'Interested in buying?',
        persona: 'Helpful',
        status: 'live',
      },
    });
    secondChatAgentId = secondAgent.id;

    await prisma.agent.create({
      data: {
        workspaceId,
        kind: 'chat',
        name: 'Chatbot 9000',
        greeting: 'Howdy partner!',
        persona: 'Cowboy',
        status: 'live',
      },
    });

    await prisma.agent.create({
      data: {
        workspaceId,
        kind: 'voice',
        name: 'Voice Agent 9000',
        voiceName: 'Aria',
        status: 'live',
      },
    });
  }, 30000);

  afterAll(async () => {
    if (workspaceId) {
      await prisma.workspace.delete({
        where: { id: workspaceId },
      });
    }
    await app.close();
  });

  it('GET /public/widget/config - should retrieve workspace configuration', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/widget/config?workspacePublicKey=${publicKey}`)
      .expect(200);

    expect(res.body).toHaveProperty('brandColor');
    expect(res.body.chatAgent.name).toBe('Chatbot 9000');
    expect(res.body.chatAgent.greeting).toBe('Howdy partner!');
    expect(res.body.chatAgent.persona).toBe('Cowboy');
    expect(res.body.voice.enabled).toBe(true);
    expect(res.body.voice.voiceName).toBe('Aria');
  });

  it('GET /public/widget/config?agentId=... - should retrieve specific agent configuration', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/widget/config?workspacePublicKey=${publicKey}&agentId=${secondChatAgentId}`)
      .expect(200);

    expect(res.body).toHaveProperty('brandColor');
    expect(res.body.chatAgent.name).toBe('Sales Bot');
    expect(res.body.chatAgent.greeting).toBe('Interested in buying?');
    expect(res.body.chatAgent.persona).toBe('Helpful');
    expect(res.body.chatAgent.agentId).toBe(secondChatAgentId);
  });

  it('POST /public/widget/ping - should update lastWidgetPingAt', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/public/widget/ping')
      .send({ workspacePublicKey: publicKey })
      .expect(201);

    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { lastWidgetPingAt: true },
    });

    expect(ws!.lastWidgetPingAt).not.toBeNull();
  });

  it('POST /widget/verify - should verify installation for owner', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/widget/verify')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    expect(res.body.installed).toBe(true);
    expect(res.body.lastSeenAt).not.toBeNull();
  });
});
