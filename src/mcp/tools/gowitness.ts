/**
 * Gowitness MCP Adapter
 * Web screenshot capture and visual reconnaissance
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface GowitnessScanOptions {
  targets: string[];  // URLs or file with URLs
  timeout?: number;  // Page load timeout (seconds)
  delay?: number;  // Delay before screenshot (ms)
  resolution?: string;  // Screenshot resolution (e.g., "1440,900")
  fullPage?: boolean;  // Capture full page
  userAgent?: string;  // Custom user agent
  threads?: number;  // Number of threads
  screenshotPath?: string;  // Path to save screenshots
  outputFormat?: 'json' | 'csv';  // Output format
}

export interface GowitnessScreenshot {
  url: string;
  finalURL: string;  // After redirects
  title: string;
  statusCode: number;
  contentLength: number;
  headers: Record<string, string>;
  technologies?: string[];  // Detected technologies
  screenshot: string;  // Base64 encoded or file path
  timestamp: string;
  responseTime: number;  // milliseconds
  ssl?: {
    valid: boolean;
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
  };
}

export interface GowitnessScanResult {
  success: boolean;
  screenshots: GowitnessScreenshot[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    redirects: number;
    statusCodes: Record<number, number>;
  };
  errors: Array<{ url: string; error: string }>;
  duration?: number;
  error?: string;
}

/**
 * Gowitness MCP Tool Adapter
 */
export class GowitnessMCP {
  /**
   * Run Gowitness screenshot scan
   */
  static async scan(options: GowitnessScanOptions): Promise<GowitnessScanResult> {
    const config = getMCPServer('gowitness');
    if (!config || !config.enabled) {
      throw new Error('Gowitness MCP server is not enabled. Set MCP_GOWITNESS_ENABLED=true');
    }

    try {
      logger.info(`Running Gowitness scan on ${options.targets.length} target(s)`);

      const result = await callMCPTool(config, 'screenshot', {
        targets: options.targets,
        timeout: options.timeout || 10,
        delay: options.delay || 0,
        resolution: options.resolution || '1440,900',
        'full-page': options.fullPage || false,
        'user-agent': options.userAgent,
        threads: options.threads || 4,
        'screenshot-path': options.screenshotPath,
        'output-format': options.outputFormat || 'json',
      });

      return this.parseGowitnessResult(result);
    } catch (error: any) {
      logger.error('Gowitness scan failed:', error);
      return {
        success: false,
        screenshots: [],
        summary: { total: 0, successful: 0, failed: 0, redirects: 0, statusCodes: {} },
        errors: [],
        error: error.message,
      };
    }
  }

  /**
   * Parse Gowitness MCP result
   */
  private static parseGowitnessResult(result: any): GowitnessScanResult {
    const screenshots: GowitnessScreenshot[] = [];
    const errors: Array<{ url: string; error: string }> = [];
    let duration: number | undefined;

    // Parse MCP result content
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);

            // Screenshots
            if (parsed.screenshots && Array.isArray(parsed.screenshots)) {
              screenshots.push(...parsed.screenshots);
            }

            // Errors
            if (parsed.errors && Array.isArray(parsed.errors)) {
              errors.push(...parsed.errors);
            }

            // Duration
            if (parsed.duration) {
              duration = parsed.duration;
            }
          } catch {
            // Not JSON, might be summary text
            continue;
          }
        }
      }
    }

    // Calculate summary
    const statusCodes: Record<number, number> = {};
    let redirects = 0;

    for (const screenshot of screenshots) {
      statusCodes[screenshot.statusCode] = (statusCodes[screenshot.statusCode] || 0) + 1;
      if (screenshot.url !== screenshot.finalURL) {
        redirects++;
      }
    }

    return {
      success: !result.isError,
      screenshots,
      summary: {
        total: screenshots.length + errors.length,
        successful: screenshots.length,
        failed: errors.length,
        redirects,
        statusCodes,
      },
      errors,
      duration,
    };
  }

  /**
   * Screenshot single URL
   */
  static async screenshotURL(url: string, fullPage = false): Promise<GowitnessScanResult> {
    return this.scan({
      targets: [url],
      fullPage,
    });
  }

  /**
   * Screenshot multiple URLs
   */
  static async screenshotMultiple(
    urls: string[],
    options?: Partial<GowitnessScanOptions>
  ): Promise<GowitnessScanResult> {
    return this.scan({
      targets: urls,
      ...options,
    });
  }

  /**
   * Screenshot URLs from file
   */
  static async screenshotFromFile(
    filePath: string,
    options?: Partial<GowitnessScanOptions>
  ): Promise<GowitnessScanResult> {
    return this.scan({
      targets: [filePath],  // MCP server will read the file
      ...options,
    });
  }

  /**
   * Generate report from screenshots
   */
  static async generateReport(screenshotPath: string): Promise<any> {
    const config = getMCPServer('gowitness');
    if (!config || !config.enabled) {
      return null;
    }

    try {
      const result = await callMCPTool(config, 'report', {
        'screenshot-path': screenshotPath,
      });

      if (result.content && result.content[0]?.text) {
        return JSON.parse(result.content[0].text);
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to generate Gowitness report:', error);
      return null;
    }
  }

  /**
   * Check if Gowitness is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('gowitness');
    return config !== undefined && config.enabled;
  }
}
