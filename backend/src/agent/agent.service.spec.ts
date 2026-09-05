import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { randomUUID } from 'crypto';

describe('AgentService (Versioning & Rollback)', () => {
  let service: AgentService;
  let prisma: PrismaService;
  let workspaceId: string;
  let userId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
        BillingModule,
      ],
      providers: [AgentService],
    }).compile();

    service = module.get<AgentService>(AgentService);
    prisma = module.get<PrismaService>(PrismaService);
    await prisma.onModuleInit();

    workspaceId = randomUUID();
    userId = randomUUID();

    // Create Workspace
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Agent Test Workspace',
        publicKey: 'pub_key_' + randomUUID(),
      },
    });

    // Create a User to act as publisher
    await prisma.user.create({
      data: {
        id: userId,
        workspaceId,
        email: 'publisher-' + randomUUID() + '@example.com',
        name: 'Publisher User',
        passwordHash: 'dummy',
        role: 'owner',
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.workspace.deleteMany({
        where: { id: workspaceId },
      });
      await prisma.onModuleDestroy();
    }
  });

  it('should create an agent in draft status', async () => {
    const agent = await service.create(workspaceId, {
      kind: 'chat',
      name: 'Draft Assistant',
      persona: 'Helpful',
    });

    expect(agent).toBeDefined();
    expect(agent.name).toBe('Draft Assistant');
    expect(agent.status).toBe('draft');
    expect(agent.persona).toBe('Helpful');
  });

  it('should snapshot version history on publish and rollback changes successfully', async () => {
    // 1. Create a new agent
    const agent = await service.create(workspaceId, {
      kind: 'chat',
      name: 'Version Agent',
      persona: 'Polite',
      greeting: 'Initial Greeting',
    });

    // 2. Publish initial version (v1)
    const publishedV1 = await service.publish(workspaceId, agent.id, userId);
    expect(publishedV1.status).toBe('live');

    // Verify AgentVersion row was created
    const versions = await service.getVersions(workspaceId, agent.id);
    expect(versions.length).toBe(1);
    expect(versions[0].publishedBy).toBe(userId);
    expect((versions[0].configSnapshot as any).greeting).toBe('Initial Greeting');

    const v1Id = versions[0].id;

    // 3. Modify agent config (to simulate draft updates)
    const updatedDraft = await service.update(workspaceId, agent.id, {
      greeting: 'Modified Greeting v2',
      persona: 'Direct',
    });
    expect(updatedDraft.greeting).toBe('Modified Greeting v2');

    // 4. Publish second version (v2)
    await service.publish(workspaceId, agent.id, userId);
    const versionsV2 = await service.getVersions(workspaceId, agent.id);
    expect(versionsV2.length).toBe(2);
    expect((versionsV2[0].configSnapshot as any).greeting).toBe('Modified Greeting v2');

    // 5. Rollback to v1
    const rolledBackAgent = await service.rollback(workspaceId, agent.id, v1Id);
    expect(rolledBackAgent.greeting).toBe('Initial Greeting');
    expect(rolledBackAgent.persona).toBe('Polite');

    // Verify current agent in DB has rolled back config
    const currentAgent = await service.findOne(workspaceId, agent.id);
    expect(currentAgent.greeting).toBe('Initial Greeting');
    expect(currentAgent.persona).toBe('Polite');
  });
});
