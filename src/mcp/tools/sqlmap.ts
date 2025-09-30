/**
 * SQLmap MCP Adapter
 * SQL injection detection and testing
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface SQLmapScanOptions {
  url: string;
  method?: 'GET' | 'POST';
  data?: string;  // POST data
  cookie?: string;
  headers?: Record<string, string>;
  testParameter?: string;  // Specific parameter to test
  level?: 1 | 2 | 3 | 4 | 5;  // Test level (higher = more tests)
  risk?: 1 | 2 | 3;  // Risk level (higher = more dangerous tests)
  dbms?: string;  // Target DBMS if known
  technique?: string;  // SQL injection techniques to use
  timeout?: number;
}

export interface SQLInjection {
  parameter: string;
  type: string;  // e.g., "boolean-based blind", "time-based blind", "error-based"
  title: string;
  payload: string;
  dbms: string;
  evidence?: string;
}

export interface DatabaseInfo {
  dbms: string;
  version: string;
  user: string;
  database: string;
  hostname?: string;
}

export interface SQLmapScanResult {
  success: boolean;
  vulnerable: boolean;
  url: string;

  // Vulnerabilities found
  injections: SQLInjection[];

  // Database information (if accessible)
  databaseInfo?: DatabaseInfo;

  // Severity assessment
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';

  // Recommendations
  recommendations: string[];

  error?: string;
}

/**
 * SQLmap MCP Tool Adapter
 */
export class SQLmapMCP {
  /**
   * Run SQLmap SQL injection scan
   */
  static async scan(options: SQLmapScanOptions): Promise<SQLmapScanResult> {
    const config = getMCPServer('sqlmap');
    if (!config || !config.enabled) {
      throw new Error('SQLmap MCP server is not enabled. Set MCP_SQLMAP_ENABLED=true');
    }

    try {
      logger.info(`Running SQLmap scan on ${options.url}`);

      const result = await callMCPTool(config, 'scan', {
        url: options.url,
        method: options.method || 'GET',
        data: options.data,
        cookie: options.cookie,
        headers: options.headers,
        'test-parameter': options.testParameter,
        level: options.level || 1,
        risk: options.risk || 1,
        dbms: options.dbms,
        technique: options.technique,
        timeout: options.timeout || 300,
      });

      return this.parseSQLmapResult(result, options.url);
    } catch (error: any) {
      logger.error('SQLmap scan failed:', error);
      return {
        success: false,
        vulnerable: false,
        url: options.url,
        injections: [],
        severity: 'none',
        recommendations: [],
        error: error.message,
      };
    }
  }

  /**
   * Parse SQLmap MCP result
   */
  private static parseSQLmapResult(result: any, url: string): SQLmapScanResult {
    let data: any = {};

    if (result.content && result.content[0]?.text) {
      try {
        data = JSON.parse(result.content[0].text);
      } catch {
        // Failed to parse
      }
    }

    const injections: SQLInjection[] = (data.injections || []).map((inj: any) => ({
      parameter: inj.parameter,
      type: inj.type,
      title: inj.title,
      payload: inj.payload,
      dbms: inj.dbms || 'Unknown',
      evidence: inj.evidence,
    }));

    const vulnerable = injections.length > 0;

    // Determine severity
    let severity: SQLmapScanResult['severity'] = 'none';
    if (vulnerable) {
      // If we can extract data or have multiple injection points, it's critical
      if (data.databaseInfo || injections.length > 2) {
        severity = 'critical';
      } else if (injections.some((i: any) => i.type.includes('UNION'))) {
        // UNION-based is typically easier to exploit
        severity = 'critical';
      } else if (injections.some((i: any) => i.type.includes('error-based'))) {
        severity = 'high';
      } else {
        // Blind injections
        severity = 'high';
      }
    }

    // Database info
    const databaseInfo = data.databaseInfo ? {
      dbms: data.databaseInfo.dbms,
      version: data.databaseInfo.version,
      user: data.databaseInfo.user,
      database: data.databaseInfo.database,
      hostname: data.databaseInfo.hostname,
    } : undefined;

    // Generate recommendations
    const recommendations = this.generateRecommendations(injections, databaseInfo);

    return {
      success: !result.isError,
      vulnerable,
      url,
      injections,
      databaseInfo,
      severity,
      recommendations,
    };
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    injections: SQLInjection[],
    databaseInfo?: DatabaseInfo
  ): string[] {
    const recommendations: string[] = [];

    if (injections.length === 0) {
      return ['No SQL injection vulnerabilities detected'];
    }

    recommendations.push('CRITICAL: SQL injection vulnerability detected');
    recommendations.push('Use parameterized queries (prepared statements)');
    recommendations.push('Implement input validation and sanitization');
    recommendations.push('Apply principle of least privilege to database accounts');
    recommendations.push('Use Web Application Firewall (WAF)');

    if (databaseInfo) {
      recommendations.push('Database credentials were accessible - review access controls immediately');
    }

    if (injections.some(i => i.type.includes('UNION'))) {
      recommendations.push('UNION-based injection allows direct data extraction');
    }

    return recommendations;
  }

  /**
   * Test a single parameter for SQL injection
   */
  static async testParameter(
    url: string,
    parameter: string,
    options?: Partial<SQLmapScanOptions>
  ): Promise<SQLmapScanResult> {
    return this.scan({
      url,
      testParameter: parameter,
      ...options,
    });
  }

  /**
   * Check if SQLmap is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('sqlmap');
    return config !== undefined && config.enabled;
  }
}