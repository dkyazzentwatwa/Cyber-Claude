/**
 * WPScan MCP Adapter
 * WordPress vulnerability scanner
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface WPScanOptions {
  target: string;  // WordPress site URL
  enumerate?: string[];  // What to enumerate: ['vp', 'vt', 'u', 'p'] (vulnerable plugins, themes, users, plugins)
  apiToken?: string;  // WPScan API token for vulnerability data
  stealthy?: boolean;  // Use stealthy mode
  randomUserAgent?: boolean;  // Use random user agent
  plugins?: boolean;  // Detect plugins
  themes?: boolean;  // Detect themes
  users?: boolean;  // Enumerate users
  timeout?: number;  // Request timeout (seconds)
  threads?: number;  // Number of threads
}

export interface WPScanVulnerability {
  title: string;
  references: {
    url: string[];
    cve?: string[];
    wpvulndb?: string[];
  };
  cvss?: number;
  fixed_in?: string;
}

export interface WPScanPlugin {
  slug: string;
  version?: string;
  latest_version?: string;
  outdated: boolean;
  vulnerabilities: WPScanVulnerability[];
  location: string;
}

export interface WPScanTheme {
  slug: string;
  version?: string;
  latest_version?: string;
  outdated: boolean;
  vulnerabilities: WPScanVulnerability[];
  location: string;
  style_name?: string;
}

export interface WPScanUser {
  id: number;
  username: string;
  found_by: string;
}

export interface WPScanResult {
  success: boolean;
  target: string;
  wordpressVersion?: {
    number: string;
    release_date?: string;
    status: 'insecure' | 'latest' | 'outdated';
    vulnerabilities: WPScanVulnerability[];
  };
  plugins: WPScanPlugin[];
  themes: WPScanTheme[];
  users: WPScanUser[];
  vulnerabilities: {
    wordpress: WPScanVulnerability[];
    plugins: WPScanVulnerability[];
    themes: WPScanVulnerability[];
  };
  summary: {
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    outdatedPlugins: number;
    outdatedThemes: number;
    totalUsers: number;
  };
  config?: {
    xmlrpc: boolean;
    readme: boolean;
    registration: boolean;
    uploads_listing: boolean;
  };
  interestingFindings?: Array<{
    url: string;
    to_s: string;
    type: string;
    found_by: string;
  }>;
  duration?: number;
  error?: string;
}

/**
 * WPScan MCP Tool Adapter
 */
export class WPScanMCP {
  /**
   * Run WPScan WordPress security scan
   */
  static async scan(options: WPScanOptions): Promise<WPScanResult> {
    const config = getMCPServer('wpscan');
    if (!config || !config.enabled) {
      throw new Error('WPScan MCP server is not enabled. Set MCP_WPSCAN_ENABLED=true');
    }

    try {
      logger.info(`Running WPScan on ${options.target}`);

      // Build enumerate string
      const enumerate: string[] = options.enumerate || [];
      if (options.plugins) enumerate.push('vp');  // vulnerable plugins
      if (options.themes) enumerate.push('vt');  // vulnerable themes
      if (options.users) enumerate.push('u');   // users

      const result = await callMCPTool(config, 'scan', {
        url: options.target,
        enumerate: enumerate.length > 0 ? enumerate.join(',') : 'vp,vt',
        'api-token': options.apiToken,
        stealthy: options.stealthy || false,
        'random-user-agent': options.randomUserAgent !== false,
        timeout: options.timeout || 60,
        threads: options.threads || 5,
      });

      return this.parseWPScanResult(result, options.target);
    } catch (error: any) {
      logger.error('WPScan failed:', error);
      return {
        success: false,
        target: options.target,
        plugins: [],
        themes: [],
        users: [],
        vulnerabilities: { wordpress: [], plugins: [], themes: [] },
        summary: {
          totalVulnerabilities: 0,
          criticalVulnerabilities: 0,
          outdatedPlugins: 0,
          outdatedThemes: 0,
          totalUsers: 0,
        },
        error: error.message,
      };
    }
  }

  /**
   * Parse WPScan MCP result
   */
  private static parseWPScanResult(result: any, target: string): WPScanResult {
    let wordpressVersion: any | undefined;
    const plugins: WPScanPlugin[] = [];
    const themes: WPScanTheme[] = [];
    const users: WPScanUser[] = [];
    let config: any | undefined;
    let interestingFindings: any[] | undefined;
    let duration: number | undefined;

    // Parse MCP result content
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);

            // WordPress version
            if (parsed.version || parsed.wordpress_version) {
              wordpressVersion = parsed.version || parsed.wordpress_version;
            }

            // Plugins
            if (parsed.plugins && Array.isArray(parsed.plugins)) {
              plugins.push(...parsed.plugins);
            }

            // Themes
            if (parsed.themes && Array.isArray(parsed.themes)) {
              themes.push(...parsed.themes);
            }

            // Users
            if (parsed.users && Array.isArray(parsed.users)) {
              users.push(...parsed.users);
            }

            // Config issues
            if (parsed.config_backups || parsed.config) {
              config = parsed.config || parsed.config_backups;
            }

            // Interesting findings
            if (parsed.interesting_findings) {
              interestingFindings = parsed.interesting_findings;
            }

            // Duration
            if (parsed.elapsed) {
              duration = parsed.elapsed;
            }
          } catch {
            // Not JSON, might be summary text
            continue;
          }
        }
      }
    }

    // Collect all vulnerabilities
    const wpVulns: WPScanVulnerability[] = wordpressVersion?.vulnerabilities || [];
    const pluginVulns: WPScanVulnerability[] = plugins.flatMap(p => p.vulnerabilities || []);
    const themeVulns: WPScanVulnerability[] = themes.flatMap(t => t.vulnerabilities || []);

    // Calculate summary
    const totalVulns = wpVulns.length + pluginVulns.length + themeVulns.length;
    const criticalVulns = [...wpVulns, ...pluginVulns, ...themeVulns].filter(
      v => v.cvss && v.cvss >= 9.0
    ).length;

    return {
      success: !result.isError,
      target,
      wordpressVersion,
      plugins,
      themes,
      users,
      vulnerabilities: {
        wordpress: wpVulns,
        plugins: pluginVulns,
        themes: themeVulns,
      },
      summary: {
        totalVulnerabilities: totalVulns,
        criticalVulnerabilities: criticalVulns,
        outdatedPlugins: plugins.filter(p => p.outdated).length,
        outdatedThemes: themes.filter(t => t.outdated).length,
        totalUsers: users.length,
      },
      config,
      interestingFindings,
      duration,
    };
  }

  /**
   * Quick WordPress scan
   */
  static async quickScan(url: string): Promise<WPScanResult> {
    return this.scan({
      target: url,
      enumerate: ['vp', 'vt'],
      stealthy: true,
    });
  }

  /**
   * Full WordPress enumeration
   */
  static async fullScan(url: string, apiToken?: string): Promise<WPScanResult> {
    return this.scan({
      target: url,
      enumerate: ['vp', 'vt', 'u', 'p'],
      apiToken,
      stealthy: false,
    });
  }

  /**
   * User enumeration only
   */
  static async enumerateUsers(url: string): Promise<WPScanUser[]> {
    const result = await this.scan({
      target: url,
      enumerate: ['u'],
      stealthy: true,
    });
    return result.users;
  }

  /**
   * Check if WPScan is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('wpscan');
    return config !== undefined && config.enabled;
  }
}
