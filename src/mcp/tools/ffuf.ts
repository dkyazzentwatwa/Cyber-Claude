/**
 * FFUF MCP Adapter
 * Fast web fuzzing for directory/file/parameter discovery
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface FFUFScanOptions {
  target: string;
  wordlist?: string;  // Wordlist to use (default: common.txt)
  mode?: 'dir' | 'file' | 'vhost' | 'param' | 'get' | 'post';  // Fuzzing mode
  extensions?: string[];  // File extensions (e.g., ['php', 'html', 'txt'])
  matchCodes?: number[];  // HTTP status codes to match (default: [200, 204, 301, 302, 307, 401, 403])
  filterSize?: number[];  // Filter responses by size
  threads?: number;  // Number of threads (default: 40)
  timeout?: number;  // Request timeout in seconds
  recursion?: boolean;  // Enable recursive fuzzing
  recursionDepth?: number;  // Max recursion depth
  delay?: number;  // Delay between requests (ms)
}

export interface FFUFResult {
  url: string;
  status: number;
  length: number;
  words: number;
  lines: number;
  redirectLocation?: string;
  position?: number;
}

export interface FFUFScanResult {
  success: boolean;
  results: FFUFResult[];
  summary: {
    total: number;
    statusCodes: Record<number, number>;
    totalRequests: number;
    duration?: number;
  };
  scannedTarget: string;
  mode: string;
  error?: string;
}

/**
 * FFUF MCP Tool Adapter
 */
export class FFUFMCP {
  /**
   * Run FFUF web fuzzing scan
   */
  static async scan(options: FFUFScanOptions): Promise<FFUFScanResult> {
    const config = getMCPServer('ffuf');
    if (!config || !config.enabled) {
      throw new Error('FFUF MCP server is not enabled. Set MCP_FFUF_ENABLED=true');
    }

    try {
      logger.info(`Running FFUF scan on ${options.target} in ${options.mode || 'dir'} mode`);

      const result = await callMCPTool(config, 'fuzz', {
        target: options.target,
        wordlist: options.wordlist || 'common',
        mode: options.mode || 'dir',
        extensions: options.extensions || [],
        'match-codes': options.matchCodes || [200, 204, 301, 302, 307, 401, 403],
        'filter-size': options.filterSize || [],
        threads: options.threads || 40,
        timeout: options.timeout || 10,
        recursion: options.recursion || false,
        'recursion-depth': options.recursionDepth || 1,
        delay: options.delay || 0,
      });

      return this.parseFFUFResult(result, options.target, options.mode || 'dir');
    } catch (error: any) {
      logger.error('FFUF scan failed:', error);
      return {
        success: false,
        results: [],
        summary: { total: 0, statusCodes: {}, totalRequests: 0 },
        scannedTarget: options.target,
        mode: options.mode || 'dir',
        error: error.message,
      };
    }
  }

  /**
   * Parse FFUF MCP result
   */
  private static parseFFUFResult(result: any, target: string, mode: string): FFUFScanResult {
    const results: FFUFResult[] = [];
    let totalRequests = 0;
    let duration: number | undefined;

    // Parse MCP result content
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);

            if (parsed.results && Array.isArray(parsed.results)) {
              results.push(...parsed.results);
            }

            if (parsed.totalRequests) {
              totalRequests = parsed.totalRequests;
            }

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

    // Calculate status code distribution
    const statusCodes: Record<number, number> = {};
    for (const res of results) {
      statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;
    }

    return {
      success: !result.isError,
      results,
      summary: {
        total: results.length,
        statusCodes,
        totalRequests,
        duration,
      },
      scannedTarget: target,
      mode,
    };
  }

  /**
   * Directory fuzzing
   */
  static async fuzzDirectories(target: string, wordlist?: string): Promise<FFUFScanResult> {
    return this.scan({
      target,
      wordlist,
      mode: 'dir',
    });
  }

  /**
   * File fuzzing
   */
  static async fuzzFiles(
    target: string,
    extensions: string[],
    wordlist?: string
  ): Promise<FFUFScanResult> {
    return this.scan({
      target,
      wordlist,
      mode: 'file',
      extensions,
    });
  }

  /**
   * Parameter fuzzing (GET)
   */
  static async fuzzParameters(target: string, wordlist?: string): Promise<FFUFScanResult> {
    return this.scan({
      target,
      wordlist,
      mode: 'get',
    });
  }

  /**
   * Virtual host fuzzing
   */
  static async fuzzVHosts(target: string, wordlist?: string): Promise<FFUFScanResult> {
    return this.scan({
      target,
      wordlist,
      mode: 'vhost',
    });
  }

  /**
   * Check if FFUF is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('ffuf');
    return config !== undefined && config.enabled;
  }
}
