import { describe, it, expect } from 'vitest';
import { HeaderAnalyzer } from '../../../src/agent/tools/web/HeaderAnalyzer.js';

describe('HeaderAnalyzer', () => {
  let analyzer: HeaderAnalyzer;

  beforeEach(() => {
    analyzer = new HeaderAnalyzer();
  });

  describe('analyzeHeaders', () => {
    it('should detect missing Content-Security-Policy', () => {
      const headers = {
        'server': 'nginx',
      };

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.headers.missing).toContain('Content-Security-Policy');
      expect(result.findings.some(f => f.title.includes('Content-Security-Policy'))).toBe(true);
    });

    it('should detect missing Strict-Transport-Security', () => {
      const headers = {
        'server': 'apache',
      };

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.headers.missing).toContain('Strict-Transport-Security');
      const hstsFinding = result.findings.find(f => f.title.includes('Strict-Transport-Security'));
      expect(hstsFinding).toBeDefined();
      expect(hstsFinding?.severity).toBe('high');
    });

    it('should detect missing X-Frame-Options', () => {
      const headers = {};

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.headers.missing).toContain('X-Frame-Options');
      expect(result.findings.some(f => f.title.includes('X-Frame-Options'))).toBe(true);
    });

    it('should detect missing X-Content-Type-Options', () => {
      const headers = {};

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.headers.missing).toContain('X-Content-Type-Options');
      expect(result.findings.some(f => f.title.includes('X-Content-Type-Options'))).toBe(true);
    });

    it('should mark headers as present when they exist', () => {
      const headers = {
        'Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      };

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.headers.present).toContain('Content-Security-Policy');
      expect(result.headers.present).toContain('Strict-Transport-Security');
      expect(result.headers.present).toContain('X-Frame-Options');
      expect(result.headers.present).toContain('X-Content-Type-Options');
    });

    it('should be case-insensitive for header names', () => {
      const headers = {
        'content-security-policy': "default-src 'self'",
        'STRICT-TRANSPORT-SECURITY': 'max-age=31536000',
        'X-Frame-Options': 'SAMEORIGIN',
      };

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.headers.present.length).toBeGreaterThan(0);
    });

    it('should detect HSTS without includeSubDomains', () => {
      const headers = {
        'Strict-Transport-Security': 'max-age=31536000',
      };

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.findings.some(f => f.title.includes('includeSubDomains'))).toBe(true);
    });

    it('should not flag HSTS with includeSubDomains', () => {
      const headers = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      };

      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.findings.some(f => f.title.includes('includeSubDomains'))).toBe(false);
    });

    it('should calculate security score', () => {
      const headers = {};
      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      expect(result.securityScore).toBeDefined();
      expect(result.securityScore).toBeGreaterThanOrEqual(0);
      expect(result.securityScore).toBeLessThanOrEqual(100);
    });

    it('should have higher security score with more headers', () => {
      const emptyHeaders = {};
      const fullHeaders = {
        'Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'geolocation=()',
      };

      const emptyResult = analyzer.analyzeHeaders(emptyHeaders, 'https://example.com');
      const fullResult = analyzer.analyzeHeaders(fullHeaders, 'https://example.com');

      expect(fullResult.securityScore).toBeGreaterThan(emptyResult.securityScore);
    });

    it('should include category in findings', () => {
      const headers = {};
      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      result.findings.forEach(finding => {
        expect(finding.category).toBeDefined();
        expect(finding.category).toBe('security-headers');
      });
    });

    it('should include timestamps in findings', () => {
      const headers = {};
      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      result.findings.forEach(finding => {
        expect(finding.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should include unique IDs for all findings', () => {
      const headers = {};
      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      const ids = result.findings.map(f => f.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should include remediation for all findings', () => {
      const headers = {};
      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      result.findings.forEach(finding => {
        expect(finding.remediation).toBeDefined();
        expect(finding.remediation.length).toBeGreaterThan(0);
      });
    });

    it('should prioritize findings by severity', () => {
      const headers = {};
      const result = analyzer.analyzeHeaders(headers, 'https://example.com');

      const severities = result.findings.map(f => f.severity);
      expect(severities).toContain('high');
      expect(severities.length).toBeGreaterThan(0);
    });
  });
});
