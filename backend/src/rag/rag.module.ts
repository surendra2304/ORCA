import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagService } from './rag.service';

@Module({
  imports: [ConfigModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
