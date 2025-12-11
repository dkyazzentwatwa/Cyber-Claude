/**
 * Web3/Smart Contract Security CLI Command
 *
 * Usage:
 *   cyber-claude web3 scan <file|address> [options]
 *   cyber-claude web3 audit <file|address> [options]
 */

import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { SmartContractScanner } from '../../agent/tools/web3/SmartContractScanner.js';
import { Web3Reporter } from '../../agent/tools/web3/reporter/Web3Reporter.js';
import { config, validateConfig } from '../../utils/config.js';
import { getModelByKey } from '../../utils/models.js';
import { parseContractTarget, isValidNetwork, getSupportedNetworks } from '../../utils/web3.js';
import { ContractSource, NetworkType, Web3ScanResult } from '../../agent/tools/web3/types.js';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Create the main web3 command with subcommands
 */
export function createWeb3Command(): Command {
  const command = new Command('web3');

  command
    .description('Smart contract security analysis and Web3 testing')
    .addCommand(createScanSubcommand())
    .addCommand(createAuditSubcommand())
    .addCommand(createToolsSubcommand());

  return command;
}

/**
 * Scan subcommand - vulnerability scanning
 */
function createScanSubcommand(): Command {
  return new Command('scan')
    .description('Scan smart contract for security vulnerabilities')
    .argument('<target>', 'Contract file path (.sol), address (0x...), or "-" for stdin')
    .option('-q, --quick', 'Quick scan (pattern matching only, ~5 seconds)')
    .option('-f, --full', 'Full scan with external tools (~1-2 minutes)')
    .option('-a, --aggressive', 'Aggressive scan with Foundry dynamic testing (~5-10 minutes)')
    .option('-n, --network <network>', 'Network for on-chain contracts (mainnet, polygon, etc.)', 'mainnet')
    .option('--rpc <url>', 'Custom RPC endpoint URL')
    .option('--no-slither', 'Skip Slither static analysis')
    .option('--no-mythril', 'Skip Mythril symbolic execution')
    .option('--no-solhint', 'Skip Solhint linting')
    .option('--fork-block <number>', 'Block number to fork from (aggressive mode)')
    .option('--model <model>', 'AI model for analysis (opus-4.1, sonnet-4.5, etc.)')
    .option('--min-severity <level>', 'Minimum severity to report (info, low, medium, high, critical)', 'low')
    .option('--max-findings <number>', 'Maximum number of findings to report')
    .option('--json <file>', 'Export results to JSON file')
    .option('--md <file>', 'Export results to Markdown file')
    .option('--no-ai', 'Skip AI analysis of findings')
    .action(async (target: string, options) => {
      try {
        // Validate configuration
        const validation = validateConfig();
        if (!validation.valid) {
          ui.error('Configuration Error:');
          validation.errors.forEach(err => ui.error(`  ${err}`));
          process.exit(1);
        }

        // Validate network
        if (options.network && !isValidNetwork(options.network)) {
          ui.error(`Invalid network: ${options.network}`);
          ui.info(`Supported networks: ${getSupportedNetworks().join(', ')}`);
          process.exit(1);
        }

        // Display header
        console.log('');
        ui.section(`Smart Contract Security Scan`);
        console.log('');

        // Parse target
        const parsedTarget = parseContractTarget(target);
        const source: ContractSource = {
          type: parsedTarget.type,
          path: parsedTarget.type === 'file' ? parsedTarget.value : undefined,
          address: parsedTarget.type === 'address' ? parsedTarget.value : undefined,
          network: options.network as NetworkType,
        };

        // Handle stdin
        if (parsedTarget.type === 'source') {
          console.log('Reading from stdin...');
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          source.code = Buffer.concat(chunks).toString('utf-8');
        }

        // Verify file exists
        if (source.type === 'file' && source.path) {
          try {
            await fs.access(source.path);
          } catch {
            ui.error(`File not found: ${source.path}`);
            process.exit(1);
          }
          console.log(`Target: ${path.resolve(source.path)}`);
        } else if (source.type === 'address') {
          console.log(`Target: ${source.address} on ${source.network}`);
        }

        // Determine scan mode
        const scanMode = options.aggressive ? 'aggressive' :
                         options.full ? 'full' : 'quick';
        console.log(`Mode: ${scanMode} scan`);
        console.log('');

        // Progress callback
        const onProgress = (message: string) => {
          console.log(`  ${message}`);
        };

        // Initialize scanner
        const scanner = new SmartContractScanner();
        const reporter = new Web3Reporter();

        // Perform scan
        let result: Web3ScanResult;

        if (options.aggressive) {
          ui.warning('AGGRESSIVE SCAN: Dynamic testing with Foundry enabled');
          console.log('This may take several minutes...');
          console.log('');

          result = await scanner.aggressiveScan(source, {
            onProgress,
            network: options.network,
            rpcUrl: options.rpc,
            useSlither: options.slither !== false,
            useMythril: options.mythril !== false,
            useSolhint: options.solhint !== false,
            forkBlock: options.forkBlock ? parseInt(options.forkBlock) : undefined,
            minSeverity: options.minSeverity,
            maxFindings: options.maxFindings ? parseInt(options.maxFindings) : undefined,
          });
        } else if (options.full) {
          result = await scanner.fullScan(source, {
            onProgress,
            network: options.network,
            rpcUrl: options.rpc,
            useSlither: options.slither !== false,
            useMythril: options.mythril !== false,
            useSolhint: options.solhint !== false,
            minSeverity: options.minSeverity,
            maxFindings: options.maxFindings ? parseInt(options.maxFindings) : undefined,
          });
        } else {
          result = await scanner.quickScan(source, {
            onProgress,
            minSeverity: options.minSeverity,
            maxFindings: options.maxFindings ? parseInt(options.maxFindings) : undefined,
          });
        }

        console.log('');
        ui.success(`Scan completed in ${(result.duration / 1000).toFixed(1)}s`);
        console.log('');

        // Display results
        reporter.displayTerminalReport(result);

        // AI Analysis (if enabled and findings exist)
        if (options.ai !== false && result.findings.length > 0 && (config.anthropicApiKey || config.googleApiKey)) {
          console.log('');

          // Determine model
          let modelId = config.model;
          if (options.model) {
            const modelConfig = getModelByKey(options.model);
            if (!modelConfig) {
              ui.warning(`Invalid model: ${options.model}, using default`);
            } else {
              modelId = modelConfig.id;
            }
          }

          const agent = new CyberAgent({
            mode: 'smartcontract',
            apiKey: config.anthropicApiKey,
            googleApiKey: config.googleApiKey,
            model: modelId,
          });

          const spinner = ui.spinner('Analyzing findings with AI...');

          const analysisPrompt = `Analyze these smart contract security findings from a ${scanMode} scan.
Contract: ${result.contract.name}
Compiler: ${result.contract.compiler || 'Unknown'}

Findings (${result.findings.length} total):
${JSON.stringify(result.findings.slice(0, 10), null, 2)}

Please:
1. Prioritize findings by actual exploitability and impact
2. Identify any false positives based on common patterns
3. Suggest specific remediation code in Solidity
4. Note any relationships between findings that could enable attack chains`;

          const analysis = await agent.analyze(analysisPrompt, result);
          spinner.succeed('AI analysis complete');

          console.log('');
          ui.section('AI Security Analysis');
          console.log('');
          console.log(ui.formatAIResponse(analysis));
          console.log('');
        }

        // Export options
        if (options.json) {
          await reporter.exportJSON(result, options.json);
          ui.success(`JSON report saved to: ${options.json}`);
        }

        if (options.md) {
          await reporter.exportMarkdown(result, options.md);
          ui.success(`Markdown report saved to: ${options.md}`);
        }

        // Auto-save to /scans directory
        const savedPath = await reporter.saveToScansDir(result);
        ui.success(`Scan results saved to: ${savedPath}`);

        // Exit with error code if critical/high findings
        if (result.summary.critical > 0 || result.summary.high > 0) {
          process.exit(1);
        }

      } catch (error: any) {
        ui.error(`Scan failed: ${error.message}`);
        process.exit(1);
      }
    });
}

