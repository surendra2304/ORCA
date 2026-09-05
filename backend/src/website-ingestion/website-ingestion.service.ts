import { Injectable, Logger } from '@nestjs/common';
import { BrowserManager } from './browser/browser-manager';
import { ContentExtractor } from './extract/content-extractor';
import { ExtractedDocument } from './types/document';
import { Page } from 'playwright';

@Injectable()
export class WebsiteIngestionService {
  private readonly logger = new Logger(WebsiteIngestionService.name);

  constructor(
    private readonly browserManager: BrowserManager,
    private readonly contentExtractor: ContentExtractor,
  ) {}

  async crawl(url: string, maxPages = 20, concurrency = 3, interactive = false): Promise<ExtractedDocument[]> {
    const documents: ExtractedDocument[] = [];
    const visited = new Set<string>();
    const queue: string[] = [url];

    let customBrowser: any = null;
    let customContext: any = null;

    if (interactive) {
      const interactiveSession = await this.browserManager.getInteractiveBrowser();
      customBrowser = interactiveSession.browser;
      customContext = interactiveSession.context;
      
      this.logger.log('Interactive mode enabled. Opening browser for login...');
      const loginPage = await customContext.newPage();
      await loginPage.goto(url);
      this.logger.log('You have 60 seconds to log in and pass 2FA...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      await loginPage.close();
      this.logger.log('60 seconds passed! Starting automated crawl on the authenticated session.');
    }

    while (queue.length > 0 && visited.size < maxPages) {
      // Dequeue a batch up to concurrency limit
      const batch: string[] = [];
      while (queue.length > 0 && batch.length < concurrency && visited.size + batch.length < maxPages) {
        const nextUrl = queue.shift();
        if (nextUrl && !visited.has(nextUrl)) {
          visited.add(nextUrl);
          batch.push(nextUrl);
        }
      }

      if (batch.length === 0) break;

      const promises = batch.map(async (targetUrl) => {
        let page: Page | null = null;
        try {
          this.logger.log(`Crawling: ${targetUrl}`);
          page = customContext ? await customContext.newPage() : await this.browserManager.newPage();
          if (!page) throw new Error('Failed to create browser page');
          await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
          
          const document = await this.contentExtractor.extractPageContent(page, targetUrl);
          documents.push(document);

          // Find more links if we haven't reached the limit yet
          if (visited.size < maxPages) {
            const newLinks = await this.contentExtractor.extractLinks(page, url);
            for (const link of newLinks) {
              if (!visited.has(link) && !queue.includes(link)) {
                queue.push(link);
              }
            }
          }
        } catch (err: any) {
          this.logger.warn(`Failed to crawl ${targetUrl}: ${err.message}`);
        } finally {
          if (page) await page.close().catch(e => this.logger.warn(`Failed to close page: ${e.message}`));
        }
      });

      await Promise.all(promises);
    }

    if (customBrowser) {
      await customBrowser.close().catch((e: any) => this.logger.warn(`Failed to close interactive browser: ${e.message}`));
    }

    if (documents.length === 0) {
      throw new Error(`Crawler could not extract any content from ${url}`);
    }

    this.logger.log(`Crawling complete. Extracted ${documents.length} pages from ${url}`);
    return documents;
  }
}
