import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma.module';
import { randomUUID } from 'crypto';

describe('Prisma Tenant Isolation Test', () => {
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  let workspaceIdA: string;
  let workspaceIdB: string;
  let docIdA: string;
  let docIdB: string;
  let chunkIdA: string;
  let chunkIdB: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    // Explicitly call onModuleInit to establish database connection
    await prisma.onModuleInit();

    workspaceIdA = randomUUID();
    workspaceIdB = randomUUID();
    docIdA = randomUUID();
    docIdB = randomUUID();
    chunkIdA = randomUUID();
    chunkIdB = randomUUID();

    // Setup Workspace A
    await prisma.workspace.create({
      data: {
        id: workspaceIdA,
        name: 'Workspace A',
        publicKey: 'ws_pub_key_a',
      },
    });

    await prisma.kbDocument.create({
      data: {
        id: docIdA,
        workspaceId: workspaceIdA,
        type: 'txt',
        name: 'doc_a.txt',
        status: 'ready',
      },
    });

    const vectorArrayA = Array.from({ length: 384 }, () => 0.1.toFixed(4));
    const vectorStrA = `[${vectorArrayA.join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO kb_chunks (id, workspace_id, document_id, chunk_index, content, embedding, token_len)
      VALUES (${chunkIdA}, ${workspaceIdA}, ${docIdA}, 0, 'Secret Workspace A content', ${vectorStrA}::vector, 10)
    `;

    // Setup Workspace B
    await prisma.workspace.create({
      data: {
        id: workspaceIdB,
        name: 'Workspace B',
        publicKey: 'ws_pub_key_b',
      },
    });

    await prisma.kbDocument.create({
      data: {
        id: docIdB,
        workspaceId: workspaceIdB,
        type: 'txt',
        name: 'doc_b.txt',
        status: 'ready',
      },
    });

    const vectorArrayB = Array.from({ length: 384 }, () => 0.9.toFixed(4));
    const vectorStrB = `[${vectorArrayB.join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO kb_chunks (id, workspace_id, document_id, chunk_index, content, embedding, token_len)
      VALUES (${chunkIdB}, ${workspaceIdB}, ${docIdB}, 0, 'Secret Workspace B content', ${vectorStrB}::vector, 10)
    `;
  });

  afterAll(async () => {
    // Cascade delete workspaces (deletes docs and chunks)
    if (prisma) {
      await prisma.workspace.deleteMany({
        where: {
          id: {
            in: [workspaceIdA, workspaceIdB],
          },
        },
      });
      await prisma.onModuleDestroy();
    }
  });

  it('should only return Workspace A chunks when querying for Workspace A', async () => {
    // Generate a query vector closer to A (all 0.1)
    const queryVector = Array.from({ length: 384 }, () => 0.1.toFixed(4));
    const queryVectorStr = `[${queryVector.join(',')}]`;

    // Raw pgvector similarity query filtering by Workspace A
    const results: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, content, 1 - (embedding <=> $2::vector) AS score 
       FROM kb_chunks 
       WHERE workspace_id = $1::uuid 
       ORDER BY embedding <=> $2::vector 
       LIMIT 5`,
      workspaceIdA,
      queryVectorStr,
    );

    // Verify Workspace A chunk is returned
    const chunkIds = results.map((r) => r.id);
    expect(chunkIds).toContain(chunkIdA);

    // Verify Workspace B chunk is NOT returned (isolation proof)
    expect(chunkIds).not.toContain(chunkIdB);
  });

  it('should only return Workspace B chunks when querying for Workspace B', async () => {
    // Generate a query vector closer to B (all 0.9)
    const queryVector = Array.from({ length: 384 }, () => 0.9.toFixed(4));
    const queryVectorStr = `[${queryVector.join(',')}]`;

    // Raw pgvector similarity query filtering by Workspace B
    const results: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, content, 1 - (embedding <=> $2::vector) AS score 
       FROM kb_chunks 
       WHERE workspace_id = $1::uuid 
       ORDER BY embedding <=> $2::vector 
       LIMIT 5`,
      workspaceIdB,
      queryVectorStr,
    );

    // Verify Workspace B chunk is returned
    const chunkIds = results.map((r) => r.id);
    expect(chunkIds).toContain(chunkIdB);

    // Verify Workspace A chunk is NOT returned (isolation proof)
    expect(chunkIds).not.toContain(chunkIdA);
  });
});
