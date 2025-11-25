/**
 * Vulnerability Tester
 *
 * Orchestrates vulnerability testing using payloads and detection
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { PayloadDatabase, Payload, PayloadType } from '../payloads/PayloadDatabase.js';
import { VulnDetector, DetectionResult } from './VulnDetector.js';
import { logger } from '../../../../utils/logger.js';

export interface VulnTestResult {
  vulnerable: boolean;
  type: PayloadType;
  payload: string;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
  confidence: 'high' | 'medium' | 'low';
  parameter?: string;
  url: string;
}

export interface TestTarget {
  url: string;
  method: 'GET' | 'POST';
  params: Record<string, string>;
  headers?: Record<string, string>;
}

export interface TestOptions {
  maxPayloadsPerType?: number;
  timeout?: number;
  followRedirects?: boolean;
  rateLimitMs?: number; // Delay between requests
  testTypes?: PayloadType[];
}

const DEFAULT_OPTIONS: TestOptions = {
  maxPayloadsPerType: 10,
  timeout: 10000,
  followRedirects: true,
  rateLimitMs: 100,
  testTypes: ['sqli', 'xss', 'cmd_injection', 'path_traversal', 'ssrf'],
};

export class VulnTester {
  private payloadDb: PayloadDatabase;
  private detector: VulnDetector;
  private httpClient: AxiosInstance;
  private options: TestOptions;

  constructor(options: TestOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.payloadDb = new PayloadDatabase();
    this.detector = new VulnDetector();

    this.httpClient = axios.create({
      timeout: this.options.timeout,
      maxRedirects: this.options.followRedirects ? 5 : 0,
      validateStatus: () => true, // Accept all status codes
    });
  }

  /**
   * Test a target for SQL injection vulnerabilities
   */
  async testSQLInjection(target: TestTarget): Promise<VulnTestResult[]> {
    const results: VulnTestResult[] = [];
    const payloads = this.payloadDb
      .getSQLiPayloads()
      .slice(0, this.options.maxPayloadsPerType);

    for (const payload of payloads) {
      for (const [param, _value] of Object.entries(target.params)) {
        try {
          const testParams = { ...target.params, [param]: payload.payload };
          const response = await this.makeRequest(target, testParams);

          const detection = this.detector.detectSQLError(response.data || '');

          if (detection.detected) {
            results.push({
              vulnerable: true,
              type: 'sqli',
              payload: payload.payload,
              evidence: detection.evidence || '',
              severity: payload.riskLevel,
              description: `Parameter '${param}' is vulnerable to SQL injection (${payload.category || 'unknown'})`,
              remediation:
                'Use parameterized queries or prepared statements. Never concatenate user input directly into SQL queries.',
              confidence: detection.confidence,
              parameter: param,
              url: target.url,
            });
          }

          await this.rateLimit();
        } catch (error) {
          logger.debug(`SQLi test error for ${param}: ${error}`);
        }
      }
    }

    return results;
  }

  /**
   * Test a target for XSS vulnerabilities
   */
  async testXSS(target: TestTarget): Promise<VulnTestResult[]> {
    const results: VulnTestResult[] = [];
    const payloads = this.payloadDb
      .getXSSPayloads()
      .slice(0, this.options.maxPayloadsPerType);

    for (const payload of payloads) {
      for (const [param, _value] of Object.entries(target.params)) {
        try {
          const testParams = { ...target.params, [param]: payload.payload };
          const response = await this.makeRequest(target, testParams);

          const detection = this.detector.detectXSS(
            response.data || '',
            payload.payload
          );

          if (detection.detected) {
            results.push({
              vulnerable: true,
              type: 'xss',
              payload: payload.payload,
              evidence: detection.evidence || '',
              severity: payload.riskLevel,
              description: `Parameter '${param}' is vulnerable to XSS (${payload.category || 'unknown'})`,
              remediation:
                'Encode output appropriately for the context (HTML, JavaScript, URL, CSS). Use Content-Security-Policy headers.',
              confidence: detection.confidence,
              parameter: param,
              url: target.url,
            });
          }

          await this.rateLimit();
        } catch (error) {
          logger.debug(`XSS test error for ${param}: ${error}`);
        }
      }
    }

    return results;
  }

  /**
   * Test a target for command injection vulnerabilities
   */
  async testCommandInjection(target: TestTarget): Promise<VulnTestResult[]> {
    const results: VulnTestResult[] = [];
    const payloads = this.payloadDb
      .getCommandInjectionPayloads()
      .slice(0, this.options.maxPayloadsPerType);

    for (const payload of payloads) {
      for (const [param, _value] of Object.entries(target.params)) {
        try {
          const testParams = { ...target.params, [param]: payload.payload };
          const response = await this.makeRequest(target, testParams);

          const detection = this.detector.detectCommandInjection(
            response.data || ''
          );

          if (detection.detected) {
            results.push({
              vulnerable: true,
              type: 'cmd_injection',
              payload: payload.payload,
              evidence: detection.evidence || '',
              severity: payload.riskLevel,
              description: `Parameter '${param}' is vulnerable to command injection (${payload.category || 'unknown'})`,
              remediation:
                'Avoid passing user input to system commands. If necessary, use allowlists and proper escaping. Consider using safer APIs.',
              confidence: detection.confidence,
              parameter: param,
              url: target.url,
            });
          }

          await this.rateLimit();
        } catch (error) {
          logger.debug(`Command injection test error for ${param}: ${error}`);
        }
      }
    }

    return results;
  }

  /**
   * Test a target for path traversal vulnerabilities
   */
  async testPathTraversal(target: TestTarget): Promise<VulnTestResult[]> {
    const results: VulnTestResult[] = [];
    const payloads = this.payloadDb
      .getPathTraversalPayloads()
      .slice(0, this.options.maxPayloadsPerType);

    for (const payload of payloads) {
      for (const [param, _value] of Object.entries(target.params)) {
        try {
          const testParams = { ...target.params, [param]: payload.payload };
          const response = await this.makeRequest(target, testParams);

          const detection = this.detector.detectPathTraversal(
            response.data || ''
          );

          if (detection.detected) {
            results.push({
              vulnerable: true,
              type: 'path_traversal',
              payload: payload.payload,
              evidence: detection.evidence || '',
              severity: payload.riskLevel,
              description: `Parameter '${param}' is vulnerable to path traversal (${payload.category || 'unknown'})`,
              remediation:
                'Validate and sanitize file paths. Use allowlists for permitted files/directories. Avoid using user input in file operations.',
              confidence: detection.confidence,
              parameter: param,
              url: target.url,
            });
          }

          await this.rateLimit();
        } catch (error) {
          logger.debug(`Path traversal test error for ${param}: ${error}`);
        }
      }
    }

    return results;
  }

  /**
   * Test a target for SSRF vulnerabilities
   */
  async testSSRF(target: TestTarget): Promise<VulnTestResult[]> {
    const results: VulnTestResult[] = [];
    const payloads = this.payloadDb
      .getSSRFPayloads()
      .slice(0, this.options.maxPayloadsPerType);

    for (const payload of payloads) {
      for (const [param, _value] of Object.entries(target.params)) {
        try {
          const testParams = { ...target.params, [param]: payload.payload };
          const response = await this.makeRequest(target, testParams);

          const detection = this.detector.detectSSRF(response.data || '');

          if (detection.detected) {
            results.push({
              vulnerable: true,
              type: 'ssrf',
              payload: payload.payload,
              evidence: detection.evidence || '',
              severity: payload.riskLevel,
              description: `Parameter '${param}' is vulnerable to SSRF (${payload.category || 'unknown'})`,
              remediation:
                'Validate and allowlist URLs. Block internal IP ranges. Use network segmentation. Disable unnecessary URL schemes.',
              confidence: detection.confidence,
              parameter: param,
              url: target.url,
            });
          }

          await this.rateLimit();
        } catch (error) {
          logger.debug(`SSRF test error for ${param}: ${error}`);
        }
      }
    }

    return results;
  }

  /**
   * Run all vulnerability tests on a target
   */
  async testAll(target: TestTarget): Promise<VulnTestResult[]> {
    const results: VulnTestResult[] = [];
    const testTypes = this.options.testTypes || [];

    if (testTypes.includes('sqli')) {
      results.push(...(await this.testSQLInjection(target)));
    }
    if (testTypes.includes('xss')) {
      results.push(...(await this.testXSS(target)));
    }
    if (testTypes.includes('cmd_injection')) {
      results.push(...(await this.testCommandInjection(target)));
    }
    if (testTypes.includes('path_traversal')) {
      results.push(...(await this.testPathTraversal(target)));
    }
    if (testTypes.includes('ssrf')) {
      results.push(...(await this.testSSRF(target)));
    }

    return results;
  }

  /**
   * Make HTTP request with test parameters
   */
  private async makeRequest(
    target: TestTarget,
    params: Record<string, string>
  ): Promise<{ data: string; status: number; time: number }> {
    const startTime = Date.now();

    const config: AxiosRequestConfig = {
      method: target.method,
      url: target.url,
      headers: target.headers || {},
    };

    if (target.method === 'GET') {
      config.params = params;
    } else {
      config.data = params;
    }

    try {
      const response = await this.httpClient.request(config);
      return {
        data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        status: response.status,
        time: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        data: error.response?.data || '',
        status: error.response?.status || 0,
        time: Date.now() - startTime,
      };
    }
  }

  /**
   * Rate limit between requests
   */
  private async rateLimit(): Promise<void> {
    if (this.options.rateLimitMs) {
      await new Promise(resolve => setTimeout(resolve, this.options.rateLimitMs));
    }
  }

  /**
   * Get payload summary
   */
  getPayloadSummary(): Record<PayloadType, number> {
    return this.payloadDb.getPayloadSummary();
  }
}
