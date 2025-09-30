/**
 * OSINT Orchestrator
 * Coordinates all OSINT tools for comprehensive reconnaissance
 */

import { DNSRecon } from './dns-recon.js';
import { WhoisLookup } from './whois-lookup.js';
import { SubdomainEnum } from './subdomain-enum.js';
import { EmailHarvest } from './email-harvest.js';
import { UsernameEnum } from './username-enum.js';
import { BreachCheck } from './breach-check.js';
import { Wayback } from './wayback.js';
import { TechDetect } from './tech-detect.js';
import { IPLookup } from './ip-lookup.js';
import { OSINTReconResult } from './types.js';
import { logger } from '../../../utils/logger.js';

export class OSINTOrchestrator {
  private dnsRecon: DNSRecon;
  private whoisLookup: WhoisLookup;
  private subdomainEnum: SubdomainEnum;
  private emailHarvest: EmailHarvest;
  private usernameEnum: UsernameEnum;
  private breachCheck: BreachCheck;
  private wayback: Wayback;
  private techDetect: TechDetect;
  private ipLookup: IPLookup;

  constructor() {
    this.dnsRecon = new DNSRecon();
    this.whoisLookup = new WhoisLookup();
    this.subdomainEnum = new SubdomainEnum();
    this.emailHarvest = new EmailHarvest();
    this.usernameEnum = new UsernameEnum();
    this.breachCheck = new BreachCheck();
    this.wayback = new Wayback();
    this.techDetect = new TechDetect();
    this.ipLookup = new IPLookup();
  }

  /**
   * Quick reconnaissance scan (essential info only)
   */
  async quickScan(target: string): Promise<OSINTReconResult> {
    logger.info(`Starting quick OSINT scan for: ${target}`);
    const startTime = new Date();

    const result: OSINTReconResult = {
      target,
      scanType: 'quick',
      startTime,
      endTime: new Date(),
      results: {},
      summary: {
        totalFindings: 0,
        riskScore: 0,
        dataExposure: [],
        recommendations: [],
      },
    };

    try {
      // Run quick checks in parallel
      const [whois, dns, ips] = await Promise.all([
        this.whoisLookup.lookup(target).catch(() => null),
        this.dnsRecon.scan(target).catch(() => null),
        this.dnsRecon.getIPs(target).catch(() => []),
      ]);

      if (whois) result.results.whois = whois;
      if (dns) result.results.dns = dns;

      // Get geolocation for IPs
      if (ips.length > 0) {
        result.results.geolocation = await this.ipLookup.geolocateBatch(
          ips.slice(0, 3)
        );
      }

      result.endTime = new Date();
      result.summary = this.generateSummary(result);

      logger.info(`Quick scan completed for ${target}`);
      return result;
    } catch (error) {
      logger.error(`Quick scan failed for ${target}:`, error);
      result.endTime = new Date();
      throw error;
    }
  }

