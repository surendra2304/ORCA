import { Test, TestingModule } from '@nestjs/testing';
import { KbService } from './kb.service';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { randomUUID } from 'crypto';

// Mock fastembed module virtual imports to bypass ONNX download during tests
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

describe('KbService Integration', () => {
  let service: KbService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  let workspaceIdA: string;
  let workspaceIdB: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
      ],
      providers: [KbService, RagService],
    }).compile();

    service = moduleRef.get<KbService>(KbService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    await prisma.onModuleInit();

    workspaceIdA = randomUUID();
    workspaceIdB = randomUUID();

    // Create Workspaces
    await prisma.workspace.create({
      data: {
        id: workspaceIdA,
        name: 'KB Test Workspace A',
        publicKey: 'kb_pub_key_a',
      },
    });

    await prisma.workspace.create({
      data: {
        id: workspaceIdB,
        name: 'KB Test Workspace B',
        publicKey: 'kb_pub_key_b',
      },
    });
  });

  afterAll(async () => {
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

  it('should create document, run ingestion worker, and query chunks', async () => {
    // 1. Ingest FAQ document
    const doc = await service.createDocument(
      workspaceIdA,
      'Test FAQ Doc',
      'FAQ',
      {
        faqItems: [
          { q: 'What is the refund policy?', a: 'You have 30 days to request a full refund.' },
          { q: 'Do you offer support?', a: 'Yes, 24/7 client support is available.' },
        ],
      },
    );

    expect(doc.id).toBeDefined();
    expect(doc.status).toBe('processing');

    // Wait for the asynchronous background ingestion task to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify document status was updated to ready
    const updatedDoc = await prisma.kbDocument.findUnique({
      where: { id: doc.id },
    });
    expect(updatedDoc?.status).toBe('ready');
    expect(updatedDoc?.chunkCount).toBeGreaterThan(0);

    // Verify chunks are inserted in pgvector
    const chunkCount = await prisma.kbChunk.count({
      where: { documentId: doc.id },
    });
    expect(chunkCount).toBeGreaterThan(0);

    // 2. Query KB and check cosine scoring
    const queryResult = await service.queryKb(workspaceIdA, 'refund policy', 2, 0.1);
    expect(queryResult.grounded).toBe(true);
    expect(queryResult.chunks.length).toBeGreaterThan(0);
    expect(queryResult.chunks[0].content).toContain('refund policy');

    // 3. Verify tenant isolation (Query Workspace B should return empty RAG context)
    const queryResultB = await service.queryKb(workspaceIdB, 'refund policy', 2, 0.1);
    expect(queryResultB.grounded).toBe(false);
    expect(queryResultB.chunks.length).toBe(0);
  });

  it('should clean up chunks on document deletion', async () => {
    const doc = await service.createDocument(
      workspaceIdA,
      'Delete Me Doc',
      'FAQ',
      {
        faqItems: [{ q: 'Short q?', a: 'Short answer.' }],
      },
    );

    await new Promise(resolve => setTimeout(resolve, 400));

    // Ensure chunks exist
    const initialChunks = await prisma.kbChunk.count({
      where: { documentId: doc.id },
    });
    expect(initialChunks).toBeGreaterThan(0);

    // Delete document
    await service.deleteDocument(workspaceIdA, doc.id);

    // Verify cascade deletion
    const afterChunks = await prisma.kbChunk.count({
      where: { documentId: doc.id },
    });
    expect(afterChunks).toBe(0);

    const docRecord = await prisma.kbDocument.findUnique({
      where: { id: doc.id },
    });
    expect(docRecord).toBeNull();
  });

  it('should restrict queries to only connectedKbDocumentIds', async () => {
    // 1. Ingest Doc 1
    const doc1 = await service.createDocument(
      workspaceIdA,
      'Doc 1',
      'FAQ',
      {
        faqItems: [
          { q: 'What is the color of the sky?', a: 'The sky is blue.' },
        ],
      },
    );
    // 2. Ingest Doc 2
    const doc2 = await service.createDocument(
      workspaceIdA,
      'Doc 2',
      'FAQ',
      {
        faqItems: [
          { q: 'What is the color of grass?', a: 'Grass is green.' },
        ],
      },
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    const updatedDoc1 = await prisma.kbDocument.findUnique({ where: { id: doc1.id } });
    const updatedDoc2 = await prisma.kbDocument.findUnique({ where: { id: doc2.id } });
    expect(updatedDoc1?.status).toBe('ready');
    expect(updatedDoc2?.status).toBe('ready');

    // Query with restriction to doc1
    const queryResult1 = await service.queryKb(workspaceIdA, 'color', 5, 0.1, [doc1.id]);
    const contents1 = queryResult1.chunks.map(c => c.content.toLowerCase());
    expect(contents1.some(c => c.includes('sky is blue'))).toBe(true);
    expect(contents1.some(c => c.includes('grass is green'))).toBe(false);

    // Query with restriction to doc2
    const queryResult2 = await service.queryKb(workspaceIdA, 'color', 5, 0.1, [doc2.id]);
    const contents2 = queryResult2.chunks.map(c => c.content.toLowerCase());
    expect(contents2.some(c => c.includes('grass is green'))).toBe(true);
    expect(contents2.some(c => c.includes('sky is blue'))).toBe(false);

    // Clean up
    await service.deleteDocument(workspaceIdA, doc1.id);
    await service.deleteDocument(workspaceIdA, doc2.id);
  });
});
