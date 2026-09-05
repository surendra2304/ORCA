import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { ReadabilityCleaner } from '../clean/readability-cleaner';
import { ExtractedDocument } from '../types/document';

@Injectable()
export class ContentExtractor {
  private readonly logger = new Logger(ContentExtractor.name);
  constructor(private readonly cleaner: ReadabilityCleaner) {}

  async extractPageContent(page: Page, url: string): Promise<ExtractedDocument> {
    // Click hidden elements before extracting HTML
    await page.evaluate(async () => {
      const keywords = ['load more', 'read more', 'show more', 'expand', 'view all'];
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      let clicked = false;

      for (const btn of buttons) {
        const text = (btn.textContent || '').toLowerCase();
        if (keywords.some(k => text.includes(k))) {
          try {
            (btn as HTMLElement).click();
            clicked = true;
          } catch (e) {}
        }
      }

      if (clicked) {
        // Wait a bit for DOM to update
        await new Promise(r => setTimeout(r, 1000));
      }
    });

    const html = await page.content();
    const cleaned = this.cleaner.cleanHtml(html, url);
    const language = await page.evaluate(() => document.documentElement.lang || 'en');

    return {
      url,
      title: cleaned.title,
      content: cleaned.content,
      metadata: { description: cleaned.excerpt, language },
    };
  }

  async extractLinks(page: Page, baseUrlString: string): Promise<string[]> {
    const baseUrl = new URL(baseUrlString);
    
    const hrefs = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.map(a => a.href).filter(href => href && href.startsWith('http'));
    });

    const internalLinks = new Set<string>();

    for (const href of hrefs) {
      try {
        const url = new URL(href);
        // Only keep links on the same host, ignore anchors/hashes
        if (url.host === baseUrl.host) {
          url.hash = '';
          internalLinks.add(url.toString());
        }
      } catch (err) {
        // Ignore invalid URLs
      }
    }

    return Array.from(internalLinks);
  }
}
