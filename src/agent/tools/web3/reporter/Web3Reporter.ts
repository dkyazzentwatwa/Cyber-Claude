/**
 * Web3 Security Scan Reporter
 *
 * Formats and exports smart contract scan results
 * to terminal, JSON, and Markdown formats.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { Web3ScanResult, Web3Finding, ExploitReference } from '../types.js';

export class Web3Reporter {
  /**
   * Display results in terminal
   */
  displayTerminalReport(result: Web3ScanResult): void {
    // Contract info
    console.log('Contract Information:');
    console.log(`  Name: ${result.contract.name}`);
    if (result.contract.address) {
      console.log(`  Address: ${result.contract.address}`);
      console.log(`  Network: ${result.contract.network}`);
    }
    if (result.contract.compiler) {
      console.log(`  Compiler: Solidity ${result.contract.compiler}`);
    }
    console.log('');

    // Code metrics
    if (result.metrics) {
      console.log('Code Metrics:');
      console.log(`  Total Lines: ${result.metrics.totalLines}`);
      console.log(`  Code Lines: ${result.metrics.codeLines}`);
      console.log(`  Contracts: ${result.metrics.contractCount}`);
      console.log(`  Functions: ${result.metrics.functionCount} (${result.metrics.publicFunctions} public/external)`);
      console.log(`  State Variables: ${result.metrics.stateVariables}`);
      console.log(`  External Calls: ${result.metrics.externalCalls}`);
      console.log('');
    }

    // Summary
    console.log('Findings Summary:');
    console.log(`  Total: ${result.summary.total}`);
    if (result.summary.critical > 0) {
      console.log(`  \x1b[31m\x1b[1mCritical: ${result.summary.critical}\x1b[0m`);
    }
    if (result.summary.high > 0) {
      console.log(`  \x1b[31mHigh: ${result.summary.high}\x1b[0m`);
    }
    if (result.summary.medium > 0) {
      console.log(`  \x1b[33mMedium: ${result.summary.medium}\x1b[0m`);
    }
    if (result.summary.low > 0) {
      console.log(`  \x1b[32mLow: ${result.summary.low}\x1b[0m`);
    }
    if (result.summary.info > 0) {
      console.log(`  \x1b[36mInfo: ${result.summary.info}\x1b[0m`);
    }
    console.log('');

    // External tool status
    if (result.staticAnalysis) {
      console.log('External Tools:');
      for (const [tool, data] of Object.entries(result.staticAnalysis)) {
        if (data) {
          const status = data.available ? `✓ ${data.findings.length} findings` : '✗ not available';
          console.log(`  ${tool}: ${status}`);
        }
      }
      console.log('');
    }

    // Dynamic analysis
    if (result.dynamicAnalysis) {
      console.log('Dynamic Analysis:');
      console.log(`  Exploits Attempted: ${result.dynamicAnalysis.exploitsAttempted}`);
      console.log(`  Exploits Confirmed: ${result.dynamicAnalysis.exploitsSuccessful}`);
      if (result.dynamicAnalysis.anvilForkBlock) {
        console.log(`  Fork Block: ${result.dynamicAnalysis.anvilForkBlock}`);
      }
      console.log('');
    }

    // Detailed findings (top 10)
    if (result.findings.length > 0) {
      console.log('Top Findings:');
      console.log('');

      const sortedFindings = [...result.findings].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      for (const finding of sortedFindings.slice(0, 10)) {
        this.displayFinding(finding);
      }

      if (result.findings.length > 10) {
        console.log(`  ... and ${result.findings.length - 10} more findings`);
        console.log('');
      }
    }
  }

  /**
   * Display a single finding
   */
  private displayFinding(finding: Web3Finding): void {
    const severityColors: Record<string, string> = {
      critical: '\x1b[31m\x1b[1m',  // Bold red
      high: '\x1b[31m',              // Red
      medium: '\x1b[33m',            // Yellow
      low: '\x1b[32m',               // Green
      info: '\x1b[36m',              // Cyan
    };
    const color = severityColors[finding.severity] || '';
    const reset = '\x1b[0m';

    console.log(`  ${color}[${finding.severity.toUpperCase()}]${reset} ${finding.title}`);
    console.log(`    Contract: ${finding.contractName}${finding.functionName ? ` :: ${finding.functionName}()` : ''}`);
    if (finding.lineNumber) {
      console.log(`    Location: Line ${finding.lineNumber}`);
    }
    if (finding.swcId) {
      console.log(`    SWC: ${finding.swcId}`);
    }
    console.log(`    ${finding.description.slice(0, 200)}${finding.description.length > 200 ? '...' : ''}`);

    // Show real-world exploit references if available
    if (finding.realWorldExploits && finding.realWorldExploits.length > 0) {
      console.log(`    \x1b[35mReal-world exploits:\x1b[0m`);
      for (const exploit of finding.realWorldExploits.slice(0, 2)) {
        console.log(`      - ${exploit.protocol} (${exploit.date}) - ${exploit.lossAmount || 'N/A'}`);
      }
    }
    console.log('');
  }

  /**
   * Export results to JSON file
   */
  async exportJSON(result: Web3ScanResult, filepath: string): Promise<void> {
    const json = JSON.stringify(result, null, 2);
    await fs.writeFile(filepath, json, 'utf-8');
  }

  /**
   * Export results to Markdown file
   */
  async exportMarkdown(result: Web3ScanResult, filepath: string, analysis?: string): Promise<void> {
    const markdown = this.formatMarkdown(result, analysis);
    await fs.writeFile(filepath, markdown, 'utf-8');
  }

  /**
   * Save to /scans directory
   */
  async saveToScansDir(result: Web3ScanResult, analysis?: string): Promise<string> {
    const scansDir = path.join(process.cwd(), 'scans');
    await fs.mkdir(scansDir, { recursive: true });

    const contractName = result.contract.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `web3_${contractName}_${timestamp}.md`;
    const filepath = path.join(scansDir, filename);

    const markdown = this.formatMarkdown(result, analysis);
    await fs.writeFile(filepath, markdown, 'utf-8');

    return filepath;
  }

  /**
   * Format results as Markdown
   */
  private formatMarkdown(result: Web3ScanResult, analysis?: string): string {
    const lines: string[] = [];

    // Header
    lines.push('# Smart Contract Security Scan Report');
    lines.push('');
    lines.push(`**Contract:** ${result.contract.name}`);
    if (result.contract.address) {
      lines.push(`**Address:** \`${result.contract.address}\``);
      lines.push(`**Network:** ${result.contract.network}`);
    }
    if (result.contract.path) {
      lines.push(`**File:** ${result.contract.path}`);
    }
    if (result.contract.compiler) {
      lines.push(`**Compiler:** Solidity ${result.contract.compiler}`);
    }
    lines.push(`**Scan Date:** ${new Date(result.scanTime).toLocaleString()}`);
    lines.push(`**Duration:** ${(result.duration / 1000).toFixed(1)}s`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    lines.push(`| Critical | ${result.summary.critical} |`);
    lines.push(`| High | ${result.summary.high} |`);
    lines.push(`| Medium | ${result.summary.medium} |`);
    lines.push(`| Low | ${result.summary.low} |`);
    lines.push(`| Info | ${result.summary.info} |`);
    lines.push(`| **Total** | **${result.summary.total}** |`);
    lines.push('');

    // Code Metrics
    if (result.metrics) {
      lines.push('## Code Metrics');
      lines.push('');
      lines.push(`- **Total Lines:** ${result.metrics.totalLines}`);
      lines.push(`- **Code Lines:** ${result.metrics.codeLines}`);
      lines.push(`- **Comment Lines:** ${result.metrics.commentLines}`);
      lines.push(`- **Contracts:** ${result.metrics.contractCount}`);
      lines.push(`- **Functions:** ${result.metrics.functionCount} (${result.metrics.publicFunctions} public/external)`);
      lines.push(`- **State Variables:** ${result.metrics.stateVariables}`);
      lines.push(`- **External Calls:** ${result.metrics.externalCalls}`);
      lines.push('');
    }

    // Findings
    if (result.findings.length > 0) {
      lines.push('## Findings');
      lines.push('');

      // Group by severity
      const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
      for (const severity of severityOrder) {
        const findings = result.findings.filter(f => f.severity === severity);
        if (findings.length === 0) continue;

        lines.push(`### ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${findings.length})`);
        lines.push('');

        for (const finding of findings) {
          lines.push(`#### ${finding.title}`);
          lines.push('');
          lines.push(`**Contract:** ${finding.contractName}${finding.functionName ? ` :: ${finding.functionName}()` : ''}`);
          if (finding.lineNumber) {
            lines.push(`**Location:** Line ${finding.lineNumber}`);
          }
          if (finding.swcId) {
            lines.push(`**SWC:** [${finding.swcId}](https://swcregistry.io/docs/${finding.swcId})`);
          }
          lines.push('');
          lines.push(finding.description);
          lines.push('');

          if (finding.exploitScenario) {
            lines.push('**Exploit Scenario:**');
            lines.push('');
            lines.push(finding.exploitScenario);
            lines.push('');
          }

          if (finding.remediation) {
            lines.push('**Remediation:**');
            lines.push('');
            lines.push(finding.remediation);
            lines.push('');
          }

          if (finding.realWorldExploits && finding.realWorldExploits.length > 0) {
            lines.push('**Real-World Exploits (DeFiHackLabs):**');
            for (const exploit of finding.realWorldExploits) {
              lines.push(`- [${exploit.protocol}](${exploit.defiHackLabsUrl}) (${exploit.date}) - ${exploit.lossAmount || 'N/A'}`);
            }
            lines.push('');
          }

          if (finding.references && finding.references.length > 0) {
            lines.push('**References:**');
            for (const ref of finding.references) {
              lines.push(`- ${ref}`);
            }
            lines.push('');
          }

          lines.push('---');
          lines.push('');
        }
      }
    }

    // External Tools
    if (result.staticAnalysis) {
      lines.push('## External Tool Analysis');
      lines.push('');

      for (const [tool, data] of Object.entries(result.staticAnalysis)) {
        if (data) {
          lines.push(`### ${tool.charAt(0).toUpperCase() + tool.slice(1)}`);
          lines.push('');
          lines.push(`- **Available:** ${data.available ? 'Yes' : 'No'}`);
          if (data.version) {
            lines.push(`- **Version:** ${data.version}`);
          }
          lines.push(`- **Findings:** ${data.findings.length}`);
          lines.push(`- **Duration:** ${(data.duration / 1000).toFixed(1)}s`);
          if (data.error) {
            lines.push(`- **Error:** ${data.error}`);
          }
          lines.push('');
        }
      }
    }

    // Dynamic Analysis
    if (result.dynamicAnalysis) {
      lines.push('## Dynamic Analysis');
      lines.push('');
      lines.push(`- **Exploits Attempted:** ${result.dynamicAnalysis.exploitsAttempted}`);
      lines.push(`- **Exploits Confirmed:** ${result.dynamicAnalysis.exploitsSuccessful}`);
      if (result.dynamicAnalysis.anvilForkBlock) {
        lines.push(`- **Fork Block:** ${result.dynamicAnalysis.anvilForkBlock}`);
      }
      lines.push('');
    }

    // AI Analysis
    if (analysis) {
      lines.push('## AI Security Analysis');
      lines.push('');
      lines.push(analysis);
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Generated by Cyber-Claude Web3 Security Scanner*');
    lines.push('*Based on Anthropic SCONE-bench methodology*');
    lines.push('*Enhanced with [DeFiHackLabs](https://github.com/SunWeb3Sec/DeFiHackLabs) exploit patterns*');

    return lines.join('\n');
  }
}
