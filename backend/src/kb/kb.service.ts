import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RagService } from '../rag/rag.service';
import { AppCacheService } from '../common/cache/cache.service';
import { Subject } from 'rxjs';
import { WebsiteIngestionService } from '../website-ingestion/website-ingestion.service';
import { parseFileBuffer } from './document-parser.util';
import { parseDocument, cleanHtmlContent } from './document-parser.util';

@Injectable()
export class KbService {
  private readonly logger = new Logger(KbService.name);

  // Track in-memory progress percentages for active processing documents
  private progressMap = new Map<string, number>();
  // In-memory queue for sequential ingestion
  private ingestionQueue: { docId: string; workspaceId: string; payload: any }[] = [];
  private isProcessingQueue = false;

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.ingestionQueue.length > 0) {
      const job = this.ingestionQueue.shift();
      if (job) {
        try {
          await this.ingestDocument(job.docId, job.workspaceId, job.payload);
        } catch (err) {
          this.logger.error(`Unhandled ingestion failure for doc ${job.docId}:`, err);
        }
      }
    }

    this.isProcessingQueue = false;
  }
  // Observable stream for Server-Sent Events (SSE) progress tracking
  private progressSubject = new Subject<{
    workspaceId: string;
    docId: string;
    pct: number;
    status: string;
  }>();

  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
    private websiteIngestionService: WebsiteIngestionService,
    private cacheService: AppCacheService,
  ) {}

  getProgressStream() {
    return this.progressSubject.asObservable();
  }

  getProgress(docId: string): number {
    return this.progressMap.get(docId) ?? 0;
  }

  /**
   * Fetch all documents for a workspace (cached for fast 0-latency loads)
   */
  async getDocuments(workspaceId: string) {
    const cacheKey = `kb:${workspaceId}:docs`;
    const docs = await this.cacheService.getOrSet(cacheKey, 120, async () => {
      return this.prisma.kbDocument.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
      });
    });

    return docs.map((doc) => ({
      ...doc,
      pct: this.getProgress(doc.id),
    }));
  }

  /**
   * Fetch single document
   */
  async getDocument(workspaceId: string, docId: string) {
    const doc = await this.prisma.kbDocument.findFirstOrThrow({
      where: { id: docId, workspaceId },
    });

    return {
      ...doc,
      pct: this.getProgress(doc.id),
    };
  }

  /**
   * Fetch workspace KB summary metrics (cached for instant loads)
   */
  async getStatus(workspaceId: string) {
    const cacheKey = `kb:${workspaceId}:status`;
    return this.cacheService.getOrSet(cacheKey, 120, async () => {
      const docs = await this.prisma.kbDocument.findMany({
        where: { workspaceId },
      });

      const sourcesCount = docs.length;
      const readyCount = docs.filter(d => d.status === 'ready').length;
      
      const chunkCountAgg = await this.prisma.kbChunk.aggregate({
        where: { workspaceId },
        _count: { id: true },
      });
      
      const topicsApprox = Math.max(1, Math.round(chunkCountAgg._count.id / 3));

      const lastReadyDoc = docs
        .filter(d => d.status === 'ready')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

      return {
        sources: sourcesCount,
        ready: readyCount,
        topicsApprox,
        lastTrainedAt: lastReadyDoc ? lastReadyDoc.updatedAt.toISOString() : new Date().toISOString(),
      };
    });

  }

  /**
   * Create document record and trigger async ingestion
   */
  async createDocument(
    workspaceId: string,
    name: string,
    type: string,
    payload: {
      fileBuffer?: Buffer;
      fileName?: string;
      url?: string;
      faqItems?: { q: string; a: string }[];
    },
  ) {
    const doc = await this.prisma.kbDocument.create({
      data: {
        workspaceId,
        type,
        name,
        status: 'processing',
        chunkCount: 0,
        sourceUri: payload.url,
      },
    });

    this.progressMap.set(doc.id, 0);

    // Trigger async processing
    this.ingestionQueue.push({ docId: doc.id, workspaceId, payload });
    this.processQueue();

    return {
      ...doc,
      pct: 0,
    };
  }

  /**
   * Ingest and index document
   */
  async ingestDocument(
    docId: string,
    workspaceId: string,
    payload: {
      fileBuffer?: Buffer;
      fileName?: string;
      url?: string;
      faqItems?: { q: string; a: string }[];
    },
  ) {
    this.logger.log(
      `Starting ingestion for document ${docId} (Workspace: ${workspaceId})`,
    );
    this.progressMap.set(docId, 5);
    this.progressSubject.next({
      workspaceId,
      docId,
      pct: 5,
      status: 'processing',
    });

    try {
      const docRecord = await this.prisma.kbDocument.findUnique({
        where: { id: docId },
        select: { type: true, name: true },
      });

      // 1. Extract text
      let text = '';
      if (payload.fileBuffer) {
        const filename = payload.fileName || docRecord?.name || 'unknown.txt';
        text = await parseDocument(payload.fileBuffer, filename);
      } else if (payload.url) {
        const extractedDocs = await this.websiteIngestionService.crawl(payload.url);
        text = extractedDocs.map(doc => doc.content).join('\n\n');
      } else if (payload.faqItems) {
        text = payload.faqItems
          .map((item) => `Q: ${item.q.trim()}\nA: ${item.a.trim()}`)
          .join('\n\n');
      }

      // 2. Validate extracted text
      text = text.replace(/[ \t]+/g, ' ').trim();
      if (!text) {
        throw new Error('Document is empty or text extraction failed.');
      }

      this.progressMap.set(docId, 30);
      this.progressSubject.next({
        workspaceId,
        docId,
        pct: 30,
        status: 'processing',
      });

      // 3. Chunk text
      const chunks = this.ragService.chunkText(text);
      if (chunks.length === 0) {
        throw new Error('No semantic chunks could be created from this text.');
      }

      this.progressMap.set(docId, 50);
      this.progressSubject.next({
        workspaceId,
        docId,
        pct: 50,
        status: 'processing',
      });

      // 4. Generate embeddings
      const embeddings = await this.ragService.generateEmbeddings(chunks);
      if (embeddings.length !== chunks.length) {
        throw new Error('Embedding generation size mismatch.');
      }

      this.progressMap.set(docId, 80);
      this.progressSubject.next({
        workspaceId,
        docId,
        pct: 80,
        status: 'processing',
      });

      // 5. Database Transaction (replace existing chunks and update doc status)
      await this.prisma.$transaction(
        async (tx) => {
          await tx.kbChunk.deleteMany({
            where: { documentId: docId },
          });

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = embeddings[i];
            const embeddingString = `[${embedding.join(',')}]`;

            await tx.$executeRaw`
              INSERT INTO kb_chunks (id, workspace_id, document_id, chunk_index, content, embedding)
              VALUES (gen_random_uuid(), ${workspaceId}::uuid, ${docId}::uuid, ${i}, ${chunk}, ${embeddingString}::vector)
            `;
          }

          await tx.kbDocument.update({
            where: { id: docId },
            data: {
              status: 'ready',
              chunkCount: chunks.length,
              error: null,
            },
          });
        },
        { timeout: 30000, maxWait: 10000 },
      );

      this.progressMap.set(docId, 100);
      this.progressSubject.next({
        workspaceId,
        docId,
        pct: 100,
        status: 'ready',
      });
      this.cacheService.deletePrefix(`kb:${workspaceId}`);
      this.logger.log(
        `Document ${docId} ingested successfully with ${chunks.length} chunks.`,
      );
    } catch (err: any) {
      this.logger.error(`Ingestion failed for doc ${docId}:`, err);

      await this.prisma.kbDocument.update({
        where: { id: docId },
        data: {
          status: 'failed',
          error: err.message || 'Unknown processing error',
        },
      });

      this.progressMap.set(docId, 0);
      this.progressSubject.next({
        workspaceId,
        docId,
        pct: 0,
        status: 'failed',
      });
      this.cacheService.deletePrefix(`kb:${workspaceId}`);
    }
  }

  /**
   * Delete a document and its chunks, and clean up agent references
   */
  async deleteDocument(workspaceId: string, docId: string) {
    const doc = await this.prisma.kbDocument.findFirstOrThrow({
      where: { id: docId, workspaceId },
    });

    await this.prisma.$transaction(
      async (tx) => {
        await tx.kbChunk.deleteMany({
          where: { documentId: docId },
        });

        await tx.kbDocument.delete({
          where: { id: docId },
        });
      },
      {
        timeout: 30000,
        maxWait: 10000,
      },
    );

    // Remove deleted docId from all agents' connectedKbDocumentIds
    try {
      const agents = await this.prisma.agent.findMany({
        where: { workspaceId },
      });
      for (const ag of agents) {
        const currentIds = Array.isArray(ag.connectedKbDocumentIds)
          ? (ag.connectedKbDocumentIds as string[])
          : [];
        if (currentIds.includes(docId)) {
          await this.prisma.agent.update({
            where: { id: ag.id },
            data: {
              connectedKbDocumentIds: currentIds.filter((id) => id !== docId),
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to remove deleted doc ${docId} from agents: ${err.message}`,
      );
    }

    this.progressMap.delete(docId);
    this.cacheService.deletePrefix(`kb:${workspaceId}`);
    return doc;
  }

  /**
   * Retry failed ingestion
   */
  async retryDocument(workspaceId: string, docId: string) {
    const doc = await this.prisma.kbDocument.findFirstOrThrow({
      where: { id: docId, workspaceId },
    });

    await this.prisma.kbDocument.update({
      where: { id: docId },
      data: {
        status: 'processing',
        error: null,
      },
    });

    this.progressMap.set(docId, 0);
    this.cacheService.deletePrefix(`kb:${workspaceId}`);

    const payload: { fileBuffer?: Buffer; url?: string; faqItems?: any[] } = {};
    if (doc.type.toLowerCase() === 'url' && doc.sourceUri) {
      payload.url = doc.sourceUri;
    }

    this.ingestionQueue.push({ docId: doc.id, workspaceId, payload });
    this.processQueue();

    return {
      ...doc,
      status: 'processing',
      pct: 0,
    };
  }

  /**
   * Retrieve semantically relevant context chunks from pgvector with relevance verification
   */
  async queryKb(
    workspaceId: string,
    query: string,
    topK = 5,
    threshold = 0.35,
    documentIds?: string[],
  ) {
    const qv = await this.ragService.generateQueryEmbedding(query);
    const queryVectorString = `[${qv.join(',')}]`;

    let docFilter = Prisma.empty;
    if (documentIds && documentIds.length > 0) {
      docFilter = Prisma.sql`AND c.document_id::text IN (${Prisma.join(documentIds)})`;
    }

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.content, c.document_id AS "documentId", d.name AS "documentName",
             1 - (c.embedding <=> ${queryVectorString}::vector) AS score
      FROM kb_chunks c
      JOIN kb_documents d ON c.document_id = d.id
      WHERE c.workspace_id = ${workspaceId}::uuid ${docFilter}
      ORDER BY c.embedding <=> ${queryVectorString}::vector
      LIMIT ${Math.max(topK * 4, 15)}
    `;

    const primaryDocId =
      rows.length > 0 && Number(rows[0].score) >= threshold
        ? rows[0].documentId
        : null;
    const topScore = rows.length > 0 ? Number(rows[0].score) : 0;
    const stopwords = new Set([
      'what',
      'is',
      'the',
      'how',
      'why',
      'who',
      'where',
      'when',
      'which',
      'can',
      'you',
      'tell',
      'me',
      'about',
      'are',
      'of',
      'in',
      'and',
      'for',
      'to',
      'a',
      'an',
    ]);
    const queryKeywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));
    const seen = new Set<string>();
    const kept: { content: string; documentName: string; score: number }[] = [];

    const candidates = rows
      .map((r) => ({
        ...r,
        scoreNum: Number(r.score),
        rerank:
          Number(r.score) +
          (primaryDocId && r.documentId === primaryDocId ? 0.03 : 0),
      }))
      .sort((a, b) => b.rerank - a.rerank);

    for (const r of candidates) {
      if (r.scoreNum < threshold) continue;
      if (
        topScore >= 0.65 &&
        r.documentId !== primaryDocId &&
        topScore - r.scoreNum > 0.12
      )
        continue;
      const clean = (r.content || '').replace(/--- Slide \d+ ---/gi, '').trim();
      if (!clean) continue;
      if (
        r.scoreNum < 0.68 &&
        queryKeywords.length > 0 &&
        !queryKeywords.some((kw) => clean.toLowerCase().includes(kw))
      )
        continue;
      const norm = clean.toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);

      kept.push({
        content: clean,
        documentName: r.documentName,
        score: r.scoreNum,
      });
      if (kept.length >= topK) break;
    }

    return {
      chunks: kept,
      context:
        kept.length > 0
          ? kept.map((c) => c.content).join('\n\n')
          : 'No relevant knowledge base information found.',
      grounded: kept.length > 0,
    };
  }

  /**
   * Scrapes URL content using clean HTML extraction
   */
  private async extractUrlContent(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!response.ok) {
      throw new Error(`Scraper failed to load page: status ${response.status}`);
    }
    const html = await response.text();
    return cleanHtmlContent(html);
  }
}
