/**
 * Subdomain Enumeration Tool
 * Uses Certificate Transparency logs (crt.sh) and DNS brute forcing
 * No API keys required
 */

import axios from 'axios';
import dns from 'dns';
import { promisify } from 'util';
import { Subdomain, SubdomainResult } from './types.js';
import { logger } from '../../../utils/logger.js';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

export class SubdomainEnum {
  private commonSubdomains = [
    'www',
    'mail',
    'ftp',
    'localhost',
    'webmail',
    'smtp',
    'pop',
    'ns1',
    'webdisk',
    'ns2',
    'cpanel',
    'whm',
    'autodiscover',
    'autoconfig',
    'mobile',
    'm',
    'dev',
    'staging',
    'test',
    'api',
    'admin',
    'portal',
    'blog',
    'shop',
    'vpn',
    'remote',
    'server',
    'host',
    'cloud',
    'cdn',
    'app',
    'git',
    'jenkins',
    'dashboard',
    'status',
    'support',
    'help',
    'secure',
    'login',
    'backup',
    'mysql',
    'sql',
    'database',
    'db',
    'ftp2',
    'forum',
    'news',
    'beta',
    'alpha',
    'demo',
    'client',
    'assets',
    'static',
    'images',
    'img',
    'css',
    'js',
    'video',
    'media',
    'files',
    'upload',
    'downloads',
    'download',
    'store',
    'payment',
    'payments',
    'checkout',
    'account',
    'accounts',
    'user',
    'users',
    'profile',
    'internal',
    'external',
    'monitoring',
    'metrics',
    'logs',
    'analytics',
    'stats',
    'reports',
    'grafana',
    'kibana',
    'prometheus',
    'sentry',
    'docker',
    'kubernetes',
    'k8s',
    'registry',
    'ci',
    'cd',
    'gitlab',
    'github',
    'bitbucket',
    'jira',
    'confluence',
    'wiki',
    'docs',
    'documentation',
    'kb',
    'knowledgebase',
    'sandbox',
    'uat',
    'qa',
    'staging',
    'production',
    'prod',
  ];

  /**
   * Enumerate subdomains using multiple methods
   */
  async enumerate(
    domain: string,
    options: {
      useCertTransparency?: boolean;
      useBruteForce?: boolean;
      customWordlist?: string[];
    } = {}
  ): Promise<SubdomainResult> {
    const {
      useCertTransparency = true,
      useBruteForce = true,
      customWordlist = [],
    } = options;

    logger.info(`Starting subdomain enumeration for ${domain}`);

    const subdomains = new Map<string, Subdomain>();
    const sources: string[] = [];

    // Method 1: Certificate Transparency logs
    if (useCertTransparency) {
      try {
        const ctSubdomains = await this.getCertTransparencySubdomains(domain);
        ctSubdomains.forEach((sub) => subdomains.set(sub.subdomain, sub));
        sources.push('Certificate Transparency');
        logger.info(
          `Found ${ctSubdomains.length} subdomains from Certificate Transparency`
        );
      } catch (error) {
        logger.error('Certificate Transparency lookup failed:', error);
      }
    }

    // Method 2: DNS Brute Force
    if (useBruteForce) {
      try {
        const wordlist = [
          ...this.commonSubdomains,
          ...customWordlist,
        ];
        const bruteSubdomains = await this.bruteForceDNS(domain, wordlist);
        bruteSubdomains.forEach((sub) => {
          if (!subdomains.has(sub.subdomain)) {
            subdomains.set(sub.subdomain, sub);
          }
        });
        sources.push('DNS Brute Force');
        logger.info(
          `Found ${bruteSubdomains.length} subdomains from DNS brute force`
        );
      } catch (error) {
        logger.error('DNS brute force failed:', error);
      }
    }

    const result: SubdomainResult = {
      domain,
      subdomains: Array.from(subdomains.values()).sort((a, b) =>
        a.subdomain.localeCompare(b.subdomain)
      ),
      total: subdomains.size,
      sources,
    };

    logger.info(`Subdomain enumeration completed: ${result.total} unique subdomains found`);
    return result;
  }