/**
 * Audit subcommand - interactive AI-powered audit
 */
function createAuditSubcommand(): Command {
  return new Command('audit')
    .description('Interactive AI-powered security audit')
    .argument('<target>', 'Contract file path or address')
    .option('-n, --network <network>', 'Network for on-chain contracts', 'mainnet')
    .option('--model <model>', 'AI model (recommended: opus-4.1 for deep analysis)')
    .action(async (target: string, options) => {
      try {
        const validation = validateConfig();
        if (!validation.valid) {
          ui.error('Configuration Error:');
          validation.errors.forEach(err => ui.error(`  ${err}`));
          process.exit(1);
        }

        if (!config.anthropicApiKey && !config.googleApiKey) {
          ui.error('AI API key required for audit mode');
          ui.info('Set ANTHROPIC_API_KEY or GOOGLE_API_KEY environment variable');
          process.exit(1);
        }

        console.log('');
        ui.section('Smart Contract Security Audit');
        console.log('');
        console.log('Starting interactive audit session...');
        console.log('This mode performs a comprehensive analysis with AI guidance.');
        console.log('');

        // Parse target
        const parsedTarget = parseContractTarget(target);
        const source: ContractSource = {
          type: parsedTarget.type,
          path: parsedTarget.type === 'file' ? parsedTarget.value : undefined,
          address: parsedTarget.type === 'address' ? parsedTarget.value : undefined,
          network: options.network as NetworkType,
        };

        // First, run full scan
        const scanner = new SmartContractScanner();
        const reporter = new Web3Reporter();

        console.log('Phase 1: Running comprehensive security scan...');
        console.log('');

        const result = await scanner.fullScan(source, {
          onProgress: (msg) => console.log(`  ${msg}`),
        });

        console.log('');
        reporter.displayTerminalReport(result);

        // Then interactive AI session
        console.log('');
        console.log('Phase 2: AI-powered analysis...');
        console.log('');

        let modelId = config.model;
        if (options.model) {
          const modelConfig = getModelByKey(options.model);
          if (modelConfig) {
            modelId = modelConfig.id;
          }
        }

        const agent = new CyberAgent({
          mode: 'smartcontract',
          apiKey: config.anthropicApiKey,
          googleApiKey: config.googleApiKey,
          model: modelId,
        });

        // Read source code for context
        let sourceCode = '';
        if (source.type === 'file' && source.path) {
          sourceCode = await fs.readFile(source.path, 'utf-8');
        }

        const auditPrompt = `You are conducting a comprehensive security audit of a smart contract.

Contract: ${result.contract.name}
Compiler: ${result.contract.compiler || 'Unknown'}
Metrics: ${JSON.stringify(result.metrics, null, 2)}

Automated scan found ${result.findings.length} issues:
${JSON.stringify(result.findings, null, 2)}

${sourceCode ? `Source Code:\n\`\`\`solidity\n${sourceCode.slice(0, 8000)}\n\`\`\`` : ''}

Please provide a comprehensive security audit report including:
1. Executive Summary - Overall security posture
2. Critical Findings - Issues requiring immediate attention
3. Detailed Analysis - Deep dive into each vulnerability
4. Attack Scenarios - How an attacker could exploit these issues
5. Remediation Plan - Specific code fixes with examples
6. Best Practices - Additional hardening recommendations
7. Audit Conclusion - Final assessment and recommendations`;

        const analysis = await agent.analyze(auditPrompt, { result, sourceCode: sourceCode.slice(0, 8000) });

        console.log('');
        ui.section('Security Audit Report');
        console.log('');
        console.log(ui.formatAIResponse(analysis));
        console.log('');

        // Save full audit report
        const savedPath = await reporter.saveToScansDir(result, analysis);
        ui.success(`Full audit report saved to: ${savedPath}`);

      } catch (error: any) {
        ui.error(`Audit failed: ${error.message}`);
        process.exit(1);
      }
    });
}

/**
 * Tools subcommand - check available tools
 */
function createToolsSubcommand(): Command {
  return new Command('tools')
    .description('Check available Web3 security tools')
    .action(async () => {
      const { ExternalToolManager } = await import('../../agent/tools/ExternalToolManager.js');

      console.log('');
      ui.section('Web3 Security Tools');
      console.log('');

      const allTools = await ExternalToolManager.scan();

      // Filter to web3 tools
      const web3Tools = ['slither', 'mythril', 'solhint', 'forge', 'cast', 'anvil'];

      for (const toolName of web3Tools) {
        const tool = allTools.get(toolName);
        if (tool) {
          const status = tool.available ? '✓' : '✗';
          const color = tool.available ? '\x1b[32m' : '\x1b[31m';
          const version = tool.version ? ` (${tool.version})` : '';
          console.log(`${color}${status}\x1b[0m ${tool.name}${version}`);
          console.log(`  ${tool.description}`);
          if (!tool.available && tool.installInstructions) {
            console.log(`  Install: ${tool.installInstructions}`);
          }
          console.log('');
        }
      }

      const available = web3Tools.filter(t => allTools.get(t)?.available).length;
      console.log(`${available}/${web3Tools.length} tools available`);

      if (available < web3Tools.length) {
        console.log('');
        ui.info('Install missing tools for full scanning capabilities');
      }
    });
}
