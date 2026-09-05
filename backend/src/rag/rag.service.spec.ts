import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { ConfigModule } from '@nestjs/config';

// Mock fastembed module to avoid downloading and loading weights during tests
jest.mock('fastembed', () => {
  return {
    FlagEmbedding: {
      init: jest.fn().mockResolvedValue({
        embed: jest.fn().mockImplementation((texts: string[]) => {
          const dummyBatch = texts.map(() => Array(384).fill(0.15));
          return (async function* () {
            yield dummyBatch;
          })();
        }),
        queryEmbed: jest.fn().mockResolvedValue(Array(384).fill(0.15)),
      }),
    },
    EmbeddingModel: {
      BGESmallENV15: 'bge-small-en-v1.5',
    },
  };
}, { virtual: true });

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [RagService],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkText', () => {
    it('should split clean paragraph boundaries', () => {
      const text = 'Paragraph one content.\n\nParagraph two content.';
      const chunks = service.chunkText(text, 30, 0);
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe('Paragraph one content.');
      expect(chunks[1]).toBe('Paragraph two content.');
    });

    it('should split long paragraphs by sentences when exceeding target size', () => {
      // Long paragraph without double newlines, but sentence endings
      const text = 'This is sentence one. This is sentence two. This is sentence three.';
      // Target 25 chars forces sentences to split
      const chunks = service.chunkText(text, 25, 5);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(c => {
        expect(c.length).toBeLessThanOrEqual(50); // should stay reasonably small
      });
    });

    it('should carry overlap characters from the previous chunk to the next', () => {
      const text = 'This is paragraph number one. It is long.\n\nThis is paragraph number two. It is also long.';
      const overlapSize = 15;
      const chunks = service.chunkText(text, 40, overlapSize);
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // The second chunk must start with the end portion of the first chunk
      const firstChunk = chunks[0];
      const secondChunk = chunks[1];
      
      // Grab overlap slice from first chunk
      const expectedOverlap = firstChunk.substring(firstChunk.length - overlapSize).trim();
      // Second chunk should contain the overlap
      expect(secondChunk.toLowerCase()).toContain(expectedOverlap.toLowerCase());
    });
  });

  describe('generateEmbeddings', () => {
    it('should return 384 dimensional vectors for input texts', async () => {
      const result = await service.generateEmbeddings(['hello', 'world']);
      expect(result.length).toBe(2);
      expect(result[0].length).toBe(384);
      expect(result[0][0]).toBe(0.15);
    });
  });
});