  /**
   * Full reconnaissance scan (comprehensive)
   */
  async fullScan(target: string): Promise<OSINTReconResult> {
    logger.info(`Starting full OSINT scan for: ${target}`);
    const startTime = new Date();

    const result: OSINTReconResult = {
      target,
      scanType: 'full',
      startTime,
      endTime: new Date(),
      results: {},
      summary: {
        totalFindings: 0,
        riskScore: 0,
        dataExposure: [],
        recommendations: [],
      },
    };

    try {
      // Phase 1: Domain Intelligence
      logger.info('Phase 1: Domain Intelligence');
      const [whois, dns] = await Promise.all([
        this.whoisLookup.lookup(target).catch(() => null),
        this.dnsRecon.scan(target).catch(() => null),
      ]);

      if (whois) result.results.whois = whois;
      if (dns) result.results.dns = dns;

      // Phase 2: Subdomain Enumeration
      logger.info('Phase 2: Subdomain Enumeration');
      const subdomainResult = await this.subdomainEnum
        .enumerate(target, {
          useCertTransparency: true,
          useBruteForce: true,
        })
        .catch(() => null);
      if (subdomainResult) result.results.subdomains = subdomainResult;

      // Phase 3: Email Harvesting
      logger.info('Phase 3: Email Harvesting');
      const emailResult = await this.emailHarvest
        .harvest(target)
        .catch(() => null);
      if (emailResult) result.results.emails = emailResult;

      // Phase 4: Technology Detection
      logger.info('Phase 4: Technology Detection');
      try {
        result.results.technologies = await this.techDetect.detect(
          `https://${target}`
        );
      } catch (error) {
        logger.debug('Technology detection failed:', error);
      }

      // Phase 5: Historical Data
      logger.info('Phase 5: Historical Data');
      const waybackResult = await this.wayback
        .getSnapshots(target, { limit: 50 })
        .catch(() => null);
      if (waybackResult) result.results.wayback = waybackResult;

      // Phase 6: IP Analysis
      logger.info('Phase 6: IP Analysis');
      const ips = dns?.records.A || [];
      if (ips.length > 0) {
        const [geolocation, reverseIP] = await Promise.all([
          this.ipLookup.geolocateBatch(ips.slice(0, 5)),
          Promise.all(
            ips.slice(0, 3).map((ip) => this.ipLookup.reverseIP(ip))
          ),
        ]);

        result.results.geolocation = geolocation;
        result.results.reverseIP = reverseIP;
      }

      // Phase 7: Breach Checks
      logger.info('Phase 7: Breach Data Analysis');
      if (result.results.emails && result.results.emails.emails.length > 0) {
        const emailsToCheck = result.results.emails.emails
          .filter((e) => e.verified)
          .slice(0, 5);

        result.results.breaches = await Promise.all(
          emailsToCheck.map((e) =>
            this.breachCheck.checkEmail(e.email).catch(() => null)
          )
        ).then((breaches) =>
          breaches.filter((b): b is NonNullable<typeof b> => b !== null)
        );
      }

      result.endTime = new Date();
      result.summary = this.generateSummary(result);

      logger.info(`Full scan completed for ${target}`);
      return result;
    } catch (error) {
      logger.error(`Full scan failed for ${target}:`, error);
      result.endTime = new Date();
      throw error;
    }
  }

  /**
   * Domain-focused reconnaissance
   */
  async domainScan(domain: string): Promise<OSINTReconResult> {
    logger.info(`Starting domain-focused scan for: ${domain}`);
    const startTime = new Date();

    const result: OSINTReconResult = {
      target: domain,
      scanType: 'domain',
      startTime,
      endTime: new Date(),
      results: {},
      summary: {
        totalFindings: 0,
        riskScore: 0,
        dataExposure: [],
        recommendations: [],
      },
    };

    try {
      // Run all domain-related checks
      const [whois, dns, subdomains, emails, tech, wayback] =
        await Promise.all([
          this.whoisLookup.lookup(domain).catch(() => null),
          this.dnsRecon.scan(domain).catch(() => null),
          this.subdomainEnum
            .enumerate(domain, {
              useCertTransparency: true,
              useBruteForce: true,
            })
            .catch(() => null),
          this.emailHarvest.harvest(domain).catch(() => null),
          this.techDetect.detect(`https://${domain}`).catch(() => null),
          this.wayback.getSnapshots(domain, { limit: 50 }).catch(() => null),
        ]);

      if (whois) result.results.whois = whois;
      if (dns) result.results.dns = dns;
      if (subdomains) result.results.subdomains = subdomains;
      if (emails) result.results.emails = emails;
      if (tech) result.results.technologies = tech;
      if (wayback) result.results.wayback = wayback;

      result.endTime = new Date();
      result.summary = this.generateSummary(result);

      logger.info(`Domain scan completed for ${domain}`);
      return result;
    } catch (error) {
      logger.error(`Domain scan failed for ${domain}:`, error);
      result.endTime = new Date();
      throw error;
    }
  }

