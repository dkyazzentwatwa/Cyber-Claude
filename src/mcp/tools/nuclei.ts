/**
 * Nuclei MCP Adapter
 * Vulnerability scanning with 5000+ templates
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface NucleiScanOptions {
  target: string;
  templates?: string[];  // e.g., ['cves', 'owasp', 'vulnerabilities']
  severity?: string[];   // e.g., ['critical', 'high', 'medium', 'low', 'info']
  tags?: string[];
  excludeTags?: string[];
  rateLimit?: number;    // requests per second
  timeout?: number;      // seconds
}

export interface NucleiVulnerability {
  template: string;
  templateID: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  host: string;
  matchedAt: string;
  extractedResults?: string[];
  curlCommand?: string;
  tags: string[];
  description?: string;
  reference?: string[];
  cve?: string[];
  cwe?: string[];
}

export interface NucleiScanResult {
  success: boolean;
  vulnerabilities: NucleiVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scannedTarget: string;
  duration?: number;
  error?: string;
}

/**
 * Nuclei MCP Tool Adapter
 */
export class NucleiMCP {
  /**
   * Run Nuclei vulnerability scan
   */
  static async scan(options: NucleiScanOptions): Promise<NucleiScanResult> {
    const config = getMCPServer('nuclei');
    if (!config || !config.enabled) {
      throw new Error('Nuclei MCP server is not enabled. Set MCP_NUCLEI_ENABLED=true');
    }

    try {
      logger.info(`Running Nuclei scan on ${options.target}`);

      const result = await callMCPTool(config, 'scan', {
        target: options.target,
        templates: options.templates || ['cves', 'vulnerabilities'],
        severity: options.severity || ['critical', 'high', 'medium'],
        tags: options.tags,
        'exclude-tags': options.excludeTags,
        'rate-limit': options.rateLimit || 150,
        timeout: options.timeout || 30,
      });

      return this.parseNucleiResult(result, options.target);
    } catch (error: any) {
      logger.error('Nuclei scan failed:', error);
      return {
        success: false,
        vulnerabilities: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        scannedTarget: options.target,
        error: error.message,
      };
    }
  }

  /**
   * Parse Nuclei MCP result
   */
  private static parseNucleiResult(result: any, target: string): NucleiScanResult {
    const vulnerabilities: NucleiVulnerability[] = [];

    // Parse MCP result content
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);
            if (Array.isArray(parsed)) {
              vulnerabilities.push(...parsed);
            } else if (parsed.template) {
              vulnerabilities.push(parsed);
            }
          } catch {
            // Not JSON, might be summary text
            continue;
          }
        }
      }
    }

    // Calculate summary
    const summary = {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
    };

    return {
      success: !result.isError,
      vulnerabilities,
      summary,
      scannedTarget: target,
    };
  }

  /**
   * List available Nuclei templates
   */
  static async listTemplates(): Promise<string[]> {
    const config = getMCPServer('nuclei');
    if (!config || !config.enabled) {
      return [];
    }

    try {
      const result = await callMCPTool(config, 'list-templates', {});

      if (result.content && result.content[0]?.text) {
        return JSON.parse(result.content[0].text);
      }

      return [];
    } catch (error: any) {
      logger.error('Failed to list Nuclei templates:', error);
      return [];
    }
  }

  /**
   * Check if Nuclei is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('nuclei');
    return config !== undefined && config.enabled;
  }
}