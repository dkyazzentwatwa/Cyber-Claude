import { describe, it, expect, beforeEach } from 'vitest';
import { IOCExtractor } from '../../src/utils/ioc.js';

describe('IOCExtractor', () => {
  let extractor: IOCExtractor;

  beforeEach(() => {
    extractor = new IOCExtractor();
  });

  describe('IP Address Extraction', () => {
    it('should extract valid IPv4 addresses', () => {
      const text = 'Connection from 192.0.2.1 to 198.51.100.42';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.ips).toHaveLength(2);
      expect(report.ips.some(ip => ip.value === '192.0.2.1')).toBe(true);
      expect(report.ips.some(ip => ip.value === '198.51.100.42')).toBe(true);
    });

    it('should filter out private IP addresses', () => {
      const text = 'Private IPs: 10.0.0.1, 192.168.1.1, 172.16.0.1, 127.0.0.1';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.ips).toHaveLength(0);
    });

    it('should filter out reserved IP addresses', () => {
      const text = 'Reserved: 0.0.0.0, 169.254.1.1, 224.0.0.1, 255.255.255.255';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.ips).toHaveLength(0);
    });

    it('should extract IPv6 addresses', () => {
      const text = 'IPv6 address: 2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.ips).toHaveLength(1);
      expect(report.ips[0].value).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });
  });

  describe('Domain Extraction', () => {
    it('should extract valid domain names', () => {
      const text = 'Connect to malware.evil.com and badactor.org';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.domains).toHaveLength(2);
      expect(report.domains.some(d => d.value === 'malware.evil.com')).toBe(true);
      expect(report.domains.some(d => d.value === 'badactor.org')).toBe(true);
    });

    it('should filter out common false positives', () => {
      const text = 'example.com, test.com, localhost.localdomain';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.domains).toHaveLength(0);
    });

    it('should normalize domains to lowercase', () => {
      const text = 'Domain: EVIL.COM';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.domains[0].value).toBe('evil.com');
    });
  });

  describe('URL Extraction', () => {
    it('should extract HTTP and HTTPS URLs', () => {
      const text = 'Visit http://malware.com/payload.exe or https://phishing.net/login';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.urls).toHaveLength(2);
      expect(report.urls.some(u => u.value.includes('http://malware.com/payload.exe'))).toBe(true);
      expect(report.urls.some(u => u.value.includes('https://phishing.net/login'))).toBe(true);
    });
  });

  describe('Email Extraction', () => {
    it('should extract valid email addresses', () => {
      const text = 'Contact: attacker@evil.com or victim@company.org';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.emails).toHaveLength(2);
      expect(report.emails.some(e => e.value === 'attacker@evil.com')).toBe(true);
      expect(report.emails.some(e => e.value === 'victim@company.org')).toBe(true);
    });

    it('should normalize emails to lowercase', () => {
      const text = 'Email: ADMIN@EXAMPLE.COM';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.emails[0].value).toBe('admin@example.com');
    });
  });

  describe('Hash Extraction', () => {
    it('should extract MD5 hashes', () => {
      const text = 'MD5: 5d41402abc4b2a76b9719d911017c592';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.hashes).toHaveLength(1);
      expect(report.hashes[0].value).toBe('5d41402abc4b2a76b9719d911017c592');
    });

    it('should extract SHA1 hashes', () => {
      const text = 'SHA1: aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.hashes).toHaveLength(1);
      expect(report.hashes[0].value).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    });

    it('should extract SHA256 hashes', () => {
      const text = 'SHA256: 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.hashes).toHaveLength(1);
      expect(report.hashes[0].value).toBe('2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae');
    });
  });

  describe('CVE Extraction', () => {
    it('should extract CVE identifiers', () => {
      const text = 'Vulnerabilities: CVE-2021-44228, cve-2023-12345';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.cves).toHaveLength(2);
      expect(report.cves.some(c => c.value === 'CVE-2021-44228')).toBe(true);
      expect(report.cves.some(c => c.value === 'CVE-2023-12345')).toBe(true);
    });

    it('should normalize CVEs to uppercase', () => {
      const text = 'cve-2023-00001';
      extractor.extractFromText(text);
      const report = extractor.getReport();

      expect(report.cves[0].value).toBe('CVE-2023-00001');
    });
  });

  describe('Context Tracking', () => {
    it('should track IOC context', () => {
      const text = 'Malicious IP: 1.2.3.4';
      extractor.extractFromText(text, 'DNS Query');
      const report = extractor.getReport();

      expect(report.ips[0].context).toBe('DNS Query');
    });

    it('should append multiple contexts', () => {
      extractor.extractFromText('IP: 1.2.3.4', 'Context 1');
      extractor.extractFromText('IP: 1.2.3.4', 'Context 2');
      const report = extractor.getReport();

      expect(report.ips[0].context).toContain('Context 1');
      expect(report.ips[0].context).toContain('Context 2');
    });
  });

  describe('Frequency Counting', () => {
    it('should count IOC occurrences', () => {
      extractor.extractFromText('IP: 1.2.3.4');
      extractor.extractFromText('IP: 1.2.3.4');
      extractor.extractFromText('IP: 1.2.3.4');
      const report = extractor.getReport();

      expect(report.ips[0].count).toBe(3);
    });

    it('should sort by frequency', () => {
      extractor.extractFromText('1.2.3.4');
      extractor.extractFromText('5.6.7.8 5.6.7.8 5.6.7.8');
      extractor.extractFromText('9.10.11.12 9.10.11.12');
      const report = extractor.getReport();

      expect(report.ips[0].value).toBe('5.6.7.8'); // Most frequent
      expect(report.ips[1].value).toBe('9.10.11.12');
      expect(report.ips[2].value).toBe('1.2.3.4');
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', () => {
      const text = `
        IP: 1.2.3.4
        Domain: malware.com
        URL: http://evil.net/payload
        Email: attacker@bad.org
        Hash: 5d41402abc4b2a76b9719d911017c592
        CVE: CVE-2023-12345
      `;
      extractor.extractFromText(text);
      const report = extractor.getReport();

      // Note: URLs and emails also extract domains, so total may be higher
      expect(report.totalCount).toBeGreaterThanOrEqual(6);
      expect(report.ips).toHaveLength(1);
      expect(report.domains.length).toBeGreaterThanOrEqual(2); // malware.com, evil.net, bad.org
      expect(report.urls).toHaveLength(1);
      expect(report.emails).toHaveLength(1);
      expect(report.hashes).toHaveLength(1);
      expect(report.cves).toHaveLength(1);
    });
  });

  describe('STIX Export', () => {
    it('should export IOCs in STIX 2.1 format', () => {
      extractor.extractFromText('IP: 1.2.3.4, Domain: evil.com');
      const stix = extractor.exportSTIX();
      const bundle = JSON.parse(stix);

      expect(bundle.type).toBe('bundle');
      expect(bundle.id).toMatch(/^bundle--/);
      expect(bundle.objects).toHaveLength(2);
      expect(bundle.objects[0].type).toBe('indicator');
      expect(bundle.objects[0].spec_version).toBe('2.1');
    });

    it('should include correct STIX patterns', () => {
      extractor.extractFromText('IP: 1.2.3.4');
      const stix = extractor.exportSTIX();
      const bundle = JSON.parse(stix);

      expect(bundle.objects[0].pattern).toBe("[ipv4-addr:value = '1.2.3.4']");
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all IOCs', () => {
      extractor.extractFromText('IP: 1.2.3.4, Domain: evil.com');
      extractor.clear();
      const report = extractor.getReport();

      expect(report.totalCount).toBe(0);
      expect(report.ips).toHaveLength(0);
    });
  });
});
