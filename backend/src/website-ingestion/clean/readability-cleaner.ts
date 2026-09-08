import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

@Injectable()
export class ReadabilityCleaner {
  private readonly logger = new Logger(ReadabilityCleaner.name);

  cleanHtml(html: string, url: string): { title: string; content: string; excerpt?: string } {
    try {
      const doc = new JSDOM(html, { url });
      const reader = new Readability(doc.window.document);
      const article = reader.parse();

      if (!article) throw new Error('Readability could not parse the content.');

      const cleanDoc = new JSDOM(article.content || '');
      const textContent = cleanDoc.window.document.body.textContent || '';
      const finalCleanText = textContent.replace(/\s+/g, ' ').trim();

      return {
        title: article.title || 'Unknown Title',
        content: finalCleanText,
        excerpt: article.excerpt || undefined,
      };
    } catch (err) {
      this.logger.warn(`Failed to clean HTML for ${url}: ${err.message}`);
      return { title: 'Unknown Title', content: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() };
    }
  }
}
