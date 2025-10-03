/**
 * Tool Executor - Unified tool execution for agentic operations
 * Handles both built-in commands and MCP tools
 */

import { Step, StepResult, ToolDefinition } from '../types.js';
import { getTool } from './registry.js';
import { logger } from '../../utils/logger.js';
import {
  NucleiMCP,
  SSLScanMCP,
  NmapMCP,
  SQLmapMCP,
  FFUFMCP,
  WPScanMCP,
  MobSFMCP,
  GowitnessMCP,
  CeroMCP,
} from '../../mcp/tools/index.js';
import { DesktopScanner } from './scanner.js';
import { WebScanner } from './web/WebScanner.js';
import { PcapAnalyzer } from './PcapAnalyzer.js';
import { OSINTOrchestrator } from './osint/index.js';
import { HardeningChecker } from './hardening.js';

/**
 * Execution options
 */
export interface ExecutionOptions {
  timeout?: number;
  retryAttempts?: number;
  requireApproval?: boolean;
  verbose?: boolean;
}

/**
 * Built-in tool executors
 */
const BUILTIN_EXECUTORS: Record<string, (params: any, options?: ExecutionOptions) => Promise<any>> = {
  scan: async (params: any, options?: ExecutionOptions) => {
    logger.info(`Executing desktop security scan...`);
    const scanner = new DesktopScanner();

    // Choose scan type based on mode parameter
    const mode = params.mode || 'normal';
    const result = mode === 'quick'
      ? await scanner.quickCheck()
      : await scanner.scanSystem();

    if (result.success && result.data) {
      return {
        success: true,
        findings: result.data.findings || [],
        summary: result.data.summary,
      };
    }

    throw new Error(result.error || 'Scan failed');
  },

  webscan: async (params: any, options?: ExecutionOptions) => {
    logger.info(`Executing web security scan on ${params.url}...`);
    const scanner = new WebScanner();

    // Choose scan depth
    const depth = params.depth || 2;
    const aggressive = params.aggressive || false;

    const result = aggressive || depth > 2
      ? await scanner.fullScan(params.url)
      : await scanner.quickScan(params.url);

    return result;
  },

  mobilescan: async (params: any, options?: ExecutionOptions) => {
    logger.info(`Executing mobile app scan on ${params.file}...`);
    // Use MobSF MCP tool
    return await MobSFMCP.scan({
      filePath: params.file,
      scanType: params.scanType || 'static',
    });
  },

  pcap: async (params: any, options?: ExecutionOptions) => {
    logger.info(`Executing pcap analysis on ${params.file}...`);
    const analyzer = new PcapAnalyzer();

    const result = await analyzer.analyze(params.file, {
      maxPackets: 10000, // Reasonable limit for autonomous execution
    });

    return {
      success: true,
      packetCount: result.packetCount,
      protocols: result.protocolStats,
      conversations: result.conversations,
      dnsQueries: result.dnsQueries?.length || 0,
      httpRequests: result.httpRequests?.length || 0,
    };
  },

  recon: async (params: any, options?: ExecutionOptions) => {
    logger.info(`Executing OSINT reconnaissance on ${params.target}...`);
    const orchestrator = new OSINTOrchestrator();

    // Determine recon depth
    const depth = params.depth || 'standard';
    const quick = depth === 'quick' || depth === 'surface';

    const result = quick
      ? await orchestrator.quickScan(params.target)
      : await orchestrator.fullScan(params.target);

    return {
      success: true,
      target: result.target,
      scanType: result.scanType,
      results: result.results,
      summary: result.summary,
    };
  },

  harden: async (params: any, options?: ExecutionOptions) => {
    logger.info(`Executing security hardening check...`);
    const checker = new HardeningChecker();

    const result = await checker.checkHardening();

    if (result.success && result.data) {
      return {
        success: true,
        findings: result.data.findings || [],
        summary: result.data.summary,
      };
    }

    throw new Error(result.error || 'Hardening check failed');
  },
};

/**
 * MCP tool executors
 */
