/**
 * Vulnerability Enricher
 * Enriches scan results with CVE/vulnerability data
 */

import { VulnerabilityDB } from './VulnerabilityDB.js';
import {
  VulnerabilityInfo,
  EnrichmentResult,
  ProductVersion,
} from './types.js';
import { logger } from '../../../utils/logger.js';

export class VulnEnricher {
  private vulnDB: VulnerabilityDB;

  constructor(apiKey?: string) {
    this.vulnDB = new VulnerabilityDB(apiKey);
  }

  /**
   * Enrich a vulnerability finding with CVE data
   * @param component Component/package name
   * @param version Version string
   * @param existingCVEs Any CVE IDs already identified
   */
  async enrichComponent(
    component: string,
    version: string,
    existingCVEs?: string[]
  ): Promise<EnrichmentResult> {
    try {
      const vulnInfo: VulnerabilityInfo[] = [];
      let source: 'cache' | 'api' | 'none' = 'none';

      // If we have CVE IDs, look them up directly
      if (existingCVEs && existingCVEs.length > 0) {
        for (const cveId of existingCVEs) {
          try {
            const cveData = await this.vulnDB.getCVE(cveId);
            if (cveData) {
              const description = cveData.descriptions.find(d => d.lang === 'en')?.value ||
                                cveData.descriptions[0]?.value ||
                                'No description available';

              const cvss = cveData.cvssV3 || cveData.cvssV2;
              const severity = this.cvssToStandardSeverity(cvss?.baseSeverity || 'MEDIUM');

              vulnInfo.push({
                cveId: cveData.id,
                description,
                severity,
                cvssScore: cvss?.baseScore,
                cvssVector: cvss?.vectorString,
                published: cveData.published,
                lastModified: cveData.lastModified,
                references: cveData.references.map(r => r.url),
                cwe: cveData.weaknesses?.map(w => w.id),
              });

              source = 'api';
            }
          } catch (error: any) {
            logger.warn(`Failed to fetch CVE ${cveId}: ${error.message}`);
          }
        }
      }
      // Otherwise, search by component/version
      else {
        const product: ProductVersion = {
          product: component,
          version,
        };

        const vulns = await this.vulnDB.getVulnerabilitiesForProduct(product);
        vulnInfo.push(...vulns);

        if (vulns.length > 0) {
          source = 'api';
        }
      }

      return {
        original: { component, version, existingCVEs },
        enriched: vulnInfo.length > 0,
        vulnInfo,
        source,
      };

    } catch (error: any) {
      logger.error(`Enrichment failed for ${component}@${version}: ${error.message}`);
      return {
        original: { component, version, existingCVEs },
        enriched: false,
        source: 'none',
      };
    }
  }

  /**
   * Enrich multiple components in batch
   */
  async enrichBatch(
    components: Array<{ component: string; version: string; cves?: string[] }>
  ): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];

    for (const comp of components) {
      const result = await this.enrichComponent(comp.component, comp.version, comp.cves);
      results.push(result);

      // Small delay to avoid rate limiting
      await this.sleep(1000);
    }

    return results;
  }

  /**
   * Get detailed CVE information
   */
  async getCVEDetails(cveId: string): Promise<VulnerabilityInfo | null> {
    try {
      const cveData = await this.vulnDB.getCVE(cveId);
      if (!cveData) return null;

      const description = cveData.descriptions.find(d => d.lang === 'en')?.value ||
                         cveData.descriptions[0]?.value ||
                         'No description available';

      const cvss = cveData.cvssV3 || cveData.cvssV2;
      const severity = this.cvssToStandardSeverity(cvss?.baseSeverity || 'MEDIUM');

      // Extract affected versions from CPE data
      const affectedVersions: string[] = [];
      if (cveData.configurations?.nodes) {
        for (const node of cveData.configurations.nodes) {
          for (const match of node.cpeMatch) {
            if (match.versionStartIncluding || match.versionEndIncluding ||
                match.versionStartExcluding || match.versionEndExcluding) {
              const versionInfo = [];
              if (match.versionStartIncluding) versionInfo.push(`>=${match.versionStartIncluding}`);
              if (match.versionStartExcluding) versionInfo.push(`>${match.versionStartExcluding}`);
              if (match.versionEndIncluding) versionInfo.push(`<=${match.versionEndIncluding}`);
              if (match.versionEndExcluding) versionInfo.push(`<${match.versionEndExcluding}`);
              affectedVersions.push(versionInfo.join(' '));
            }
          }
        }
      }

      return {
        cveId: cveData.id,
        description,
        severity,
        cvssScore: cvss?.baseScore,
        cvssVector: cvss?.vectorString,
        published: cveData.published,
        lastModified: cveData.lastModified,
        affectedVersions: affectedVersions.length > 0 ? affectedVersions : undefined,
        references: cveData.references.slice(0, 5).map(r => r.url), // Limit to 5 refs
        cwe: cveData.weaknesses?.map(w => w.id),
      };

    } catch (error: any) {
      logger.error(`Failed to get CVE details for ${cveId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Format enriched vulnerability info for display
   */
  formatVulnerabilityInfo(info: VulnerabilityInfo): string {
    const lines: string[] = [];

    const severityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
      info: '🔵',
    }[info.severity];

    lines.push(`${severityEmoji} ${info.cveId} - ${info.severity.toUpperCase()}`);

    if (info.cvssScore) {
      lines.push(`   CVSS Score: ${info.cvssScore.toFixed(1)}/10.0`);
    }

    lines.push(`   ${info.description.slice(0, 200)}${info.description.length > 200 ? '...' : ''}`);

    if (info.affectedVersions && info.affectedVersions.length > 0) {
      lines.push(`   Affected: ${info.affectedVersions.join(', ')}`);
    }

    if (info.cwe && info.cwe.length > 0) {
      lines.push(`   Weakness: ${info.cwe.join(', ')}`);
    }

    if (info.published) {
      lines.push(`   Published: ${info.published.toLocaleDateString()}`);
    }

    if (info.references && info.references.length > 0) {
      lines.push(`   Reference: ${info.references[0]}`);
    }

    return lines.join('\n');
  }

  /**
   * Convert CVSS severity to standard severity levels
   */
  private cvssToStandardSeverity(cvss: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    switch (cvss.toUpperCase()) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      case 'LOW': return 'low';
      default: return 'info';
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear vulnerability database cache
   */
  async clearCache(): Promise<number> {
    return await this.vulnDB.clearCache();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await this.vulnDB.getCacheStats();
  }
}
