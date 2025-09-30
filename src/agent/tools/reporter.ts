import { SecurityFinding, ScanResult } from '../types.js';
import Table from 'cli-table3';
import chalk from 'chalk';
import { ui } from '../../utils/ui.js';
import { writeFileSync } from 'fs';
import { logger } from '../../utils/logger.js';

export class SecurityReporter {
  /**
   * Generate and display a formatted security report
   */
  displayReport(scanResult: ScanResult): void {
    console.log('\n');
    ui.divider();
    ui.section('Security Scan Report');

    // Display summary
    this.displaySummary(scanResult);

    // Display findings by severity
    this.displayFindings(scanResult.findings);

    // Display scan metadata
    this.displayMetadata(scanResult);

    ui.divider();
  }

  private displaySummary(scanResult: ScanResult): void {
    const table = new Table({
      head: ['Severity', 'Count'],
      colWidths: [20, 10],
      style: {
        head: ['cyan'],
      },
    });

    table.push(
      [chalk.red.bold('Critical'), chalk.red(scanResult.summary.critical.toString())],
      [chalk.red('High'), chalk.red(scanResult.summary.high.toString())],
      [chalk.yellow('Medium'), chalk.yellow(scanResult.summary.medium.toString())],
      [chalk.green('Low'), chalk.green(scanResult.summary.low.toString())],
      [chalk.cyan('Info'), chalk.cyan(scanResult.summary.info.toString())],
      [chalk.white.bold('Total'), chalk.white.bold(scanResult.summary.total.toString())]
    );

    console.log(table.toString());
  }

  private displayFindings(findings: SecurityFinding[]): void {
    if (findings.length === 0) {
      ui.success('No security issues found!');
      return;
    }

    // Group by severity
    const bySeverity = {
      critical: findings.filter(f => f.severity === 'critical'),
      high: findings.filter(f => f.severity === 'high'),
      medium: findings.filter(f => f.severity === 'medium'),
      low: findings.filter(f => f.severity === 'low'),
      info: findings.filter(f => f.severity === 'info'),
    };

    // Display critical and high first
    for (const severity of ['critical', 'high', 'medium', 'low', 'info'] as const) {
      const items = bySeverity[severity];
      if (items.length > 0) {
        console.log('');
        items.forEach(finding => {
          ui.finding(
            finding.severity,
            finding.title,
            finding.description
          );

          if (finding.remediation) {
            console.log(chalk.gray(`  💡 Remediation: ${finding.remediation}`));
          }

          if (finding.references && finding.references.length > 0) {
            console.log(chalk.gray(`  📚 References: ${finding.references.join(', ')}`));
          }
        });
      }
    }
  }

  private displayMetadata(scanResult: ScanResult): void {
    console.log('\n');
    console.log(chalk.gray(`Scan completed: ${scanResult.scanTime.toLocaleString()}`));
    console.log(chalk.gray(`Duration: ${(scanResult.duration / 1000).toFixed(2)}s`));
  }

  /**
   * Export report to JSON file
   */
  exportJSON(scanResult: ScanResult, filename: string): void {
    try {
      const json = JSON.stringify(scanResult, null, 2);
      writeFileSync(filename, json);
      ui.success(`Report exported to ${filename}`);
      logger.info(`Report exported to ${filename}`);
    } catch (error) {
      ui.error(`Failed to export report: ${error}`);
      logger.error(`Failed to export report: ${error}`);
    }
  }

  /**
   * Export report to Markdown file
   */
  exportMarkdown(scanResult: ScanResult, filename: string): void {
    try {
      let markdown = `# Security Scan Report\n\n`;
      markdown += `**Scan Date:** ${scanResult.scanTime.toLocaleString()}\n`;
      markdown += `**Duration:** ${(scanResult.duration / 1000).toFixed(2)}s\n\n`;

      markdown += `## Summary\n\n`;
      markdown += `| Severity | Count |\n`;
      markdown += `|----------|-------|\n`;
      markdown += `| Critical | ${scanResult.summary.critical} |\n`;
      markdown += `| High     | ${scanResult.summary.high} |\n`;
      markdown += `| Medium   | ${scanResult.summary.medium} |\n`;
      markdown += `| Low      | ${scanResult.summary.low} |\n`;
      markdown += `| Info     | ${scanResult.summary.info} |\n`;
      markdown += `| **Total**| **${scanResult.summary.total}** |\n\n`;

      if (scanResult.findings.length > 0) {
        markdown += `## Findings\n\n`;

        for (const severity of ['critical', 'high', 'medium', 'low', 'info'] as const) {
          const items = scanResult.findings.filter(f => f.severity === severity);

          if (items.length > 0) {
            markdown += `### ${severity.toUpperCase()} Severity\n\n`;

            items.forEach(finding => {
              markdown += `#### ${finding.title}\n\n`;
              markdown += `- **ID:** ${finding.id}\n`;
              markdown += `- **Category:** ${finding.category}\n`;
              markdown += `- **Description:** ${finding.description}\n`;

              if (finding.remediation) {
                markdown += `- **Remediation:** ${finding.remediation}\n`;
              }

              if (finding.references && finding.references.length > 0) {
                markdown += `- **References:**\n`;
                finding.references.forEach(ref => {
                  markdown += `  - ${ref}\n`;
                });
              }

              markdown += `\n`;
            });
          }
        }
      }

      writeFileSync(filename, markdown);
      ui.success(`Report exported to ${filename}`);
      logger.info(`Report exported to ${filename}`);
    } catch (error) {
      ui.error(`Failed to export report: ${error}`);
      logger.error(`Failed to export report: ${error}`);
    }
  }

  /**
   * Create scan result from findings
   */
  createScanResult(findings: SecurityFinding[], startTime: Date): ScanResult {
    const summary = {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
    };

    return {
      findings,
      summary,
      scanTime: new Date(),
      duration: Date.now() - startTime.getTime(),
    };
  }
}