  /**
   * Get subdomains from Certificate Transparency logs (crt.sh)
   */
  private async getCertTransparencySubdomains(
    domain: string
  ): Promise<Subdomain[]> {
    try {
      const response = await axios.get(
        `https://crt.sh/?q=%.${domain}&output=json`,
        {
          timeout: 30000,
          headers: {
            'User-Agent': 'Cyber-Claude-OSINT/1.0',
          },
        }
      );

      const subdomains = new Set<string>();
      const data = Array.isArray(response.data) ? response.data : [];

      for (const entry of data) {
        const name = entry.name_value || entry.common_name;
        if (!name) continue;

        // Handle multiple names (newline separated)
        const names = name.split('\n').map((n: string) => n.trim());

        for (let subdomain of names) {
          // Remove wildcards
          subdomain = subdomain.replace('*.', '');

          // Validate it's actually a subdomain of the target
          if (
            subdomain.endsWith(domain) &&
            subdomain !== domain &&
            !subdomain.includes(' ')
          ) {
            subdomains.add(subdomain);
          }
        }
      }

      // Resolve IPs for found subdomains (sample first 50 to avoid too many DNS queries)
      const result: Subdomain[] = [];
      const subdomainArray = Array.from(subdomains).slice(0, 50);

      await Promise.all(
        subdomainArray.map(async (subdomain) => {
          const ips = await this.resolveSubdomain(subdomain);
          result.push({
            subdomain,
            ip: ips,
            source: 'Certificate Transparency',
            discovered: new Date(),
          });
        })
      );

      // Add remaining subdomains without IP resolution
      Array.from(subdomains)
        .slice(50)
        .forEach((subdomain) => {
          result.push({
            subdomain,
            source: 'Certificate Transparency',
            discovered: new Date(),
          });
        });

      return result;
    } catch (error) {
      logger.error('Certificate Transparency lookup failed:', error);
      throw error;
    }
  }

  /**
   * Brute force DNS with a wordlist
   */
  private async bruteForceDNS(
    domain: string,
    wordlist: string[]
  ): Promise<Subdomain[]> {
    const found: Subdomain[] = [];
    const batchSize = 10; // Check 10 subdomains at a time

    for (let i = 0; i < wordlist.length; i += batchSize) {
      const batch = wordlist.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (word) => {
          const subdomain = `${word}.${domain}`;
          const ips = await this.resolveSubdomain(subdomain);

          if (ips.length > 0) {
            return {
              subdomain,
              ip: ips,
              source: 'DNS Brute Force',
              discovered: new Date(),
            } as Subdomain;
          }
          return null;
        })
      );

      found.push(...results.filter((r): r is Subdomain => r !== null && r.subdomain !== undefined));
    }

    return found;
  }

  /**
   * Resolve subdomain to IP addresses
   */
  private async resolveSubdomain(subdomain: string): Promise<string[]> {
    const ips: string[] = [];

    try {
      const ipv4 = await resolve4(subdomain);
      ips.push(...ipv4);
    } catch (err) {
      // No IPv4
    }

    try {
      const ipv6 = await resolve6(subdomain);
      ips.push(...ipv6);
    } catch (err) {
      // No IPv6
    }

    return ips;
  }

  /**
   * Check if a subdomain exists
   */
  async exists(subdomain: string): Promise<boolean> {
    const ips = await this.resolveSubdomain(subdomain);
    return ips.length > 0;
  }

  /**
   * Get interesting subdomains (likely attack surface)
   */
  getInterestingSubdomains(result: SubdomainResult): Subdomain[] {
    const interestingKeywords = [
      'admin',
      'api',
      'dev',
      'staging',
      'test',
      'backup',
      'internal',
      'vpn',
      'jenkins',
      'git',
      'jira',
      'confluence',
      'dashboard',
      'panel',
      'cpanel',
      'phpmyadmin',
      'mysql',
      'database',
      'db',
      'sql',
      'elastic',
      'kibana',
      'grafana',
      'prometheus',
      'sentry',
      'beta',
      'alpha',
      'uat',
      'qa',
      'sandbox',
    ];

    return result.subdomains.filter((sub) =>
      interestingKeywords.some((keyword) =>
        sub.subdomain.toLowerCase().includes(keyword)
      )
    );
  }
}