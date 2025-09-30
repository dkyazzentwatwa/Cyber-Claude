import { SecurityFinding } from '../../types.js';
import { v4 as uuidv4 } from 'uuid';

export interface HeaderAnalysisResult {
  findings: SecurityFinding[];
  securityScore: number;
  headers: {
    present: string[];
    missing: string[];
    insecure: string[];
  };
}

export class HeaderAnalyzer {
  /**
   * Analyze HTTP security headers
   */
  analyzeHeaders(headers: Record<string, string>, url: string): HeaderAnalysisResult {
    const findings: SecurityFinding[] = [];
    const present: string[] = [];
    const missing: string[] = [];
    const insecure: string[] = [];

    // Normalize header names to lowercase
    const normalizedHeaders: Record<string, string> = {};
    Object.keys(headers).forEach(key => {
      normalizedHeaders[key.toLowerCase()] = headers[key];
    });

    // Check Content-Security-Policy
    if (!normalizedHeaders['content-security-policy']) {
      missing.push('Content-Security-Policy');
      findings.push({
        id: uuidv4(),
        severity: 'medium',
        title: 'Missing Content-Security-Policy Header',
        description: 'The Content-Security-Policy (CSP) header is not set. CSP helps prevent XSS attacks by controlling which resources can be loaded.',
        remediation: 'Add a Content-Security-Policy header with appropriate directives for your application.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
        category: 'security-headers',
        timestamp: new Date(),
      });
    } else {
      present.push('Content-Security-Policy');
    }

    // Check Strict-Transport-Security
    if (!normalizedHeaders['strict-transport-security']) {
      missing.push('Strict-Transport-Security');
      findings.push({
        id: uuidv4(),
        severity: 'high',
        title: 'Missing Strict-Transport-Security Header',
        description: 'HSTS header is not set. This allows potential man-in-the-middle attacks.',
        remediation: 'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
        category: 'security-headers',
        timestamp: new Date(),
      });
    } else {
      present.push('Strict-Transport-Security');
      const hsts = normalizedHeaders['strict-transport-security'];
      if (!hsts.includes('includeSubDomains')) {
        findings.push({
          id: uuidv4(),
          severity: 'low',
          title: 'HSTS Missing includeSubDomains',
          description: 'HSTS header should include includeSubDomains directive.',
          remediation: 'Add includeSubDomains to your HSTS header.',
          category: 'security-headers',
          timestamp: new Date(),
        });
      }
    }

    // Check X-Frame-Options
    if (!normalizedHeaders['x-frame-options']) {
      missing.push('X-Frame-Options');
      findings.push({
        id: uuidv4(),
        severity: 'medium',
        title: 'Missing X-Frame-Options Header',
        description: 'Missing X-Frame-Options header makes the site vulnerable to clickjacking attacks.',
        remediation: 'Add: X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options'],
        category: 'security-headers',
        timestamp: new Date(),
      });
    } else {
      present.push('X-Frame-Options');
    }

    // Check X-Content-Type-Options
    if (!normalizedHeaders['x-content-type-options']) {
      missing.push('X-Content-Type-Options');
      findings.push({
        id: uuidv4(),
        severity: 'low',
        title: 'Missing X-Content-Type-Options Header',
        description: 'Missing X-Content-Type-Options can allow MIME-sniffing attacks.',
        remediation: 'Add: X-Content-Type-Options: nosniff',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
        category: 'security-headers',
        timestamp: new Date(),
      });
    } else {
      present.push('X-Content-Type-Options');
    }

    // Check Referrer-Policy
    if (!normalizedHeaders['referrer-policy']) {
      missing.push('Referrer-Policy');
      findings.push({
        id: uuidv4(),
        severity: 'info',
        title: 'Missing Referrer-Policy Header',
        description: 'Referrer-Policy controls how much referrer information is shared.',
        remediation: 'Add: Referrer-Policy: strict-origin-when-cross-origin or no-referrer',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'],
        category: 'security-headers',
        timestamp: new Date(),
      });
    } else {
      present.push('Referrer-Policy');
    }

    // Check Permissions-Policy
    if (!normalizedHeaders['permissions-policy']) {
      missing.push('Permissions-Policy');
      findings.push({
        id: uuidv4(),
        severity: 'info',
        title: 'Missing Permissions-Policy Header',
        description: 'Permissions-Policy controls browser features and APIs.',
        remediation: 'Add: Permissions-Policy with appropriate directives',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy'],
        category: 'security-headers',
        timestamp: new Date(),
      });
    } else {
      present.push('Permissions-Policy');
    }

    // Check for insecure headers
    if (normalizedHeaders['server']) {
      insecure.push('Server');
      findings.push({
        id: uuidv4(),
        severity: 'low',
        title: 'Server Header Information Disclosure',
        description: `Server header reveals: ${normalizedHeaders['server']}. This can help attackers identify vulnerabilities.`,
        remediation: 'Remove or obfuscate the Server header.',
        category: 'information-disclosure',
        timestamp: new Date(),
      });
    }

    if (normalizedHeaders['x-powered-by']) {
      insecure.push('X-Powered-By');
      findings.push({
        id: uuidv4(),
        severity: 'low',
        title: 'X-Powered-By Information Disclosure',
        description: `X-Powered-By header reveals: ${normalizedHeaders['x-powered-by']}. This exposes technology stack information.`,
        remediation: 'Remove the X-Powered-By header.',
        category: 'information-disclosure',
        timestamp: new Date(),
      });
    }

    // Calculate security score (0-100)
    const totalChecks = 6; // Number of important security headers
    const presentCount = present.length;
    const securityScore = Math.round((presentCount / totalChecks) * 100);

    return {
      findings,
      securityScore,
      headers: {
        present,
        missing,
        insecure,
      },
    };
  }

  /**
   * Analyze cookies for security issues
   */
  analyzeCookies(cookieHeader: string): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    if (!cookieHeader) {
      return findings;
    }

    const cookies = cookieHeader.split(';').map(c => c.trim());

    cookies.forEach(cookie => {
      const [nameValue, ...attributes] = cookie.split(';').map(c => c.trim());
      const [name] = nameValue.split('=');

      const hasSecure = attributes.some(attr => attr.toLowerCase() === 'secure');
      const hasHttpOnly = attributes.some(attr => attr.toLowerCase() === 'httponly');
      const hasSameSite = attributes.some(attr => attr.toLowerCase().startsWith('samesite'));

      if (!hasSecure) {
        findings.push({
          id: uuidv4(),
          severity: 'medium',
          title: `Cookie '${name}' Missing Secure Flag`,
          description: 'Cookie can be transmitted over unencrypted connections.',
          remediation: 'Add the Secure flag to all cookies.',
          category: 'cookie-security',
          timestamp: new Date(),
        });
      }

      if (!hasHttpOnly) {
        findings.push({
          id: uuidv4(),
          severity: 'medium',
          title: `Cookie '${name}' Missing HttpOnly Flag`,
          description: 'Cookie is accessible via JavaScript, increasing XSS risk.',
          remediation: 'Add the HttpOnly flag to prevent JavaScript access.',
          category: 'cookie-security',
          timestamp: new Date(),
        });
      }

      if (!hasSameSite) {
        findings.push({
          id: uuidv4(),
          severity: 'medium',
          title: `Cookie '${name}' Missing SameSite Attribute`,
          description: 'Cookie is vulnerable to CSRF attacks.',
          remediation: 'Add SameSite=Strict or SameSite=Lax attribute.',
          category: 'cookie-security',
          timestamp: new Date(),
        });
      }
    });

    return findings;
  }
}