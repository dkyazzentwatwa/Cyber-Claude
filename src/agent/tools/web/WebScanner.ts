import { HttpClient } from './HttpClient.js';
import { HeaderAnalyzer } from './HeaderAnalyzer.js';
import { Authorization } from './Authorization.js';
import { SecurityFinding, WebScanResult } from '../../types.js';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

export interface ScanOptions {
  timeout?: number;
  skipAuth?: boolean;
  ctfMode?: boolean;
  onProgress?: (message: string) => void;
}

export class WebScanner {
  private httpClient: HttpClient;
  private headerAnalyzer: HeaderAnalyzer;
  private authorization: Authorization;

  constructor() {
    this.httpClient = new HttpClient();
    this.headerAnalyzer = new HeaderAnalyzer();
    this.authorization = new Authorization();
  }

  /**
   * Quick security scan - headers and basic checks
   */
  async quickScan(url: string, options: ScanOptions = {}): Promise<WebScanResult> {
    const progress = options.onProgress || (() => {});

    // Authorization check
    progress('🔍 Validating URL and checking authorization...');
    if (!options.skipAuth) {
      const authResult = await this.authorization.checkAuthorization(url);
      if (!authResult.authorized) {
        throw new Error(`Authorization failed: ${authResult.reason}`);
      }
    }

    const startTime = Date.now();
    const parsedUrl = new URL(url);

    try {
      // Fetch the page
      progress('📡 Fetching page content...');
      const response = await this.httpClient.get(url);

      // Analyze headers
      progress('🔒 Analyzing security headers...');
      const headerAnalysis = this.headerAnalyzer.analyzeHeaders(response.headers, url);

      // Parse HTML for basic info
      progress('📝 Parsing HTML content...');
      const $ = cheerio.load(response.data);
      const title = $('title').text();

      // Create findings list
      const findings: SecurityFinding[] = [...headerAnalysis.findings];

      // Create result
      const result: WebScanResult = {
        url,
        target: {
          url,
          hostname: parsedUrl.hostname,
          protocol: parsedUrl.protocol.replace(':', ''),
          port: parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80),
        },
        technology: {
          server: response.headers['server'],
        },
        headers: response.headers,
        findings,
        summary: this.calculateSummary(findings),
        scanTime: new Date(startTime),
        duration: Date.now() - startTime,
      };

      return result;
    } catch (error: any) {
      throw new Error(`Scan failed: ${error.message}`);
    }
  }

  /**
   * Full vulnerability scan
   */
  async fullScan(url: string, options: ScanOptions = {}): Promise<WebScanResult> {
    const progress = options.onProgress || (() => {});

    // Start with quick scan
    const result = await this.quickScan(url, options);

    // Add more comprehensive checks
    progress('🔎 Performing deep vulnerability analysis...');
    const $ = cheerio.load((await this.httpClient.get(url)).data);

    // Check for forms (CSRF potential)
    progress('📋 Checking forms for CSRF protection...');
    const forms = $('form');
    if (forms.length > 0) {
      forms.each((_, form) => {
        const $form = $(form);
        const action = $form.attr('action') || '';
        const method = $form.attr('method') || 'get';

        // Check for CSRF token
        const hasCSRFToken =
          $form.find('input[name*="csrf"]').length > 0 ||
          $form.find('input[name*="token"]').length > 0;

        if (method.toLowerCase() === 'post' && !hasCSRFToken) {
          result.findings.push({
            id: uuidv4(),
            severity: 'high',
            title: 'Potential CSRF Vulnerability',
            description: `Form at ${action || 'current page'} may lack CSRF protection`,
            remediation: 'Implement CSRF tokens for all state-changing operations',
            category: 'csrf',
            timestamp: new Date(),
          });
        }
      });
    }

    // Check for inline scripts (CSP related)
    progress('⚡ Testing for XSS vulnerabilities...');
    const inlineScripts = $('script:not([src])');
    if (inlineScripts.length > 0 && !result.headers?.['content-security-policy']) {
      result.findings.push({
        id: uuidv4(),
        severity: 'medium',
        title: 'Inline Scripts Without CSP',
        description: `Found ${inlineScripts.length} inline script(s) without Content-Security-Policy`,
        remediation: 'Implement Content-Security-Policy to control script execution',
        category: 'xss',
        timestamp: new Date(),
      });
    }

    // Recalculate summary
    progress('📊 Compiling scan results...');
    result.summary = this.calculateSummary(result.findings);

    return result;
  }

  /**
   * Calculate findings summary
   */
  private calculateSummary(findings: SecurityFinding[]) {
    return {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
    };
  }
}