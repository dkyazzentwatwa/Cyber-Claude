/**
 * SSLScan MCP Adapter
 * SSL/TLS configuration and vulnerability analysis
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface SSLScanOptions {
  host: string;
  port?: number;
  sni?: string;  // SNI hostname if different from host
  checkVulnerabilities?: boolean;
  checkCertificate?: boolean;
}

export interface SSLCertificate {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
  serialNumber: string;
  signatureAlgorithm: string;
  publicKeySize: number;
  isExpired: boolean;
  daysUntilExpiry: number;
  san?: string[];  // Subject Alternative Names
}

export interface SSLCipherSuite {
  name: string;
  protocol: string;  // TLS 1.0, TLS 1.1, TLS 1.2, TLS 1.3
  keyExchange: string;
  authentication: string;
  encryption: string;
  mac: string;
  bits: number;
  strength: 'strong' | 'weak' | 'insecure';
}

export interface SSLVulnerability {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  detected: boolean;
  cve?: string;
}

export interface SSLScanResult {
  success: boolean;
  host: string;
  port: number;

  // Protocols
  supportedProtocols: string[];
  deprecatedProtocols: string[];  // SSLv2, SSLv3, TLS 1.0, TLS 1.1

  // Certificate
  certificate?: SSLCertificate;
  certificateChain?: SSLCertificate[];
  certificateIssues: string[];

  // Cipher Suites
  cipherSuites: SSLCipherSuite[];
  weakCiphers: SSLCipherSuite[];

  // Vulnerabilities
  vulnerabilities: SSLVulnerability[];

  // Security Score
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;

  // Recommendations
  recommendations: string[];

  error?: string;
}

/**
 * SSLScan MCP Tool Adapter
 */
export class SSLScanMCP {
  /**
   * Run SSL/TLS scan
   */
  static async scan(options: SSLScanOptions): Promise<SSLScanResult> {
    const config = getMCPServer('sslscan');
    if (!config || !config.enabled) {
      throw new Error('SSLScan MCP server is not enabled. Set MCP_SSLSCAN_ENABLED=true');
    }

    try {
      logger.info(`Running SSL/TLS scan on ${options.host}:${options.port || 443}`);

      const result = await callMCPTool(config, 'scan', {
        host: options.host,
        port: options.port || 443,
        sni: options.sni || options.host,
        'check-vulnerabilities': options.checkVulnerabilities !== false,
        'check-certificate': options.checkCertificate !== false,
      });

      return this.parseSSLScanResult(result, options.host, options.port || 443);
    } catch (error: any) {
      logger.error('SSL/TLS scan failed:', error);
      return this.createErrorResult(options.host, options.port || 443, error.message);
    }
  }

