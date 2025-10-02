/**
 * MobSF MCP Adapter
 * Mobile Security Framework - Static and dynamic analysis for Android/iOS apps
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface MobSFScanOptions {
  filePath: string;  // Path to APK/IPA/XAPK file
  scanType?: 'static' | 'dynamic';  // Analysis type (default: static)
  reScan?: boolean;  // Force re-scan if already analyzed
}

export interface MobSFVulnerability {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning';
  description: string;
  file?: string;
  cvss?: number;
  cwe?: string;
  owasp?: string;
  masvs?: string;  // OWASP MASVS category
  reference?: string[];
}

export interface MobSFPermission {
  name: string;
  status: 'dangerous' | 'normal' | 'signature';
  description: string;
  info: string;
}

export interface MobSFAppInfo {
  appName: string;
  packageName: string;
  version: string;
  versionCode?: string;
  platform: 'android' | 'ios';
  minSDK?: string;
  targetSDK?: string;
  size: number;
  md5: string;
  sha1: string;
  sha256: string;
}

export interface MobSFScanResult {
  success: boolean;
  appInfo: MobSFAppInfo | null;
  vulnerabilities: MobSFVulnerability[];
  permissions: MobSFPermission[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    warning: number;
    securityScore?: number;  // 0-100
  };
  certificates?: {
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
    signatureAlgorithm: string;
  }[];
  networkSecurity?: {
    cleartextTraffic: boolean;
    certificatePinning: boolean;
    domains: string[];
  };
  components?: {
    activities: number;
    services: number;
    receivers: number;
    providers: number;
  };
  scanType: string;
  duration?: number;
  error?: string;
}

/**
 * MobSF MCP Tool Adapter
 */
export class MobSFMCP {
  /**
   * Run MobSF mobile app security scan
   */
  static async scan(options: MobSFScanOptions): Promise<MobSFScanResult> {
    const config = getMCPServer('mobsf');
    if (!config || !config.enabled) {
      throw new Error('MobSF MCP server is not enabled. Set MCP_MOBSF_ENABLED=true');
    }

    try {
      logger.info(`Running MobSF ${options.scanType || 'static'} scan on ${options.filePath}`);

      const result = await callMCPTool(config, 'scan', {
        file: options.filePath,
        'scan-type': options.scanType || 'static',
        'rescan': options.reScan || false,
      });

      return this.parseMobSFResult(result, options.scanType || 'static');
    } catch (error: any) {
      logger.error('MobSF scan failed:', error);
      return {
        success: false,
        appInfo: null,
        vulnerabilities: [],
        permissions: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0, warning: 0 },
        scanType: options.scanType || 'static',
        error: error.message,
      };
    }
  }

  /**
   * Parse MobSF MCP result
   */
  private static parseMobSFResult(result: any, scanType: string): MobSFScanResult {
    let appInfo: MobSFAppInfo | null = null;
    const vulnerabilities: MobSFVulnerability[] = [];
    const permissions: MobSFPermission[] = [];
    let certificates: any[] | undefined;
    let networkSecurity: any | undefined;
    let components: any | undefined;
    let duration: number | undefined;

    // Parse MCP result content
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);

            // App information
            if (parsed.appInfo || parsed.app_info) {
              appInfo = parsed.appInfo || parsed.app_info;
            }

            // Vulnerabilities
            if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
              vulnerabilities.push(...parsed.vulnerabilities);
            }

            // Permissions
            if (parsed.permissions && Array.isArray(parsed.permissions)) {
              permissions.push(...parsed.permissions);
            }

            // Certificates
            if (parsed.certificates) {
              certificates = parsed.certificates;
            }

            // Network security
            if (parsed.networkSecurity || parsed.network_security) {
              networkSecurity = parsed.networkSecurity || parsed.network_security;
            }

            // Components
            if (parsed.components) {
              components = parsed.components;
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
    const summary = {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
      warning: vulnerabilities.filter(v => v.severity === 'warning').length,
    };

    // Calculate security score (simplified)
    const securityScore = Math.max(
      0,
      100 - (summary.critical * 20 + summary.high * 10 + summary.medium * 5 + summary.low * 2)
    );

    return {
      success: !result.isError,
      appInfo,
      vulnerabilities,
      permissions,
      summary: { ...summary, securityScore },
      certificates,
      networkSecurity,
      components,
      scanType,
      duration,
    };
  }

  /**
   * Scan Android APK
   */
  static async scanAndroid(apkPath: string, scanType: 'static' | 'dynamic' = 'static'): Promise<MobSFScanResult> {
    return this.scan({
      filePath: apkPath,
      scanType,
    });
  }

  /**
   * Scan iOS IPA
   */
  static async scanIOS(ipaPath: string): Promise<MobSFScanResult> {
    return this.scan({
      filePath: ipaPath,
      scanType: 'static',  // iOS only supports static analysis
    });
  }

  /**
   * Get MobSF server info
   */
  static async getServerInfo(): Promise<any> {
    const config = getMCPServer('mobsf');
    if (!config || !config.enabled) {
      return null;
    }

    try {
      const result = await callMCPTool(config, 'server-info', {});

      if (result.content && result.content[0]?.text) {
        return JSON.parse(result.content[0].text);
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to get MobSF server info:', error);
      return null;
    }
  }

  /**
   * Check if MobSF is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('mobsf');
    return config !== undefined && config.enabled;
  }
}
