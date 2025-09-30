/**
 * DNS Reconnaissance Tool
 * No API keys required - uses Node.js built-in dns module
 */

import dns from 'dns';
import { promisify } from 'util';
import { DNSReconResult, DNSRecord } from './types.js';
import { logger } from '../../../utils/logger.js';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolveSoa = promisify(dns.resolveSoa);
const reverse = promisify(dns.reverse);

export class DNSRecon {
  /**
   * Perform comprehensive DNS reconnaissance on a domain
   */
  async scan(domain: string): Promise<DNSReconResult> {
    logger.info(`Starting DNS reconnaissance for ${domain}`);

    const result: DNSReconResult = {
      domain,
      records: {},
      reverseIPs: {},
    };

    try {
      // A records (IPv4)
      try {
        const aRecords = await resolve4(domain);
        result.records.A = aRecords;
        logger.debug(`Found ${aRecords.length} A records for ${domain}`);

        // Reverse DNS lookup for each IP
        for (const ip of aRecords) {
          try {
            const hostnames = await reverse(ip);
            result.reverseIPs![ip] = hostnames;
          } catch (err) {
            // Reverse lookup might fail, that's okay
            result.reverseIPs![ip] = [];
          }
        }
      } catch (err) {
        logger.debug(`No A records found for ${domain}`);
      }

      // AAAA records (IPv6)
      try {
        result.records.AAAA = await resolve6(domain);
        logger.debug(`Found ${result.records.AAAA.length} AAAA records`);
      } catch (err) {
        logger.debug(`No AAAA records found for ${domain}`);
      }

      // MX records (Mail servers)
      try {
        const mxRecords = await resolveMx(domain);
        result.records.MX = mxRecords
          .sort((a, b) => a.priority - b.priority)
          .map((mx) => `${mx.priority} ${mx.exchange}`);
        logger.debug(`Found ${result.records.MX.length} MX records`);
      } catch (err) {
        logger.debug(`No MX records found for ${domain}`);
      }

      // NS records (Name servers)
      try {
        result.records.NS = await resolveNs(domain);
        logger.debug(`Found ${result.records.NS.length} NS records`);
      } catch (err) {
        logger.debug(`No NS records found for ${domain}`);
      }

      // TXT records (SPF, DKIM, DMARC, etc.)
      try {
        const txtRecords = await resolveTxt(domain);
        result.records.TXT = txtRecords.map((record) => record.join(''));
        logger.debug(`Found ${result.records.TXT.length} TXT records`);
      } catch (err) {
        logger.debug(`No TXT records found for ${domain}`);
      }

      // CNAME records
      try {
        result.records.CNAME = await resolveCname(domain);
        logger.debug(`Found ${result.records.CNAME.length} CNAME records`);
      } catch (err) {
        logger.debug(`No CNAME records found for ${domain}`);
      }

      // SOA record (Start of Authority)
      try {
        result.records.SOA = await resolveSoa(domain);
        logger.debug(`Found SOA record for ${domain}`);
      } catch (err) {
        logger.debug(`No SOA record found for ${domain}`);
      }

      // Check for common security-related subdomains
      const securitySubdomains = [
        '_dmarc',
        '_spf',
        'autoconfig',
        'autodiscover',
        'mail',
        'smtp',
        'pop',
        'imap',
      ];

      for (const sub of securitySubdomains) {
        const fullDomain = `${sub}.${domain}`;
        try {
          const records = await resolve4(fullDomain);
          logger.debug(`Found security subdomain: ${fullDomain}`);
        } catch (err) {
          // Subdomain doesn't exist, that's okay
        }
      }
    } catch (error) {
      logger.error(`DNS reconnaissance failed for ${domain}:`, error);
      throw new Error(
        `DNS reconnaissance failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return result;
  }

  /**
   * Analyze DNS records for security issues
   */
  analyzeSecurityPosture(result: DNSReconResult): {
    findings: string[];
    risks: string[];
  } {
    const findings: string[] = [];
    const risks: string[] = [];

    // Check for SPF record
    const spfRecord = result.records.TXT?.find((txt) =>
      txt.toLowerCase().startsWith('v=spf1')
    );
    if (spfRecord) {
      findings.push(`SPF record found: ${spfRecord}`);
    } else {
      risks.push('No SPF record found - email spoofing risk');
    }

    // Check for DMARC
    const dmarcRecord = result.records.TXT?.find((txt) =>
      txt.toLowerCase().startsWith('v=dmarc1')
    );
    if (dmarcRecord) {
      findings.push(`DMARC record found: ${dmarcRecord}`);
    } else {
      risks.push('No DMARC record found - email authentication weakness');
    }

    // Check for MX records
    if (!result.records.MX || result.records.MX.length === 0) {
      findings.push('No mail servers configured');
    } else {
      findings.push(`${result.records.MX.length} mail server(s) configured`);
    }

    // Check for DNSSEC
    if (result.records.SOA) {
      findings.push('SOA record present - domain is authoritative');
    }

    // Check for name server configuration
    if (result.records.NS && result.records.NS.length < 2) {
      risks.push(
        'Only one name server configured - single point of failure risk'
      );
    }

    return { findings, risks };
  }

  /**
   * Check if a domain exists and is resolvable
   */
  async domainExists(domain: string): Promise<boolean> {
    try {
      await resolve4(domain);
      return true;
    } catch (err) {
      try {
        await resolve6(domain);
        return true;
      } catch (err2) {
        return false;
      }
    }
  }

  /**
   * Get IP addresses for a domain
   */
  async getIPs(domain: string): Promise<string[]> {
    const ips: string[] = [];

    try {
      const ipv4 = await resolve4(domain);
      ips.push(...ipv4);
    } catch (err) {
      // No IPv4
    }

    try {
      const ipv6 = await resolve6(domain);
      ips.push(...ipv6);
    } catch (err) {
      // No IPv6
    }

    return ips;
  }
}