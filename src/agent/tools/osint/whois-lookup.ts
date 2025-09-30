/**
 * WHOIS Lookup Tool
 * No API keys required - uses whois-json package
 */

import whois from 'whois-json';
import { DomainInfo } from './types.js';
import { logger } from '../../../utils/logger.js';

export class WhoisLookup {
  /**
   * Perform WHOIS lookup on a domain
   */
  async lookup(domain: string): Promise<DomainInfo> {
    logger.info(`Performing WHOIS lookup for ${domain}`);

    try {
      const rawData = await whois(domain);

      // Parse the WHOIS data
      const domainInfo: DomainInfo = {
        domain,
        registrar: this.extractField(rawData, [
          'registrar',
          'Registrar',
          'sponsoringRegistrar',
        ]),
        registrationDate: this.extractField(rawData, [
          'creationDate',
          'createdDate',
          'created',
          'registrationDate',
        ]),
        expirationDate: this.extractField(rawData, [
          'expirationDate',
          'expiryDate',
          'registryExpiryDate',
          'expires',
        ]),
        nameServers: this.extractArray(rawData, [
          'nameServers',
          'nameServer',
          'nserver',
        ]),
        registrantOrg: this.extractField(rawData, [
          'registrantOrganization',
          'registrantOrg',
          'orgName',
          'organization',
        ]),
        registrantCountry: this.extractField(rawData, [
          'registrantCountry',
          'country',
        ]),
        status: this.extractArray(rawData, ['status', 'domainStatus']),
        dnssec: this.extractField(rawData, ['dnssec']),
      };

      logger.debug(`WHOIS lookup completed for ${domain}`);
      return domainInfo;
    } catch (error) {
      logger.error(`WHOIS lookup failed for ${domain}:`, error);
      throw new Error(
        `WHOIS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract field from WHOIS data (case-insensitive)
   */
  private extractField(data: any, fields: string[]): string | undefined {
    if (!data) return undefined;

    for (const field of fields) {
      // Try exact match
      if (data[field]) {
        return String(data[field]);
      }

      // Try case-insensitive match
      const lowerField = field.toLowerCase();
      for (const key of Object.keys(data)) {
        if (key.toLowerCase() === lowerField) {
          return String(data[key]);
        }
      }
    }

    return undefined;
  }

  /**
   * Extract array field from WHOIS data
   */
  private extractArray(data: any, fields: string[]): string[] | undefined {
    if (!data) return undefined;

    for (const field of fields) {
      if (data[field]) {
        if (Array.isArray(data[field])) {
          return data[field].map((item: any) => String(item));
        }
        return [String(data[field])];
      }

      // Try case-insensitive match
      const lowerField = field.toLowerCase();
      for (const key of Object.keys(data)) {
        if (key.toLowerCase() === lowerField) {
          if (Array.isArray(data[key])) {
            return data[key].map((item: any) => String(item));
          }
          return [String(data[key])];
        }
      }
    }

    return undefined;
  }

  /**
   * Check if domain is registered
   */
  async isRegistered(domain: string): Promise<boolean> {
    try {
      await this.lookup(domain);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get domain age in days
   */
  getDomainAge(domainInfo: DomainInfo): number | null {
    if (!domainInfo.registrationDate) return null;

    try {
      const registrationDate = new Date(domainInfo.registrationDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - registrationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration(domainInfo: DomainInfo): number | null {
    if (!domainInfo.expirationDate) return null;

    try {
      const expirationDate = new Date(domainInfo.expirationDate);
      const now = new Date();
      const diffTime = expirationDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (err) {
      return null;
    }
  }

  /**
   * Analyze WHOIS data for suspicious indicators
   */
  analyzeSecurity(domainInfo: DomainInfo): {
    findings: string[];
    risks: string[];
  } {
    const findings: string[] = [];
    const risks: string[] = [];

    // Check domain age
    const age = this.getDomainAge(domainInfo);
    if (age !== null) {
      findings.push(`Domain age: ${age} days`);
      if (age < 90) {
        risks.push('Domain is very new (less than 90 days) - potential indicator of phishing/malicious site');
      }
    }

    // Check expiration
    const daysUntilExpiration = this.getDaysUntilExpiration(domainInfo);
    if (daysUntilExpiration !== null) {
      findings.push(`Days until expiration: ${daysUntilExpiration}`);
      if (daysUntilExpiration < 30) {
        risks.push('Domain expires soon - may be abandoned or temporary');
      }
    }

    // Check privacy protection
    if (
      domainInfo.registrantOrg?.toLowerCase().includes('privacy') ||
      domainInfo.registrantOrg?.toLowerCase().includes('protected') ||
      domainInfo.registrantOrg?.toLowerCase().includes('redacted')
    ) {
      findings.push('WHOIS privacy protection enabled');
    }

    // Check DNSSEC
    if (domainInfo.dnssec?.toLowerCase() === 'unsigned') {
      risks.push('DNSSEC not enabled - vulnerable to DNS spoofing');
    } else if (domainInfo.dnssec?.toLowerCase() === 'signed') {
      findings.push('DNSSEC enabled - good security practice');
    }

    // Check name servers
    if (domainInfo.nameServers && domainInfo.nameServers.length < 2) {
      risks.push('Less than 2 name servers - single point of failure');
    }

    return { findings, risks };
  }
}