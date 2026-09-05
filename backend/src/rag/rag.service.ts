import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private embeddingModel: any = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initModel();
  }

  private async initModel() {
    if (this.embeddingModel) return;
    try {
      this.logger.log('Initializing fastembed model...');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { FlagEmbedding, EmbeddingModel } = require('fastembed');
      this.embeddingModel = await FlagEmbedding.init({
        model: EmbeddingModel.BGESmallENV15,
      });
      this.logger.log('fastembed BAAI/bge-small-en-v1.5 model initialized successfully.');
    } catch (err: any) {
      this.logger.error('Failed to initialize fastembed model:', err);
    }
  }

  private async getModel() {
    if (!this.embeddingModel) {
      await this.initModel();
    }
    return this.embeddingModel;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    const model = await this.getModel();
    const embeddings: number[][] = [];
    for await (const batch of model.embed(texts, 16)) {
      for (const emb of batch) {
        embeddings.push(Array.from(emb));
      }
    }
    return embeddings;
  }

  async generateQueryEmbedding(text: string): Promise<number[]> {
    const model = await this.getModel();
    return await model.queryEmbed(text);
  }

  /**
   * Split text into chunks of approximately target characters,
   * carrying overlap characters from the previous chunk.
   */
  chunkText(text: string, target = 900, overlap = 120): string[] {
    if (!text || !text.trim()) return [];

    // 1. Normalize line endings and whitespace per line while preserving structural line breaks
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    // 2. Break into logical blocks (double newlines or single newlines)
    const rawBlocks = normalizedText.includes('\n\n')
      ? normalizedText.split(/\n\n+/)
      : normalizedText.split(/\n+/);

    // 3. Sub-segment any block exceeding `target` into smaller semantic units
    const atomicUnits: string[] = [];

    for (const block of rawBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      if (trimmedBlock.length <= target) {
        atomicUnits.push(trimmedBlock);
      } else {
        // Try splitting by sentence boundaries or newlines
        const sentences = trimmedBlock
          .split(/(?<=[.!?\n])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

        for (const sentence of sentences) {
          if (sentence.length <= target) {
            atomicUnits.push(sentence);
          } else {
            // Long sentence or continuous text without terminal punctuation: split by word boundaries
            const words = sentence.split(/\s+/);
            let currentWordPiece = '';

            for (const word of words) {
              if (
                currentWordPiece.length +
                  (currentWordPiece ? 1 : 0) +
                  word.length <=
                target
              ) {
                currentWordPiece = currentWordPiece
                  ? currentWordPiece + ' ' + word
                  : word;
              } else {
                if (currentWordPiece) atomicUnits.push(currentWordPiece);
                if (word.length > target) {
                  for (let i = 0; i < word.length; i += target) {
                    atomicUnits.push(word.substring(i, i + target));
                  }
                  currentWordPiece = '';
                } else {
                  currentWordPiece = word;
                }
              }
            }
            if (currentWordPiece) {
              atomicUnits.push(currentWordPiece);
            }
          }
        }
      }
    }

    // 4. Assemble atomic units into chunks with overlap
    const chunks: string[] = [];
    let currentChunk = '';

    for (const unit of atomicUnits) {
      if (!unit) continue;

      if (
        currentChunk.length + (currentChunk ? 2 : 0) + unit.length <=
        target
      ) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + unit : unit;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }

        // Calculate overlap to carry over from the end of the previously pushed chunk
        let carriedOverlap = '';
        if (chunks.length > 0) {
          const prevChunk = chunks[chunks.length - 1];
          const maxOverlap = Math.max(0, target - unit.length - 2);
          const actualOverlap = Math.min(overlap, maxOverlap);
          if (actualOverlap > 0) {
            carriedOverlap = prevChunk
              .substring(prevChunk.length - actualOverlap)
              .trim();
          }
        }

        currentChunk = carriedOverlap ? carriedOverlap + '\n\n' + unit : unit;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((c) => c.length > 0);
  }
}
