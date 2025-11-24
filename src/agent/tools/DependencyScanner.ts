/**
 * Dependency Vulnerability Scanner using retire.js
 * Scans JavaScript dependencies for known vulnerabilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger.js';
import { VulnEnricher } from './vuln/VulnEnricher.js';
import { VulnerabilityInfo } from './vuln/types.js';

const execAsync = promisify(exec);

export interface VulnerableComponent {
  component: string;
  version: string;
  vulnerabilities: Vulnerability[];
  enrichedCVEs?: VulnerabilityInfo[]; // CVE enrichment data
}

export interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  identifiers: {
    CVE?: string[];
    issue?: string;
    summary?: string;
  };
  info: string[];
  atOrAbove?: string;
  below?: string;
}

export interface DependencyScanResult {
  success: boolean;
  vulnerableComponents: VulnerableComponent[];
  totalVulnerabilities: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scannedPath: string;
  timestamp: Date;
  enriched?: boolean; // Whether CVE enrichment was performed
  error?: string;
}

export class DependencyScanner {
  /**
   * Scan a directory for vulnerable JavaScript dependencies
   * @param path Directory to scan
   * @param enrich Whether to enrich with CVE data from NVD (default: false)
   * @param nvdApiKey Optional NVD API key for higher rate limits
   */
  static async scan(path: string = '.', enrich: boolean = false, nvdApiKey?: string): Promise<DependencyScanResult> {
    try {
      logger.info(`Scanning dependencies in ${path}`);

      // Run retire.js with JSON output
      const { stdout, stderr } = await execAsync(
        `npx retire --path ${path} --outputformat json --colors off`,
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
      ).catch((error) => {
        // retire exits with code 13 if vulnerabilities found
        if (error.code === 13 && error.stdout) {
          return { stdout: error.stdout, stderr: error.stderr };
        }
        throw error;
      });

      let retireData: any = {};

      if (stdout && stdout.trim()) {
        try {
          retireData = JSON.parse(stdout);
        } catch (parseError) {
          logger.warn('Failed to parse retire.js output, attempting line-by-line parse');
          // Sometimes retire outputs multiple JSON objects
          const lines = stdout.split('\n').filter((l: string) => l.trim());
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.data || parsed.results) {
                retireData = parsed;
                break;
              }
            } catch {}
          }
        }
      }

      const vulnerableComponents = this.parseRetireOutput(retireData);
      const summary = this.calculateSummary(vulnerableComponents);

      const result: DependencyScanResult = {
        success: true,
        vulnerableComponents,
        totalVulnerabilities: summary.critical + summary.high + summary.medium + summary.low + summary.info,
        summary,
        scannedPath: path,
        timestamp: new Date(),
        enriched: false,
      };

      // Enrich with CVE data if requested
      if (enrich && vulnerableComponents.length > 0) {
        logger.info('Enriching vulnerabilities with CVE data from NVD...');
        await this.enrichWithCVEData(result, nvdApiKey);
      }

      logger.info(`Found ${result.totalVulnerabilities} vulnerabilities in dependencies`);
      return result;

    } catch (error: any) {
      logger.error('Dependency scan failed:', error);
      return {
        success: false,
        vulnerableComponents: [],
        totalVulnerabilities: 0,
        summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        scannedPath: path,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Parse retire.js JSON output
   */
  private static parseRetireOutput(data: any): VulnerableComponent[] {
    const components: VulnerableComponent[] = [];

    if (!data || typeof data !== 'object') {
      return components;
    }

    // Handle different retire.js output formats
    const results = data.data || data.results || data;

    if (Array.isArray(results)) {
      for (const item of results) {
        if (item.results && Array.isArray(item.results)) {
          for (const result of item.results) {
            components.push(this.parseComponent(result));
          }
        }
      }
    } else if (typeof results === 'object') {
      // Handle object format
      for (const [path, items] of Object.entries(results)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            components.push(this.parseComponent(item));
          }
        }
      }
    }

    return components;
  }

  /**
   * Parse a single component from retire.js output
   */
  private static parseComponent(result: any): VulnerableComponent {
    const component: VulnerableComponent = {
      component: result.component || result.name || 'unknown',
      version: result.version || 'unknown',
      vulnerabilities: [],
    };

    const vulns = result.vulnerabilities || [];
    for (const vuln of vulns) {
      const severity = this.mapSeverity(vuln.severity || 'medium');

      component.vulnerabilities.push({
        severity,
        identifiers: {
          CVE: vuln.identifiers?.CVE || [],
          issue: vuln.identifiers?.issue,
          summary: vuln.identifiers?.summary,
        },
        info: vuln.info || [],
        atOrAbove: vuln.atOrAbove,
        below: vuln.below,
      });
    }

    return component;
  }

  /**
   * Map severity strings to standard levels
   */
  private static mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const normalized = severity.toLowerCase();

    if (normalized.includes('critical')) return 'critical';
    if (normalized.includes('high')) return 'high';
    if (normalized.includes('medium') || normalized.includes('moderate')) return 'medium';
    if (normalized.includes('low')) return 'low';

    return 'info';
  }

  /**
   * Calculate vulnerability summary
   */
  private static calculateSummary(components: VulnerableComponent[]): DependencyScanResult['summary'] {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const component of components) {
      for (const vuln of component.vulnerabilities) {
        summary[vuln.severity]++;
      }
    }

    return summary;
  }

  /**
   * Enrich vulnerabilities with CVE data from NVD
   */
  private static async enrichWithCVEData(result: DependencyScanResult, nvdApiKey?: string): Promise<void> {
    try {
      const enricher = new VulnEnricher(nvdApiKey);
      let enrichedCount = 0;

      for (const component of result.vulnerableComponents) {
        // Collect all CVE IDs for this component
        const cveIds = new Set<string>();

        for (const vuln of component.vulnerabilities) {
          if (vuln.identifiers.CVE && vuln.identifiers.CVE.length > 0) {
            vuln.identifiers.CVE.forEach(cve => cveIds.add(cve));
          }
        }

        // Enrich if we have CVE IDs
        if (cveIds.size > 0) {
          const enrichResult = await enricher.enrichComponent(
            component.component,
            component.version,
            Array.from(cveIds)
          );

          if (enrichResult.enriched && enrichResult.vulnInfo) {
            component.enrichedCVEs = enrichResult.vulnInfo;
            enrichedCount++;
          }

          // Rate limiting: 1 second delay between enrichments
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      result.enriched = enrichedCount > 0;
      logger.info(`Enriched ${enrichedCount} components with CVE data`);

    } catch (error: any) {
      logger.error(`CVE enrichment failed: ${error.message}`);
      result.enriched = false;
    }
  }

  /**
   * Check if retire.js is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await execAsync('npx retire --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format scan results as human-readable text
   */
  static formatResults(result: DependencyScanResult): string {
    if (!result.success) {
      return `❌ Scan failed: ${result.error}`;
    }

    if (result.totalVulnerabilities === 0) {
      return `✅ No vulnerabilities found in dependencies`;
    }

    const lines: string[] = [];
    lines.push(`\n🔍 Dependency Vulnerability Scan Results`);
    lines.push(`📁 Path: ${result.scannedPath}`);
    lines.push(`📊 Total Vulnerabilities: ${result.totalVulnerabilities}`);
    if (result.enriched) {
      lines.push(`✨ Enriched with CVE data from NVD`);
    }
    lines.push('');

    lines.push(`Severity Breakdown:`);
    lines.push(`  🔴 Critical: ${result.summary.critical}`);
    lines.push(`  🟠 High: ${result.summary.high}`);
    lines.push(`  🟡 Medium: ${result.summary.medium}`);
    lines.push(`  🟢 Low: ${result.summary.low}`);
    lines.push(`  ℹ️  Info: ${result.summary.info}\n`);

    if (result.vulnerableComponents.length > 0) {
      lines.push(`Vulnerable Components:\n`);

      for (const component of result.vulnerableComponents) {
        lines.push(`📦 ${component.component} @ ${component.version}`);

        for (const vuln of component.vulnerabilities) {
          const severityIcon = this.getSeverityIcon(vuln.severity);
          lines.push(`  ${severityIcon} ${vuln.severity.toUpperCase()}`);

          if (vuln.identifiers.CVE && vuln.identifiers.CVE.length > 0) {
            lines.push(`     CVE: ${vuln.identifiers.CVE.join(', ')}`);
          }

          if (vuln.identifiers.summary) {
            lines.push(`     ${vuln.identifiers.summary}`);
          }

          if (vuln.below) {
            lines.push(`     Fix: Upgrade to version ${vuln.below} or higher`);
          }

          if (vuln.info && vuln.info.length > 0) {
            lines.push(`     Info: ${vuln.info[0]}`);
          }
        }

        // Show enriched CVE data if available
        if (component.enrichedCVEs && component.enrichedCVEs.length > 0) {
          lines.push(`\n  📋 Enriched CVE Details:`);

          for (const cve of component.enrichedCVEs) {
            const cveIcon = this.getSeverityIcon(cve.severity);
            lines.push(`  ${cveIcon} ${cve.cveId} - ${cve.severity.toUpperCase()}`);

            if (cve.cvssScore) {
              lines.push(`     CVSS: ${cve.cvssScore.toFixed(1)}/10.0`);
            }

            if (cve.description) {
              const shortDesc = cve.description.slice(0, 150);
              lines.push(`     ${shortDesc}${cve.description.length > 150 ? '...' : ''}`);
            }

            if (cve.cwe && cve.cwe.length > 0) {
              lines.push(`     Weakness: ${cve.cwe.slice(0, 3).join(', ')}`);
            }

            if (cve.published) {
              lines.push(`     Published: ${cve.published.toLocaleDateString()}`);
            }
          }
        }

        lines.push('');
      }
    }

    return lines.join('\n');
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
}
