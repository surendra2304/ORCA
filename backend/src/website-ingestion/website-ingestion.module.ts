import { Module } from '@nestjs/common';
import { WebsiteIngestionService } from './website-ingestion.service';
import { BrowserManager } from './browser/browser-manager';
import { ReadabilityCleaner } from './clean/readability-cleaner';
import { ContentExtractor } from './extract/content-extractor';

@Module({
  providers: [WebsiteIngestionService, BrowserManager, ReadabilityCleaner, ContentExtractor],
  exports: [WebsiteIngestionService],
})
export class WebsiteIngestionModule {}
