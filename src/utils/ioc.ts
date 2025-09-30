/**
 * IOC (Indicator of Compromise) Extraction and Management
 */

export interface IOC {
  type: 'ip' | 'domain' | 'url' | 'email' | 'hash' | 'cve';
  value: string;
  context?: string;
  firstSeen: Date;
  count: number;
}

export interface IOCReport {
  ips: IOC[];
  domains: IOC[];
  urls: IOC[];
  emails: IOC[];
  hashes: IOC[];
  cves: IOC[];
  totalCount: number;
}

/**
 * IOC Extractor - Extract indicators from text/data
 */
export class IOCExtractor {
  private static readonly PATTERNS = {
    // IPv4 address
    ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

    // IPv6 address (simplified)
    ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,

    // Domain name
    domain: /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g,

    // Email address
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // URL
    url: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g,

    // MD5 hash
    md5: /\b[a-fA-F0-9]{32}\b/g,

    // SHA1 hash
    sha1: /\b[a-fA-F0-9]{40}\b/g,

    // SHA256 hash
    sha256: /\b[a-fA-F0-9]{64}\b/g,

    // CVE identifier
    cve: /CVE-\d{4}-\d{4,7}/gi,
  };

  private iocMap: Map<string, IOC>;

  constructor() {
    this.iocMap = new Map();
  }

  /**
   * Extract IOCs from text
   */
  extractFromText(text: string, context?: string): void {
    // Extract IPs
    const ipv4Matches = text.match(IOCExtractor.PATTERNS.ipv4) || [];
    for (const ip of ipv4Matches) {
      if (!this.isPrivateIP(ip) && !this.isReservedIP(ip)) {
        this.addIOC('ip', ip, context);
      }
    }

    const ipv6Matches = text.match(IOCExtractor.PATTERNS.ipv6) || [];
    for (const ip of ipv6Matches) {
      this.addIOC('ip', ip, context);
    }

    // Extract domains (exclude common false positives)
    const domainMatches = text.match(IOCExtractor.PATTERNS.domain) || [];
    for (const domain of domainMatches) {
      if (!this.isCommonFalsePositive(domain)) {
        this.addIOC('domain', domain.toLowerCase(), context);
      }
    }

    // Extract URLs
    const urlMatches = text.match(IOCExtractor.PATTERNS.url) || [];
    for (const url of urlMatches) {
      this.addIOC('url', url, context);
    }

    // Extract emails
    const emailMatches = text.match(IOCExtractor.PATTERNS.email) || [];
    for (const email of emailMatches) {
      this.addIOC('email', email.toLowerCase(), context);
    }

    // Extract hashes
    const md5Matches = text.match(IOCExtractor.PATTERNS.md5) || [];
    for (const hash of md5Matches) {
      this.addIOC('hash', hash.toLowerCase(), context);
    }

    const sha1Matches = text.match(IOCExtractor.PATTERNS.sha1) || [];
    for (const hash of sha1Matches) {
      this.addIOC('hash', hash.toLowerCase(), context);
    }

    const sha256Matches = text.match(IOCExtractor.PATTERNS.sha256) || [];
    for (const hash of sha256Matches) {
      this.addIOC('hash', hash.toLowerCase(), context);
    }

    // Extract CVEs
    const cveMatches = text.match(IOCExtractor.PATTERNS.cve) || [];
    for (const cve of cveMatches) {
      this.addIOC('cve', cve.toUpperCase(), context);
    }
  }

  /**
   * Add an IOC to the collection
   */
  private addIOC(type: IOC['type'], value: string, context?: string): void {
    const key = `${type}:${value}`;
    const existing = this.iocMap.get(key);

    if (existing) {
      existing.count++;
      if (context && existing.context && !existing.context.includes(context)) {
        existing.context += `, ${context}`;
      }
    } else {
      this.iocMap.set(key, {
        type,
        value,
        context,
        firstSeen: new Date(),
        count: 1,
      });
    }
  }

  /**
   * Get all extracted IOCs as a report
   */
  getReport(): IOCReport {
    const ips: IOC[] = [];
    const domains: IOC[] = [];
    const urls: IOC[] = [];
    const emails: IOC[] = [];
    const hashes: IOC[] = [];
    const cves: IOC[] = [];

    for (const ioc of this.iocMap.values()) {
      switch (ioc.type) {
        case 'ip':
          ips.push(ioc);
          break;
        case 'domain':
          domains.push(ioc);
          break;
        case 'url':
          urls.push(ioc);
          break;
        case 'email':
          emails.push(ioc);
          break;
        case 'hash':
          hashes.push(ioc);
          break;
        case 'cve':
          cves.push(ioc);
          break;
      }
    }

    // Sort by count (most frequent first)
    const sortByCount = (a: IOC, b: IOC) => b.count - a.count;
    ips.sort(sortByCount);
    domains.sort(sortByCount);
    urls.sort(sortByCount);
    emails.sort(sortByCount);
    hashes.sort(sortByCount);
    cves.sort(sortByCount);

    return {
      ips,
      domains,
      urls,
      emails,
      hashes,
      cves,
      totalCount: this.iocMap.size,
    };
  }

  /**
   * Export IOCs in STIX 2.1 format (simplified)
   */
  exportSTIX(): string {
    const report = this.getReport();
    const indicators: any[] = [];

    for (const ip of report.ips) {
      indicators.push({
        type: 'indicator',
        spec_version: '2.1',
        id: `indicator--${this.generateUUID()}`,
        created: ip.firstSeen.toISOString(),
        modified: new Date().toISOString(),
        pattern: `[ipv4-addr:value = '${ip.value}']`,
        pattern_type: 'stix',
        valid_from: ip.firstSeen.toISOString(),
        indicator_types: ['malicious-activity'],
      });
    }

    for (const domain of report.domains) {
      indicators.push({
        type: 'indicator',
        spec_version: '2.1',
        id: `indicator--${this.generateUUID()}`,
        created: domain.firstSeen.toISOString(),
        modified: new Date().toISOString(),
        pattern: `[domain-name:value = '${domain.value}']`,
        pattern_type: 'stix',
        valid_from: domain.firstSeen.toISOString(),
        indicator_types: ['malicious-activity'],
      });
    }

    return JSON.stringify(
      {
        type: 'bundle',
        id: `bundle--${this.generateUUID()}`,
        objects: indicators,
      },
      null,
      2
    );
  }

  /**
   * Check if IP is private (RFC1918)
   */
  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127
    );
  }

  /**
   * Check if IP is reserved
   */
  private isReservedIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    return (
      parts[0] === 0 ||
      parts[0] === 169 && parts[1] === 254 ||
      parts[0] >= 224
    );
  }

  /**
   * Check if domain is a common false positive
   */
  private isCommonFalsePositive(domain: string): boolean {
    const falsePositives = [
      'example.com',
      'example.org',
      'localhost.localdomain',
      'test.com',
      'local',
    ];

    return falsePositives.some(fp => domain.endsWith(fp));
  }

  /**
   * Generate a simple UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Clear all IOCs
   */
  clear(): void {
    this.iocMap.clear();
  }
}