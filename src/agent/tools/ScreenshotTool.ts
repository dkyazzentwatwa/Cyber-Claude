/**
 * Website Screenshot Tool using Puppeteer
 * Captures screenshots and performs visual reconnaissance
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

export interface ScreenshotOptions {
  url: string;
  outputPath?: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  detectTechnologies?: boolean;
}

export interface ScreenshotResult {
  success: boolean;
  url: string;
  screenshotPath?: string;
  screenshotData?: Buffer;
  pageTitle?: string;
  finalUrl?: string;
  statusCode?: number;
  technologies?: string[];
  metadata: {
    width: number;
    height: number;
    fullPage: boolean;
    timestamp: Date;
  };
  error?: string;
}

export class ScreenshotTool {
  private static browser: Browser | null = null;

  /**
   * Take a screenshot of a website
   */
  static async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      logger.info(`Capturing screenshot of ${options.url}`);

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      page = await browser.newPage();

      // Set viewport
      const width = options.width || 1920;
      const height = options.height || 1080;
      await page.setViewport({ width, height });

      // Set timeout
      const timeout = options.timeout || 30000;
      page.setDefaultTimeout(timeout);

      // Navigate to URL
      const response = await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle2',
        timeout,
      });

      // Get page metadata
      const pageTitle = await page.title();
      const finalUrl = page.url();
      const statusCode = response?.status();

      // Detect technologies (if requested)
      let technologies: string[] = [];
      if (options.detectTechnologies) {
        technologies = await this.detectTechnologies(page);
      }

      // Take screenshot
      const screenshotBuffer = await page.screenshot({
        fullPage: options.fullPage !== false,
        type: 'png',
      });

      // Convert to Buffer
      const buffer = Buffer.from(screenshotBuffer);

      // Save to file if path specified
      let screenshotPath: string | undefined;
      if (options.outputPath) {
        screenshotPath = await this.saveScreenshot(buffer, options.outputPath);
      }

      await browser.close();

      const result: ScreenshotResult = {
        success: true,
        url: options.url,
        screenshotPath,
        screenshotData: buffer,
        pageTitle,
        finalUrl,
        statusCode,
        technologies,
        metadata: {
          width,
          height,
          fullPage: options.fullPage !== false,
          timestamp: new Date(),
        },
      };

      logger.info(`Screenshot captured successfully for ${options.url}`);
      return result;

    } catch (error: any) {
      logger.error(`Screenshot capture failed for ${options.url}:`, error);

      if (browser) {
        await browser.close().catch(() => {});
      }

      return {
        success: false,
        url: options.url,
        metadata: {
          width: options.width || 1920,
          height: options.height || 1080,
          fullPage: options.fullPage !== false,
          timestamp: new Date(),
        },
        error: error.message,
      };
    }
  }

  /**
   * Capture screenshots of multiple URLs
   */
  static async captureBatch(
    urls: string[],
    options: Omit<ScreenshotOptions, 'url'> = {}
  ): Promise<ScreenshotResult[]> {
    const results: ScreenshotResult[] = [];

    for (const url of urls) {
      const result = await this.capture({ ...options, url });
      results.push(result);
    }

    return results;
  }

  /**
   * Detect technologies used on the page
   */
  private static async detectTechnologies(page: Page): Promise<string[]> {
    try {
      const technologies = await page.evaluate(() => {
        const techs: string[] = [];

        // @ts-ignore - These globals exist in browser context
        const win = window;
        // @ts-ignore - document exists in browser context
        const doc = document;

        // Check for common frameworks/libraries
        const checks = {
          'React': () => !!(win as any).React || doc.querySelector('[data-reactroot]'),
          'Vue.js': () => !!(win as any).Vue || doc.querySelector('[data-v-]'),
          'Angular': () => !!(win as any).ng || doc.querySelector('[ng-version]'),
          'jQuery': () => !!(win as any).jQuery || !!(win as any).$,
          'WordPress': () => !!doc.querySelector('meta[name="generator"][content*="WordPress"]'),
          'Bootstrap': () => !!doc.querySelector('link[href*="bootstrap"]'),
          'Tailwind CSS': () => !!doc.querySelector('script[src*="tailwind"]'),
          'Next.js': () => !!(win as any).__NEXT_DATA__,
          'Gatsby': () => !!(win as any).___gatsby,
          'Svelte': () => !!doc.querySelector('[class*="svelte-"]'),
        };

        for (const [name, check] of Object.entries(checks)) {
          try {
            if (check()) {
              techs.push(name);
            }
          } catch {}
        }

        return techs;
      });

      return technologies;
    } catch {
      return [];
    }
  }

  /**
   * Save screenshot to file
   */
  private static async saveScreenshot(buffer: Buffer, outputPath: string): Promise<string> {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Ensure .png extension
    let finalPath = outputPath;
    if (!finalPath.endsWith('.png')) {
      finalPath += '.png';
    }

    await writeFile(finalPath, buffer);
    logger.info(`Screenshot saved to ${finalPath}`);

    return finalPath;
  }

  /**
   * Format screenshot results as human-readable text
   */
  static formatResults(result: ScreenshotResult): string {
    const lines: string[] = [];

    lines.push(`\n📸 Website Screenshot Results`);
    lines.push(`🌐 URL: ${result.url}`);
    lines.push(`📅 Captured: ${result.metadata.timestamp.toLocaleString()}\n`);

    if (!result.success) {
      lines.push(`❌ Screenshot Failed: ${result.error}\n`);
      return lines.join('\n');
    }

    // Page Information
    lines.push(`📋 Page Information:`);
    if (result.pageTitle) {
      lines.push(`   Title: ${result.pageTitle}`);
    }
    if (result.finalUrl && result.finalUrl !== result.url) {
      lines.push(`   Final URL: ${result.finalUrl}`);
    }
    if (result.statusCode) {
      const statusIcon = result.statusCode === 200 ? '✅' : '⚠️';
      lines.push(`   ${statusIcon} Status Code: ${result.statusCode}`);
    }

    // Screenshot Details
    lines.push(`\n📐 Screenshot Details:`);
    lines.push(`   Resolution: ${result.metadata.width}x${result.metadata.height}`);
    lines.push(`   Full Page: ${result.metadata.fullPage ? 'Yes' : 'No'}`);

    if (result.screenshotPath) {
      lines.push(`   📁 Saved to: ${result.screenshotPath}`);
    }

    if (result.screenshotData) {
      const sizeKB = (result.screenshotData.length / 1024).toFixed(2);
      lines.push(`   📊 Size: ${sizeKB} KB`);
    }

    // Detected Technologies
    if (result.technologies && result.technologies.length > 0) {
      lines.push(`\n🔧 Detected Technologies:`);
      for (const tech of result.technologies) {
        lines.push(`   • ${tech}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Check if Puppeteer is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const browser = await puppeteer.launch({ headless: true });
      await browser.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate default output path
   */
  static generateOutputPath(url: string, baseDir: string = './screenshots'): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/\./g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      return path.join(baseDir, `${hostname}_${timestamp}.png`);
    } catch {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      return path.join(baseDir, `screenshot_${timestamp}.png`);
    }
  }
}
