/**
 * Smart Contract Security Scanner
 *
 * Three-tier scanning approach:
 * 1. quickScan - Pattern matching only (~5 seconds)
 * 2. fullScan - Static + external tools (~60-120 seconds)
 * 3. aggressiveScan - Dynamic testing with Foundry (~5-10 minutes)
 *
 * Based on Anthropic's SCONE-bench research methodology.
 */

import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  ContractSource,
  Web3ScanOptions,
  Web3ScanResult,
  Web3Finding,
  ParsedContract,
  ExternalToolResult,
} from './types.js';
import { SolidityParser } from './SolidityParser.js';
import { DetectorRegistry } from './detectors/index.js';
import { hashSource } from '../../../utils/web3.js';

export class SmartContractScanner {
  private parser: SolidityParser;
  private detectors: DetectorRegistry;

  constructor() {
    this.parser = new SolidityParser();
    this.detectors = new DetectorRegistry();
  }

  /**
   * Quick scan - Pattern matching only
   * Fast, no external dependencies required
   */
  async quickScan(source: ContractSource, options: Web3ScanOptions = {}): Promise<Web3ScanResult> {
    const progress = options.onProgress || (() => {});
    const startTime = Date.now();

    progress('Parsing contract source...');
    const parsed = await this.parser.parse(source);

    progress('Running built-in vulnerability detectors...');
    const findings = await this.detectors.analyzeAll(parsed);

    // Filter by minimum severity if specified
    const filteredFindings = options.minSeverity
      ? this.filterBySeverity(findings, options.minSeverity)
      : findings;

    // Limit findings if specified
    const limitedFindings = options.maxFindings
      ? filteredFindings.slice(0, options.maxFindings)
      : filteredFindings;

    progress(`Found ${limitedFindings.length} potential vulnerabilities`);

    return this.buildResult(source, parsed, limitedFindings, startTime);
  }

  /**
   * Full scan - Static analysis + external tools
   * Requires: slither, mythril, solhint (optional)
   */
  async fullScan(source: ContractSource, options: Web3ScanOptions = {}): Promise<Web3ScanResult> {
    const progress = options.onProgress || (() => {});

    // Start with quick scan
    const result = await this.quickScan(source, options);

    // Run external tools if available
    result.staticAnalysis = {};

    if (options.useSlither !== false) {
      progress('Running Slither static analysis...');
      const slitherResult = await this.runSlither(source);
      result.staticAnalysis.slither = slitherResult;
      if (slitherResult.findings.length > 0) {
        result.findings.push(...slitherResult.findings);
      }
    }

    if (options.useMythril !== false) {
      progress('Running Mythril symbolic execution...');
      const mythrilResult = await this.runMythril(source);
      result.staticAnalysis.mythril = mythrilResult;
      if (mythrilResult.findings.length > 0) {
        result.findings.push(...mythrilResult.findings);
      }
    }

    if (options.useSolhint !== false) {
      progress('Running Solhint linting...');
      const solhintResult = await this.runSolhint(source);
      result.staticAnalysis.solhint = solhintResult;
      if (solhintResult.findings.length > 0) {
        result.findings.push(...solhintResult.findings);
      }
    }

    // Deduplicate findings
    result.findings = this.deduplicateFindings(result.findings);

    // Recalculate summary
    result.summary = this.calculateSummary(result.findings);
    result.duration = Date.now() - result.scanTime.getTime();

    progress(`Full scan complete. Found ${result.findings.length} issues.`);

    return result;
  }

