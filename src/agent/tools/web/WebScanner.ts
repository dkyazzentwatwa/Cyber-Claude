import { HttpClient } from './HttpClient.js';
import { HeaderAnalyzer } from './HeaderAnalyzer.js';
import { Authorization } from './Authorization.js';
import { SecurityFinding, WebScanResult } from '../../types.js';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { VulnTester, VulnTestResult, TestTarget } from './testing/VulnTester.js';
import { PayloadType } from './payloads/PayloadDatabase.js';

export interface ScanOptions {
  timeout?: number;
  skipAuth?: boolean;
  ctfMode?: boolean;
  onProgress?: (message: string) => void;
  // Aggressive scan options
  aggressive?: boolean;
  testTypes?: PayloadType[];
  maxPayloadsPerType?: number;
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
   * Aggressive vulnerability scan with payload testing
   *
   * IMPORTANT: Only use with explicit authorization!
   * This performs active testing that sends potentially dangerous payloads.
   */
  async aggressiveScan(url: string, options: ScanOptions = {}): Promise<WebScanResult> {
    const progress = options.onProgress || (() => {});

    // Start with full scan
    const result = await this.fullScan(url, options);

    // Warn about aggressive scanning
    progress('⚠️  AGGRESSIVE SCAN: Testing with vulnerability payloads...');

    // Initialize vulnerability tester
    const vulnTester = new VulnTester({
      maxPayloadsPerType: options.maxPayloadsPerType || 10,
      timeout: options.timeout || 10000,
      testTypes: options.testTypes || ['sqli', 'xss', 'cmd_injection', 'path_traversal', 'ssrf'],
      rateLimitMs: 100,
    });

    // Get payload summary
    const payloadSummary = vulnTester.getPayloadSummary();
    progress(`📦 Loaded payloads: SQLi(${payloadSummary.sqli}), XSS(${payloadSummary.xss}), CmdInj(${payloadSummary.cmd_injection}), Path(${payloadSummary.path_traversal}), SSRF(${payloadSummary.ssrf})`);

    // Extract forms and parameters from the page
    progress('🔎 Extracting forms and parameters...');
    const response = await this.httpClient.get(url);
    const $ = cheerio.load(response.data);
    const targets = this.extractTestTargets(url, $);

    progress(`Found ${targets.length} test target(s)`);

    // Also test URL parameters if present
    const parsedUrl = new URL(url);
    if (parsedUrl.search) {
      const urlParams: Record<string, string> = {};
      parsedUrl.searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });
      if (Object.keys(urlParams).length > 0) {
        targets.push({
          url: `${parsedUrl.origin}${parsedUrl.pathname}`,
          method: 'GET',
          params: urlParams,
        });
      }
    }

    // Run vulnerability tests on each target
    const allVulnResults: VulnTestResult[] = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      progress(`Testing target ${i + 1}/${targets.length}: ${target.url} (${Object.keys(target.params).length} params)`);

      try {
        const vulnResults = await vulnTester.testAll(target);
        allVulnResults.push(...vulnResults);

        // Report findings as we go
        if (vulnResults.length > 0) {
          progress(`  ⚠️  Found ${vulnResults.length} vulnerability(s)!`);
        }
      } catch (error: any) {
        progress(`  ⚠️  Error testing target: ${error.message}`);
      }
    }

    // Convert vulnerability results to security findings
    for (const vulnResult of allVulnResults) {
      result.findings.push({
        id: uuidv4(),
        severity: vulnResult.severity,
        title: this.getVulnTitle(vulnResult.type),
        description: vulnResult.description,
        remediation: vulnResult.remediation,
        category: vulnResult.type,
        timestamp: new Date(),
        evidence: vulnResult.evidence ? {
          payload: vulnResult.payload,
          parameter: vulnResult.parameter,
          evidence: vulnResult.evidence,
        } : undefined,
      });
    }

    // Recalculate summary
    progress('📊 Compiling aggressive scan results...');
    result.summary = this.calculateSummary(result.findings);

    return result;
  }

  /**
   * Extract test targets from HTML
   */
  private extractTestTargets(baseUrl: string, $: cheerio.CheerioAPI): TestTarget[] {
    const targets: TestTarget[] = [];
    const parsedBase = new URL(baseUrl);

    // Extract forms
    $('form').each((_, form) => {
      const $form = $(form);
      let action = $form.attr('action') || baseUrl;
      const method = ($form.attr('method') || 'GET').toUpperCase() as 'GET' | 'POST';

      // Resolve relative URLs
      if (!action.startsWith('http')) {
        action = new URL(action, baseUrl).toString();
      }

      // Only test same-origin forms
      try {
        const actionUrl = new URL(action);
        if (actionUrl.hostname !== parsedBase.hostname) {
          return; // Skip cross-origin forms
        }
      } catch {
        return;
      }

      // Extract form parameters
      const params: Record<string, string> = {};
      $form.find('input, select, textarea').each((_, input) => {
        const $input = $(input);
        const name = $input.attr('name');
        if (name) {
          params[name] = $input.attr('value') || 'test';
        }
      });

      if (Object.keys(params).length > 0) {
        targets.push({ url: action, method, params });
      }
    });

    // Extract links with parameters
    $('a[href]').each((_, link) => {
      const href = $(link).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        return;
      }

      try {
        const linkUrl = new URL(href, baseUrl);
        if (linkUrl.hostname !== parsedBase.hostname) {
          return; // Skip cross-origin links
        }

        if (linkUrl.search) {
          const params: Record<string, string> = {};
          linkUrl.searchParams.forEach((value, key) => {
            params[key] = value;
          });
          if (Object.keys(params).length > 0) {
            targets.push({
              url: `${linkUrl.origin}${linkUrl.pathname}`,
              method: 'GET',
              params,
            });
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    // Deduplicate targets
    const seen = new Set<string>();
    return targets.filter(target => {
      const key = `${target.method}:${target.url}:${Object.keys(target.params).sort().join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get vulnerability title from type
   */
  private getVulnTitle(type: PayloadType): string {
    const titles: Record<PayloadType, string> = {
      sqli: 'SQL Injection Vulnerability',
      xss: 'Cross-Site Scripting (XSS) Vulnerability',
      cmd_injection: 'Command Injection Vulnerability',
      path_traversal: 'Path Traversal Vulnerability',
      ssrf: 'Server-Side Request Forgery (SSRF) Vulnerability',
    };
    return titles[type] || 'Vulnerability';
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