  /**
   * Parse SSLScan MCP result
   */
  private static parseSSLScanResult(result: any, host: string, port: number): SSLScanResult {
    let data: any = {};

    if (result.content && result.content[0]?.text) {
      try {
        data = JSON.parse(result.content[0].text);
      } catch {
        // Failed to parse
      }
    }

    // Extract supported protocols
    const supportedProtocols = data.protocols || [];
    const deprecatedProtocols = supportedProtocols.filter((p: string) =>
      ['SSLv2', 'SSLv3', 'TLS 1.0', 'TLS 1.1'].includes(p)
    );

    // Parse cipher suites
    const cipherSuites: SSLCipherSuite[] = (data.ciphers || []).map((c: any) => ({
      name: c.name,
      protocol: c.protocol,
      keyExchange: c.keyExchange || 'Unknown',
      authentication: c.authentication || 'Unknown',
      encryption: c.encryption || 'Unknown',
      mac: c.mac || 'Unknown',
      bits: c.bits || 0,
      strength: this.classifyCipherStrength(c),
    }));

    const weakCiphers = cipherSuites.filter(c => c.strength !== 'strong');

    // Parse vulnerabilities
    const vulnerabilities: SSLVulnerability[] = ([
      {
        name: 'Heartbleed',
        severity: 'critical' as const,
        description: 'OpenSSL Heartbleed vulnerability (CVE-2014-0160)',
        detected: data.vulnerabilities?.heartbleed || false,
        cve: 'CVE-2014-0160',
      },
      {
        name: 'POODLE',
        severity: 'high' as const,
        description: 'SSLv3 POODLE vulnerability',
        detected: supportedProtocols.includes('SSLv3'),
      },
      {
        name: 'BEAST',
        severity: 'medium' as const,
        description: 'TLS 1.0 BEAST vulnerability',
        detected: supportedProtocols.includes('TLS 1.0'),
      },
      {
        name: 'CRIME',
        severity: 'medium' as const,
        description: 'TLS compression vulnerability',
        detected: data.vulnerabilities?.crime || false,
      },
    ] as SSLVulnerability[]).filter(v => v.detected);

    // Certificate analysis
    const certificate = data.certificate ? {
      subject: data.certificate.subject,
      issuer: data.certificate.issuer,
      validFrom: data.certificate.notBefore,
      validTo: data.certificate.notAfter,
      fingerprint: data.certificate.fingerprint,
      serialNumber: data.certificate.serialNumber,
      signatureAlgorithm: data.certificate.signatureAlgorithm,
      publicKeySize: data.certificate.publicKeySize || 0,
      isExpired: new Date(data.certificate.notAfter) < new Date(),
      daysUntilExpiry: Math.floor((new Date(data.certificate.notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      san: data.certificate.subjectAltName,
    } : undefined;

    // Certificate issues
    const certificateIssues: string[] = [];
    if (certificate) {
      if (certificate.isExpired) {
        certificateIssues.push('Certificate is expired');
      } else if (certificate.daysUntilExpiry < 30) {
        certificateIssues.push(`Certificate expires in ${certificate.daysUntilExpiry} days`);
      }
      if (certificate.publicKeySize < 2048) {
        certificateIssues.push('Weak public key size (< 2048 bits)');
      }
      if (certificate.signatureAlgorithm.includes('SHA1')) {
        certificateIssues.push('Weak signature algorithm (SHA1)');
      }
    }

    // Calculate grade
    const { grade, score } = this.calculateGrade({
      deprecatedProtocols,
      weakCiphers,
      vulnerabilities,
      certificateIssues,
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      deprecatedProtocols,
      weakCiphers,
      vulnerabilities,
      certificateIssues,
    });

    return {
      success: !result.isError,
      host,
      port,
      supportedProtocols,
      deprecatedProtocols,
      certificate,
      certificateChain: data.certificateChain,
      certificateIssues,
      cipherSuites,
      weakCiphers,
      vulnerabilities,
      grade,
      score,
      recommendations,
    };
  }

  /**
   * Classify cipher strength
   */
  private static classifyCipherStrength(cipher: any): 'strong' | 'weak' | 'insecure' {
    // Insecure ciphers
    if (cipher.name.includes('NULL') || cipher.name.includes('EXPORT') || cipher.name.includes('DES')) {
      return 'insecure';
    }

    // Weak ciphers
    if (cipher.name.includes('RC4') || cipher.name.includes('MD5') || cipher.bits < 128) {
      return 'weak';
    }

    // Strong ciphers
    return 'strong';
  }

  /**
   * Calculate security grade
   */
  private static calculateGrade(issues: any): { grade: SSLScanResult['grade'], score: number } {
    let score = 100;

    // Deduct points for issues
    score -= issues.deprecatedProtocols.length * 10;
    score -= issues.weakCiphers.length * 5;
    score -= issues.vulnerabilities.filter((v: any) => v.severity === 'critical').length * 20;
    score -= issues.vulnerabilities.filter((v: any) => v.severity === 'high').length * 15;
    score -= issues.vulnerabilities.filter((v: any) => v.severity === 'medium').length * 10;
    score -= issues.certificateIssues.length * 5;

    score = Math.max(0, score);

    // Assign grade
    let grade: SSLScanResult['grade'];
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    return { grade, score };
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(issues: any): string[] {
    const recommendations: string[] = [];

    if (issues.deprecatedProtocols.length > 0) {
      recommendations.push(`Disable deprecated protocols: ${issues.deprecatedProtocols.join(', ')}`);
    }

    if (issues.weakCiphers.length > 0) {
      recommendations.push('Remove weak cipher suites from configuration');
    }

    if (issues.vulnerabilities.some((v: any) => v.severity === 'critical')) {
      recommendations.push('URGENT: Address critical SSL/TLS vulnerabilities immediately');
    }

    if (issues.certificateIssues.length > 0) {
      recommendations.push('Renew or update SSL/TLS certificate');
    }

    recommendations.push('Use TLS 1.2 or TLS 1.3 only');
    recommendations.push('Enable Forward Secrecy (ECDHE ciphers)');
    recommendations.push('Use 2048-bit or higher RSA keys');

    return recommendations;
  }

  /**
   * Create error result
   */
  private static createErrorResult(host: string, port: number, error: string): SSLScanResult {
    return {
      success: false,
      host,
      port,
      supportedProtocols: [],
      deprecatedProtocols: [],
      certificateIssues: [],
      cipherSuites: [],
      weakCiphers: [],
      vulnerabilities: [],
      grade: 'F',
      score: 0,
      recommendations: [],
      error,
    };
  }

  /**
   * Check if SSLScan is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('sslscan');
    return config !== undefined && config.enabled;
  }
}