  /**
   * Aggressive scan - Dynamic testing with Foundry
   * Requires: forge, cast, anvil
   * WARNING: Only use with explicit authorization!
   */
  async aggressiveScan(source: ContractSource, options: Web3ScanOptions = {}): Promise<Web3ScanResult> {
    const progress = options.onProgress || (() => {});

    // Start with full scan
    const result = await this.fullScan(source, options);

    progress('Setting up Foundry testing environment...');
    const foundryAvailable = await this.checkFoundryAvailable();

    if (!foundryAvailable) {
      progress('Foundry not available. Skipping dynamic testing.');
      progress('Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup');
      return result;
    }

    progress('Running dynamic exploit tests with Foundry...');
    result.dynamicAnalysis = {
      exploitsAttempted: 0,
      exploitsSuccessful: 0,
      anvilForkBlock: options.forkBlock,
    };

    // Generate and run exploit tests based on findings
    const exploitTests = await this.generateExploitTests(source, result.findings, options);
    result.dynamicAnalysis.foundryTests = exploitTests;
    result.dynamicAnalysis.exploitsAttempted = exploitTests.length;
    result.dynamicAnalysis.exploitsSuccessful = exploitTests.filter(t => t.exploitSuccessful).length;

    // Update findings with dynamic evidence
    for (const test of exploitTests) {
      if (test.exploitSuccessful) {
        const finding = result.findings.find(f =>
          f.title.toLowerCase().includes(test.testName.toLowerCase().replace('test_', '').replace(/_/g, ' '))
        );
        if (finding) {
          finding.foundryEvidence = {
            testName: test.testName,
            exploitPOC: test.output,
            gasUsed: test.gasUsed,
          };
          // Upgrade severity if exploit confirmed
          if (finding.severity !== 'critical') {
            finding.severity = 'critical';
          }
        }
      }
    }

    result.summary = this.calculateSummary(result.findings);
    result.duration = Date.now() - result.scanTime.getTime();

    progress(`Aggressive scan complete. ${result.dynamicAnalysis.exploitsSuccessful}/${result.dynamicAnalysis.exploitsAttempted} exploits confirmed.`);

    return result;
  }

  /**
   * Build scan result from parsed contract and findings
   */
  private buildResult(
    source: ContractSource,
    parsed: ParsedContract,
    findings: Web3Finding[],
    startTime: number
  ): Web3ScanResult {
    const mainContract = parsed.contracts[0];

    return {
      contract: {
        name: mainContract?.name || parsed.name,
        path: source.path,
        address: source.address,
        network: source.network,
        compiler: parsed.pragma || undefined,
        sourceHash: hashSource(parsed.source),
      },
      findings,
      summary: this.calculateSummary(findings),
      scanTime: new Date(startTime),
      duration: Date.now() - startTime,
      metrics: this.calculateMetrics(parsed),
    };
  }