const MCP_EXECUTORS: Record<string, (params: any, options?: ExecutionOptions) => Promise<any>> = {
  nuclei: async (params: any, options?: ExecutionOptions) => {
    return await NucleiMCP.scan({
      target: params.target,
      templates: params.templates,
      severity: params.severity || 'medium',
    });
  },

  nmap: async (params: any, options?: ExecutionOptions) => {
    return await NmapMCP.scan({
      target: params.target,
      ports: params.ports || 'top-1000',
      scanType: params.serviceDetection !== false ? 'service' : 'fast',
    });
  },

  sslscan: async (params: any, options?: ExecutionOptions) => {
    return await SSLScanMCP.scan({
      host: params.target,
      port: params.port || 443,
    });
  },

  sqlmap: async (params: any, options?: ExecutionOptions) => {
    return await SQLmapMCP.scan({
      url: params.url,
      data: params.data,
      level: params.level || 1,
      risk: 1,
    });
  },

  ffuf: async (params: any, options?: ExecutionOptions) => {
    return await FFUFMCP.scan({
      target: params.target,
      wordlist: params.wordlist,
      extensions: params.extensions,
    });
  },

  wpscan: async (params: any, options?: ExecutionOptions) => {
    return await WPScanMCP.scan({
      target: params.url,
      enumerate: params.enumerate || ['vp', 'vt'],
      apiToken: params.apiToken,
    });
  },

  mobsf: async (params: any, options?: ExecutionOptions) => {
    return await MobSFMCP.scan({
      filePath: params.file,
      scanType: params.scanType || 'static',
    });
  },

  gowitness: async (params: any, options?: ExecutionOptions) => {
    return await GowitnessMCP.scan({
      targets: [params.url],
      fullPage: params.fullPage || false,
    });
  },

  cero: async (params: any, options?: ExecutionOptions) => {
    return await CeroMCP.scan({
      domain: params.domain,
      includeExpired: params.includeExpired || false,
    });
  },

};

/**
 * Main ToolExecutor class
 */
export class ToolExecutor {
  private static executors = { ...BUILTIN_EXECUTORS, ...MCP_EXECUTORS };

  /**
   * Execute a step with the specified tool
   */
  static async executeStep(
    step: Step,
    attemptNumber: number = 1,
    options?: ExecutionOptions
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Validate tool exists
      const toolDef = getTool(step.tool);
      if (!toolDef) {
        throw new Error(`Tool '${step.tool}' not found in registry`);
      }

      // Check if executor exists
      const executor = this.executors[step.tool];
      if (!executor) {
        throw new Error(`No executor found for tool '${step.tool}'`);
      }

      // Validate parameters
      this.validateParameters(step.parameters, toolDef);

      // Log execution
      logger.info(`Executing step ${step.stepNumber}: ${step.description}`);
      logger.debug(`Tool: ${step.tool}, Parameters: ${JSON.stringify(step.parameters)}`);

      // Execute with timeout
      const timeout = options?.timeout || step.estimatedDuration || 60000;
      const output = await this.executeWithTimeout(
        executor(step.parameters, options),
        timeout
      );

      const duration = Date.now() - startTime;

      return {
        stepId: step.id,
        success: true,
        output,
        duration,
        timestamp: new Date(),
        toolUsed: step.tool,
        attemptNumber,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Step ${step.stepNumber} failed: ${errorMessage}`);

      return {
        stepId: step.id,
        success: false,
        output: null,
        error: errorMessage,
        duration,
        timestamp: new Date(),
        toolUsed: step.tool,
        attemptNumber,
      };
    }
  }

  /**
   * Validate parameters against tool definition
   */
  private static validateParameters(
    params: Record<string, any>,
    toolDef: ToolDefinition
  ): void {
    // Check required parameters
    for (const param of toolDef.parameters) {
      if (param.required && !(param.name in params)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }

    // Type validation could be added here
    // For now, we trust the AI to provide correct types
  }

  /**
   * Execute with timeout
   */
  private static async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Execute multiple steps in parallel
   */
  static async executeParallel(
    steps: Step[],
    options?: ExecutionOptions
  ): Promise<StepResult[]> {
    logger.info(`Executing ${steps.length} steps in parallel...`);

    const promises = steps.map((step) => this.executeStep(step, 1, options));
    return await Promise.all(promises);
  }

  /**
   * Execute steps sequentially
   */
  static async executeSequential(
    steps: Step[],
    options?: ExecutionOptions
  ): Promise<StepResult[]> {
    const results: StepResult[] = [];

    for (const step of steps) {
      const result = await this.executeStep(step, 1, options);
      results.push(result);

      // Stop on critical failure if configured
      if (!result.success && step.riskLevel === 'high') {
        logger.warn(`High-risk step failed, stopping sequential execution`);
        break;
      }
    }

    return results;
  }

  /**
   * Retry a failed step
   */
  static async retryStep(
    step: Step,
    previousAttempt: number,
    maxAttempts: number = 3,
    options?: ExecutionOptions
  ): Promise<StepResult> {
    if (previousAttempt >= maxAttempts) {
      throw new Error(`Step ${step.id} failed after ${maxAttempts} attempts`);
    }

    logger.info(`Retrying step ${step.stepNumber}, attempt ${previousAttempt + 1}/${maxAttempts}`);

    // Add exponential backoff
    const backoffMs = Math.min(1000 * Math.pow(2, previousAttempt), 10000);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));

    return await this.executeStep(step, previousAttempt + 1, options);
  }

  /**
   * Check if a tool is available
   */
  static isToolAvailable(toolName: string): boolean {
    return toolName in this.executors;
  }

  /**
   * Get available tools
   */
  static getAvailableTools(): string[] {
    return Object.keys(this.executors);
  }
}
