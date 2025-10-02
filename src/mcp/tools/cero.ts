/**
 * Cero MCP Adapter
 * Certificate transparency domain enumeration
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface CeroScanOptions {
  domain: string;
  includeSubdomains?: boolean;  // Include subdomains in search
  includeExpired?: boolean;  // Include expired certificates
  timeout?: number;  // Request timeout (seconds)
  maxResults?: number;  // Maximum number of results
}

export interface CeroCertificate {
  domain: string;
  issuer: string;
  subject: string;
  notBefore: string;  // Valid from date
  notAfter: string;   // Valid to date
  serialNumber: string;
  fingerprint: string;
  subjectAlternativeNames: string[];  // SAN domains
  isWildcard: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
  certificateAuthority: string;
}

export interface CeroScanResult {
  success: boolean;
  domain: string;
  certificates: CeroCertificate[];
  uniqueDomains: string[];  // All unique domains found in certificates
  summary: {
    totalCertificates: number;
    activeCertificates: number;
    expiredCertificates: number;
    uniqueDomains: number;
    wildcardCertificates: number;
    certificateAuthorities: Record<string, number>;  // CA distribution
  };
  duration?: number;
  error?: string;
}

/**
 * Cero MCP Tool Adapter
 */
export class CeroMCP {
  /**
   * Run Cero certificate transparency scan
   */
  static async scan(options: CeroScanOptions): Promise<CeroScanResult> {
    const config = getMCPServer('cero');
    if (!config || !config.enabled) {
      throw new Error('Cero MCP server is not enabled. Set MCP_CERO_ENABLED=true');
    }

    try {
      logger.info(`Running Cero certificate scan for ${options.domain}`);

      const result = await callMCPTool(config, 'scan', {
        domain: options.domain,
        'include-subdomains': options.includeSubdomains !== false,
        'include-expired': options.includeExpired || false,
        timeout: options.timeout || 30,
        'max-results': options.maxResults || 1000,
      });

      return this.parseCeroResult(result, options.domain);
    } catch (error: any) {
      logger.error('Cero scan failed:', error);
      return {
        success: false,
        domain: options.domain,
        certificates: [],
        uniqueDomains: [],
        summary: {
          totalCertificates: 0,
          activeCertificates: 0,
          expiredCertificates: 0,
          uniqueDomains: 0,
          wildcardCertificates: 0,
          certificateAuthorities: {},
        },
        error: error.message,
      };
    }
  }

  /**
   * Parse Cero MCP result
   */
  private static parseCeroResult(result: any, domain: string): CeroScanResult {
    const certificates: CeroCertificate[] = [];
    let duration: number | undefined;

    // Parse MCP result content
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);

            // Certificates
            if (parsed.certificates && Array.isArray(parsed.certificates)) {
              certificates.push(...parsed.certificates);
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

    // Extract unique domains from all SAN fields
    const domainsSet = new Set<string>();
    certificates.forEach(cert => {
      cert.subjectAlternativeNames?.forEach(san => domainsSet.add(san));
    });
    const uniqueDomains = Array.from(domainsSet).sort();

    // Calculate CA distribution
    const certificateAuthorities: Record<string, number> = {};
    certificates.forEach(cert => {
      const ca = cert.certificateAuthority || 'Unknown';
      certificateAuthorities[ca] = (certificateAuthorities[ca] || 0) + 1;
    });

    // Calculate summary
    const summary = {
      totalCertificates: certificates.length,
      activeCertificates: certificates.filter(c => !c.isExpired).length,
      expiredCertificates: certificates.filter(c => c.isExpired).length,
      uniqueDomains: uniqueDomains.length,
      wildcardCertificates: certificates.filter(c => c.isWildcard).length,
      certificateAuthorities,
    };

    return {
      success: !result.isError,
      domain,
      certificates,
      uniqueDomains,
      summary,
      duration,
    };
  }

  /**
   * Get all subdomains for a domain
   */
  static async getSubdomains(domain: string): Promise<string[]> {
    const result = await this.scan({
      domain,
      includeSubdomains: true,
      includeExpired: false,
    });

    return result.uniqueDomains;
  }

  /**
   * Get active certificates only
   */
  static async getActiveCertificates(domain: string): Promise<CeroCertificate[]> {
    const result = await this.scan({
      domain,
      includeExpired: false,
    });

    return result.certificates.filter(c => !c.isExpired);
  }

  /**
   * Get expired certificates (for historical analysis)
   */
  static async getExpiredCertificates(domain: string): Promise<CeroCertificate[]> {
    const result = await this.scan({
      domain,
      includeExpired: true,
    });

    return result.certificates.filter(c => c.isExpired);
  }

  /**
   * Get certificates expiring soon
   */
  static async getExpiringCertificates(
    domain: string,
    daysThreshold = 30
  ): Promise<CeroCertificate[]> {
    const result = await this.scan({
      domain,
      includeExpired: false,
    });

    return result.certificates.filter(
      c => !c.isExpired && c.daysUntilExpiry <= daysThreshold
    );
  }

  /**
   * Check if Cero is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('cero');
    return config !== undefined && config.enabled;
  }
}