  /**
   * Calculate code metrics
   */
  private calculateMetrics(parsed: ParsedContract) {
    const lines = parsed.source.split('\n');
    const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*'));
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*') || l.trim().startsWith('*'));

    let functionCount = 0;
    let publicFunctions = 0;
    let stateVariables = 0;
    let externalCalls = 0;

    for (const contract of parsed.contracts) {
      functionCount += contract.functions.length;
      publicFunctions += contract.functions.filter(f =>
        f.visibility === 'public' || f.visibility === 'external'
      ).length;
      stateVariables += contract.stateVariables.length;

      // Count external calls
      for (const func of contract.functions) {
        const body = func.body || '';
        externalCalls += (body.match(/\.call\(|\.send\(|\.transfer\(|\.delegatecall\(/g) || []).length;
      }
    }

    return {
      totalLines: lines.length,
      codeLines: codeLines.length,
      commentLines: commentLines.length,
      contractCount: parsed.contracts.length,
      functionCount,
      publicFunctions,
      externalCalls,
      stateVariables,
    };
  }

  /**
   * Calculate severity summary
   */
  private calculateSummary(findings: Web3Finding[]) {
    return {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
    };
  }

  /**
   * Filter findings by minimum severity
   */
  private filterBySeverity(findings: Web3Finding[], minSeverity: string): Web3Finding[] {
    const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    return findings.filter(f => severityOrder.indexOf(f.severity) >= minIndex);
  }

  /**
   * Deduplicate findings by title and location
   */
  private deduplicateFindings(findings: Web3Finding[]): Web3Finding[] {
    const seen = new Map<string, Web3Finding>();

    for (const finding of findings) {
      const key = `${finding.title}-${finding.contractName}-${finding.functionName}-${finding.lineNumber}`;
      const existing = seen.get(key);

      if (!existing || this.getSeverityWeight(finding.severity) > this.getSeverityWeight(existing.severity)) {
        seen.set(key, finding);
      }
    }

    return Array.from(seen.values());
  }

  private getSeverityWeight(severity: string): number {
    const weights: Record<string, number> = {
      'info': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'critical': 5,
    };
    return weights[severity] || 0;
  }

  /**
   * Check if Foundry is available
   */
  private async checkFoundryAvailable(): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync('forge --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run Slither static analysis
   */
  private async runSlither(source: ContractSource): Promise<ExternalToolResult> {
    const startTime = Date.now();
    const result: ExternalToolResult = {
      tool: 'slither',
      version: 'unknown',
      available: false,
      findings: [],
      duration: 0,
    };

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check if slither is available
      const { stdout: version } = await execAsync('slither --version');
      result.version = version.trim();
      result.available = true;

      // Run slither on the source file
      if (source.type === 'file' && source.path) {
        const { stdout } = await execAsync(`slither ${source.path} --json -`, {
          timeout: 120000,
        });
        result.rawOutput = stdout;
        result.findings = this.parseSlitherOutput(stdout);
      }
    } catch (error: any) {
      result.error = error.message;
      // Try to parse output even on error (slither exits non-zero when findings exist)
      if (error.stdout) {
        result.rawOutput = error.stdout;
        result.findings = this.parseSlitherOutput(error.stdout);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Parse Slither JSON output
   */
  private parseSlitherOutput(output: string): Web3Finding[] {
    const findings: Web3Finding[] = [];

    try {
      const data = JSON.parse(output);
      const detectors = data.results?.detectors || [];

      for (const detector of detectors) {
        findings.push({
          id: uuidv4(),
          severity: this.mapSlitherSeverity(detector.impact),
          title: detector.check,
          description: detector.description,
          remediation: detector.recommendation || undefined,
          references: detector.references || [],
          category: 'smart-contract',
          timestamp: new Date(),
          vulnerabilityType: this.mapSlitherToVulnType(detector.check),
          contractName: detector.elements?.[0]?.name || 'Unknown',
          functionName: detector.elements?.[0]?.function || undefined,
          lineNumber: detector.elements?.[0]?.source_mapping?.lines?.[0],
        });
      }
    } catch {
      // Output wasn't valid JSON, ignore
    }

    return findings;
  }

  private mapSlitherSeverity(impact: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Informational': 'info',
      'Optimization': 'info',
    };
    return map[impact] || 'medium';
  }

  private mapSlitherToVulnType(check: string): Web3Finding['vulnerabilityType'] {
    const map: Record<string, Web3Finding['vulnerabilityType']> = {
      'reentrancy': 'reentrancy',
      'arbitrary-send': 'access-control',
      'suicidal': 'self-destruct',
      'uninitialized-state': 'uninitialized-storage',
      'tx-origin': 'tx-origin-auth',
    };

    for (const [key, value] of Object.entries(map)) {
      if (check.toLowerCase().includes(key)) {
        return value;
      }
    }
    return 'access-control';
  }

  /**
   * Run Mythril symbolic execution
   */
  private async runMythril(source: ContractSource): Promise<ExternalToolResult> {
    const startTime = Date.now();
    const result: ExternalToolResult = {
      tool: 'mythril',
      version: 'unknown',
      available: false,
      findings: [],
      duration: 0,
    };

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check if mythril is available
      const { stdout: version } = await execAsync('myth version');
      result.version = version.trim();
      result.available = true;

      // Run mythril on the source file
      if (source.type === 'file' && source.path) {
        const { stdout } = await execAsync(`myth analyze ${source.path} -o json`, {
          timeout: 300000, // 5 minute timeout for symbolic execution
        });
        result.rawOutput = stdout;
        result.findings = this.parseMythrilOutput(stdout);
      }
    } catch (error: any) {
      result.error = error.message;
      if (error.stdout) {
        result.rawOutput = error.stdout;
        result.findings = this.parseMythrilOutput(error.stdout);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Parse Mythril JSON output
   */
  private parseMythrilOutput(output: string): Web3Finding[] {
    const findings: Web3Finding[] = [];

    try {
      const data = JSON.parse(output);
      const issues = data.issues || [];

      for (const issue of issues) {
        findings.push({
          id: uuidv4(),
          severity: this.mapMythrilSeverity(issue.severity),
          title: issue.title,
          description: issue.description,
          remediation: issue.remediation || undefined,
          references: [],
          category: 'smart-contract',
          timestamp: new Date(),
          vulnerabilityType: this.mapMythrilToVulnType(issue.swc_id),
          contractName: issue.contract || 'Unknown',
          lineNumber: issue.lineno,
          swcId: issue.swc_id,
        });
      }
    } catch {
      // Output wasn't valid JSON, ignore
    }

    return findings;
  }

  private mapMythrilSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
    };
    return map[severity] || 'medium';
  }

  private mapMythrilToVulnType(swcId: string): Web3Finding['vulnerabilityType'] {
    const map: Record<string, Web3Finding['vulnerabilityType']> = {
      'SWC-107': 'reentrancy',
      'SWC-101': 'integer-overflow',
      'SWC-115': 'tx-origin-auth',
      'SWC-105': 'access-control',
      'SWC-106': 'self-destruct',
      'SWC-112': 'delegatecall-injection',
    };
    return map[swcId] || 'access-control';
  }

  /**
   * Run Solhint linting
   */
  private async runSolhint(source: ContractSource): Promise<ExternalToolResult> {
    const startTime = Date.now();
    const result: ExternalToolResult = {
      tool: 'solhint',
      version: 'unknown',
      available: false,
      findings: [],
      duration: 0,
    };

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check if solhint is available
      const { stdout: version } = await execAsync('solhint --version');
      result.version = version.trim();
      result.available = true;

      // Run solhint on the source file
      if (source.type === 'file' && source.path) {
        const { stdout } = await execAsync(`solhint ${source.path} -f json`, {
          timeout: 60000,
        });
        result.rawOutput = stdout;
        result.findings = this.parseSolhintOutput(stdout);
      }
    } catch (error: any) {
      result.error = error.message;
      if (error.stdout) {
        result.rawOutput = error.stdout;
        result.findings = this.parseSolhintOutput(error.stdout);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Parse Solhint JSON output
   */
  private parseSolhintOutput(output: string): Web3Finding[] {
    const findings: Web3Finding[] = [];

    try {
      const data = JSON.parse(output);

      for (const file of data) {
        for (const message of file.messages || []) {
          // Only include security-related lints
          if (!message.ruleId?.includes('security')) {
            continue;
          }

          findings.push({
            id: uuidv4(),
            severity: message.severity === 2 ? 'medium' : 'low',
            title: message.ruleId,
            description: message.message,
            category: 'smart-contract',
            timestamp: new Date(),
            vulnerabilityType: 'access-control',
            contractName: path.basename(file.filePath),
            lineNumber: message.line,
          });
        }
      }
    } catch {
      // Output wasn't valid JSON, ignore
    }

    return findings;
  }

  /**
   * Generate exploit tests based on findings
   */
  private async generateExploitTests(
    source: ContractSource,
    findings: Web3Finding[],
    options: Web3ScanOptions
  ): Promise<Array<{ testName: string; passed: boolean; gasUsed?: number; exploitSuccessful?: boolean; output?: string }>> {
    // This is a placeholder for dynamic exploit generation
    // In a full implementation, this would:
    // 1. Generate Foundry test files based on vulnerability type
    // 2. Run `forge test` with the generated tests
    // 3. Parse test results to confirm exploitability

    const tests: Array<{ testName: string; passed: boolean; gasUsed?: number; exploitSuccessful?: boolean; output?: string }> = [];

    // For now, return empty array - full Foundry integration would be added here
    return tests;
  }
}
