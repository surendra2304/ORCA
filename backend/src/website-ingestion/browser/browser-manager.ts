import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

@Injectable()
export class BrowserManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserManager.name);
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async onModuleInit() {
    this.logger.log('Initializing Playwright Chromium browser...');
    try {
      await this.ensureBrowser();
      this.logger.log('Playwright Chromium browser initialized successfully.');
    } catch (err: any) {
      this.logger.warn(`Deferred browser initialization: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  private async ensureBrowser(): Promise<BrowserContext> {
    if (this.context && this.browser && this.browser.isConnected()) {
      return this.context;
    }
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 KaliGanBot/1.0',
        viewport: { width: 1280, height: 800 },
      });
      return this.context;
    } catch (err: any) {
      this.logger.error(`Failed to launch browser: ${err?.message || err}`);
      throw new Error(`Browser service unavailable: ${err?.message || err}`);
    }
  }

  async newPage(): Promise<Page> {
    const context = await this.ensureBrowser();
    return await context.newPage();
  }

  async getInteractiveBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
    this.logger.log('Launching Interactive Browser for Authentication...');
    const interactiveBrowser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const interactiveContext = await interactiveBrowser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 KaliGanBot/1.0',
      viewport: { width: 1280, height: 800 },
    });
    return { browser: interactiveBrowser, context: interactiveContext };
  }
}
