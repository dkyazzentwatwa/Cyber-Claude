/**
 * SSL/TLS Certificate Analyzer using ssl-checker
 * Analyzes SSL certificates for validity, expiration, and security issues
 */

import sslChecker from 'ssl-checker';
import { logger } from '../../utils/logger.js';

export interface SSLAnalysisResult {
  success: boolean;
  host: string;
  port: number;
  valid: boolean;
  validFrom: Date;
  validTo: Date;
  daysRemaining: number;
  validFor: string[];
  issuer: {
    C?: string;
    O?: string;
    CN?: string;
  };
  subject: {
    CN?: string;
    O?: string;
    C?: string;
  };
  serialNumber?: string;
  fingerprint?: string;
  findings: SSLFinding[];
  riskScore: number;
  timestamp: Date;
  error?: string;
}

export interface SSLFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation?: string;
}

export class SSLAnalyzer {
  /**
   * Analyze SSL certificate for a given host
   */
  static async analyze(
    host: string,
    port: number = 443,
    options: { method?: string; protocol?: string } = {}
  ): Promise<SSLAnalysisResult> {
    try {
      logger.info(`Analyzing SSL certificate for ${host}:${port}`);

      const result = await sslChecker(host, {
        method: options.method || 'GET',
        port: port,
        protocol: options.protocol || 'https:',
      });

      const findings: SSLFinding[] = [];
      let riskScore = 0;

      // Check certificate validity
      if (!result.valid) {
        findings.push({
          severity: 'critical',
          title: 'Invalid SSL Certificate',
          description: 'The SSL certificate is not valid',
          recommendation: 'Obtain a valid SSL certificate from a trusted Certificate Authority',
        });
        riskScore += 100;
      }

      // Check expiration
      const daysRemaining = result.daysRemaining || 0;

      if (daysRemaining <= 0) {
        findings.push({
          severity: 'critical',
          title: 'Expired SSL Certificate',
          description: `Certificate expired ${Math.abs(daysRemaining)} days ago`,
          recommendation: 'Renew the SSL certificate immediately',
        });
        riskScore += 100;
      } else if (daysRemaining <= 7) {
        findings.push({
          severity: 'high',
          title: 'Certificate Expiring Soon',
          description: `Certificate expires in ${daysRemaining} days`,
          recommendation: 'Renew the SSL certificate as soon as possible',
        });
        riskScore += 60;
      } else if (daysRemaining <= 30) {
        findings.push({
          severity: 'medium',
          title: 'Certificate Expiring Within 30 Days',
          description: `Certificate expires in ${daysRemaining} days`,
          recommendation: 'Plan to renew the SSL certificate soon',
        });
        riskScore += 30;
      } else if (daysRemaining <= 90) {
        findings.push({
          severity: 'low',
          title: 'Certificate Expiring Within 90 Days',
          description: `Certificate expires in ${daysRemaining} days`,
          recommendation: 'Consider setting up auto-renewal',
        });
        riskScore += 10;
      }

      // Check for wildcard certificates
      if (result.validFor && result.validFor.some((domain: string) => domain.startsWith('*.'))) {
        findings.push({
          severity: 'info',
          title: 'Wildcard Certificate Detected',
          description: 'Certificate uses wildcard domain matching',
          recommendation: 'Ensure wildcard certificates are properly secured',
        });
      }

      // Check certificate age
      const validFrom = new Date(result.validFrom);
      const validTo = new Date(result.validTo);
      const certLifetimeYears = (validTo.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24 * 365);

      if (certLifetimeYears > 2) {
        findings.push({
          severity: 'low',
          title: 'Long Certificate Lifetime',
          description: `Certificate has a ${certLifetimeYears.toFixed(1)} year lifetime`,
          recommendation: 'Consider using certificates with shorter lifetimes (1 year or less)',
        });
        riskScore += 5;
      }

      // Info: Valid certificate
      if (result.valid && daysRemaining > 90) {
        findings.push({
          severity: 'info',
          title: 'Valid SSL Certificate',
          description: `Certificate is valid and expires in ${daysRemaining} days`,
        });
      }

      const analysisResult: SSLAnalysisResult = {
        success: true,
        host,
        port,
        valid: result.valid,
        validFrom: new Date(result.validFrom),
        validTo: new Date(result.validTo),
        daysRemaining,
        validFor: result.validFor || [],
        issuer: {
          C: (result as any).issuer?.C,
          O: (result as any).issuer?.O,
          CN: (result as any).issuer?.CN,
        },
        subject: {
          CN: (result as any).subject?.CN,
          O: (result as any).subject?.O,
          C: (result as any).subject?.C,
        },
        serialNumber: (result as any).serialNumber,
        fingerprint: (result as any).fingerprint,
        findings,
        riskScore: Math.min(100, riskScore),
        timestamp: new Date(),
      };

      logger.info(`SSL analysis complete for ${host}:${port} - Risk Score: ${analysisResult.riskScore}`);
      return analysisResult;

    } catch (error: any) {
      logger.error(`SSL analysis failed for ${host}:${port}:`, error);
      return {
        success: false,
        host,
        port,
        valid: false,
        validFrom: new Date(),
        validTo: new Date(),
        daysRemaining: 0,
        validFor: [],
        issuer: {},
        subject: {},
        findings: [{
          severity: 'critical',
          title: 'SSL Analysis Failed',
          description: error.message,
          recommendation: 'Verify that the host is accessible and uses SSL/TLS',
        }],
        riskScore: 100,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Analyze multiple hosts in batch
   */
  static async analyzeBatch(hosts: string[], port: number = 443): Promise<SSLAnalysisResult[]> {
    const results: SSLAnalysisResult[] = [];

    for (const host of hosts) {
      const result = await this.analyze(host, port);
      results.push(result);
    }

    return results;
  }

  /**
   * Format analysis results as human-readable text
   */
  static formatResults(result: SSLAnalysisResult): string {
    const lines: string[] = [];

    lines.push(`\n🔒 SSL/TLS Certificate Analysis`);
    lines.push(`🌐 Host: ${result.host}:${result.port}`);
    lines.push(`📅 Analyzed: ${result.timestamp.toLocaleString()}\n`);

    if (!result.success) {
      lines.push(`❌ Analysis Failed: ${result.error}\n`);
      return lines.join('\n');
    }

    // Certificate Status
    const statusIcon = result.valid ? '✅' : '❌';
    lines.push(`${statusIcon} Certificate Status: ${result.valid ? 'VALID' : 'INVALID'}`);

    // Risk Score
    const riskIcon = result.riskScore >= 60 ? '🔴' : result.riskScore >= 30 ? '🟡' : '🟢';
    lines.push(`${riskIcon} Risk Score: ${result.riskScore}/100\n`);

    // Certificate Details
    lines.push(`📋 Certificate Details:`);
    if (result.subject.CN) {
      lines.push(`   Subject: ${result.subject.CN}`);
    }
    if (result.issuer.CN) {
      lines.push(`   Issuer: ${result.issuer.CN} (${result.issuer.O || 'Unknown'})`);
    }
    lines.push(`   Valid From: ${result.validFrom.toLocaleString()}`);
    lines.push(`   Valid To: ${result.validTo.toLocaleString()}`);
    lines.push(`   Days Remaining: ${result.daysRemaining}`);

    if (result.validFor.length > 0) {
      lines.push(`   Valid For: ${result.validFor.join(', ')}`);
    }

    if (result.serialNumber) {
      lines.push(`   Serial: ${result.serialNumber}`);
    }

    // Findings
    if (result.findings.length > 0) {
      lines.push(`\n🔍 Findings:\n`);

      const groupedFindings = this.groupFindingsBySeverity(result.findings);

      for (const severity of ['critical', 'high', 'medium', 'low', 'info'] as const) {
        const findings = groupedFindings[severity];
        if (findings.length > 0) {
          for (const finding of findings) {
            const icon = this.getSeverityIcon(severity);
            lines.push(`${icon} ${severity.toUpperCase()}: ${finding.title}`);
            lines.push(`   ${finding.description}`);
            if (finding.recommendation) {
              lines.push(`   💡 ${finding.recommendation}`);
            }
            lines.push('');
          }
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Group findings by severity
   */
  private static groupFindingsBySeverity(findings: SSLFinding[]): Record<string, SSLFinding[]> {
    const grouped: Record<string, SSLFinding[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: [],
    };

    for (const finding of findings) {
      grouped[finding.severity].push(finding);
    }

    return grouped;
  }

  /**
   * Get emoji icon for severity level
   */
  private static getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return 'ℹ️';
    }
  }

  /**
   * Check if ssl-checker is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // ssl-checker is a library, not CLI tool, so always available if installed
      return true;
    } catch {
      return false;
    }
  }
}