  /**
   * Person-focused reconnaissance (username)
   */
  async personScan(username: string): Promise<OSINTReconResult> {
    logger.info(`Starting person-focused scan for: ${username}`);
    const startTime = new Date();

    const result: OSINTReconResult = {
      target: username,
      scanType: 'person',
      startTime,
      endTime: new Date(),
      results: {},
      summary: {
        totalFindings: 0,
        riskScore: 0,
        dataExposure: [],
        recommendations: [],
      },
    };

    try {
      // Username enumeration
      result.results.usernames = await this.usernameEnum.enumerate(username);

      // Try to find associated emails (if username looks like email)
      if (username.includes('@')) {
        result.results.breaches = [
          await this.breachCheck.checkEmail(username),
        ];
      }

      result.endTime = new Date();
      result.summary = this.generateSummary(result);

      logger.info(`Person scan completed for ${username}`);
      return result;
    } catch (error) {
      logger.error(`Person scan failed for ${username}:`, error);
      result.endTime = new Date();
      throw error;
    }
  }

  /**
   * Generate summary and risk assessment
   */
  private generateSummary(result: OSINTReconResult): OSINTReconResult['summary'] {
    const summary = {
      totalFindings: 0,
      riskScore: 0,
      dataExposure: [] as string[],
      recommendations: [] as string[],
    };

    // Count findings
    if (result.results.whois) summary.totalFindings++;
    if (result.results.dns) summary.totalFindings++;
    if (result.results.subdomains) {
      summary.totalFindings += result.results.subdomains.total;
    }
    if (result.results.emails) {
      summary.totalFindings += result.results.emails.total;
    }
    if (result.results.technologies) {
      summary.totalFindings += result.results.technologies.technologies.length;
    }
    if (result.results.wayback) {
      summary.totalFindings += result.results.wayback.totalSnapshots;
    }

    // Assess data exposure
    if (result.results.emails && result.results.emails.total > 0) {
      summary.dataExposure.push(
        `${result.results.emails.total} email address(es) found`
      );
      summary.riskScore += 10;
    }

    if (result.results.breaches) {
      const breachedEmails = result.results.breaches.filter(
        (b) => b.breached
      ).length;
      if (breachedEmails > 0) {
        summary.dataExposure.push(
          `${breachedEmails} email(s) found in data breaches`
        );
        summary.riskScore += 30;
      }
    }

    if (result.results.subdomains) {
      const interesting =
        this.subdomainEnum.getInterestingSubdomains(
          result.results.subdomains
        );
      if (interesting.length > 0) {
        summary.dataExposure.push(
          `${interesting.length} interesting subdomain(s) found (admin, dev, test, etc.)`
        );
        summary.riskScore += 15;
      }
    }

    if (result.results.technologies) {
      const outdatedTechs = result.results.technologies.technologies.filter(
        (t) => t.name === 'WordPress' || t.name === 'jQuery'
      );
      if (outdatedTechs.length > 0) {
        summary.dataExposure.push('Potentially outdated technologies detected');
        summary.riskScore += 10;
      }
    }

    // Generate recommendations
    if (result.results.breaches && result.results.breaches.some((b) => b.breached)) {
      summary.recommendations.push(
        'Change passwords for breached accounts immediately'
      );
      summary.recommendations.push('Enable two-factor authentication (2FA)');
    }

    if (result.results.whois) {
      const age = this.whoisLookup.getDomainAge(result.results.whois);
      if (age && age < 90) {
        summary.recommendations.push(
          'Domain is very new - verify legitimacy before trusting'
        );
      }
    }

    if (result.results.subdomains && result.results.subdomains.total > 50) {
      summary.recommendations.push(
        'Large number of subdomains detected - audit and remove unused ones'
      );
    }

    if (result.results.emails && result.results.emails.total > 10) {
      summary.recommendations.push(
        'Consider using role-based emails instead of personal emails on public websites'
      );
    }

    // Cap risk score at 100
    summary.riskScore = Math.min(summary.riskScore, 100);

    return summary;
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): string[] {
    return [
      'DNS Reconnaissance',
      'WHOIS Lookup',
      'Subdomain Enumeration',
      'Email Harvesting',
      'Username Enumeration',
      'Breach Data Lookup',
      'Wayback Machine',
      'Technology Detection',
      'IP Geolocation',
      'Reverse IP Lookup',
    ];
  }
}