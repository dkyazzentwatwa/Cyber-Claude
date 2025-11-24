/**
 * Log Reporter
 * Formats and exports log analysis results
 */

import { promises as fs } from 'fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { LogAnalysisResult, LogAnomaly, LogEntry, LogStatistics } from './types.js';

export class LogReporter {
  /**
   * Display analysis summary in terminal
   */
  displaySummary(result: LogAnalysisResult): void {
    console.log(chalk.bold.cyan('\n📊 Log Analysis Summary\n'));

    // File info
    console.log(chalk.gray(`File: ${result.filePath}`));
    console.log(chalk.gray(`Format: ${result.format}`));
    console.log(chalk.gray(`Analyzed: ${result.analyzedAt.toLocaleString()}`));
    console.log(chalk.gray(`Duration: ${result.duration}ms\n`));

    // Statistics
    this.displayStatistics(result.statistics);

    // Anomalies
    if (result.anomalies.length > 0) {
      this.displayAnomalies(result.anomalies);
    } else {
      console.log(chalk.green('✅ No anomalies detected\n'));
    }

    // IOCs
    if (result.extractedIOCs) {
      this.displayIOCs(result.extractedIOCs);
    }
  }

  /**
   * Display statistics table
   */
  private displayStatistics(stats: LogStatistics): void {
    console.log(chalk.bold('📈 Statistics:\n'));

    console.log(`  Total Lines: ${chalk.cyan(stats.totalLines.toLocaleString())}`);
    console.log(`  Parsed Lines: ${chalk.cyan(stats.parsedLines.toLocaleString())}`);
    console.log(`  Error Rate: ${chalk.yellow(stats.errorRate.toFixed(2) + '%')}\n`);

    if (stats.timeRange) {
      console.log(`  Time Range:`);
      console.log(`    Start: ${chalk.gray(stats.timeRange.start.toLocaleString())}`);
      console.log(`    End: ${chalk.gray(stats.timeRange.end.toLocaleString())}\n`);
    }

    // Severity distribution
    console.log(chalk.bold('  Severity Distribution:'));
    const severities = [
      { name: 'Emergency', count: stats.severityDistribution.emergency, color: chalk.red.bold },
      { name: 'Alert', count: stats.severityDistribution.alert, color: chalk.red },
      { name: 'Critical', count: stats.severityDistribution.critical, color: chalk.redBright },
      { name: 'Error', count: stats.severityDistribution.error, color: chalk.yellow },
      { name: 'Warning', count: stats.severityDistribution.warning, color: chalk.yellowBright },
      { name: 'Notice', count: stats.severityDistribution.notice, color: chalk.blue },
      { name: 'Info', count: stats.severityDistribution.info, color: chalk.cyan },
      { name: 'Debug', count: stats.severityDistribution.debug, color: chalk.gray },
    ];

    severities.forEach(sev => {
      if (sev.count > 0) {
        console.log(`    ${sev.color(sev.name)}: ${sev.count.toLocaleString()}`);
      }
    });
    console.log('');

    // Top sources
    if (stats.topSources.length > 0) {
      console.log(chalk.bold('  Top Sources:'));
      stats.topSources.slice(0, 5).forEach((src, i) => {
        console.log(`    ${i + 1}. ${chalk.cyan(src.source)} (${src.count.toLocaleString()} entries)`);
      });
      console.log('');
    }

    // Top IPs
    if (stats.topIPs && stats.topIPs.length > 0) {
      console.log(chalk.bold('  Top IP Addresses:'));
      stats.topIPs.slice(0, 5).forEach((ip, i) => {
        console.log(`    ${i + 1}. ${chalk.cyan(ip.ip)} (${ip.count.toLocaleString()} entries)`);
      });
      console.log('');
    }
  }

  /**
   * Display anomalies
   */
  private displayAnomalies(anomalies: LogAnomaly[]): void {
    console.log(chalk.bold.red(`\n🚨 Anomalies Detected: ${anomalies.length}\n`));

    // Group by severity
    const bySeverity = {
      critical: anomalies.filter(a => a.severity === 'critical'),
      high: anomalies.filter(a => a.severity === 'high'),
      medium: anomalies.filter(a => a.severity === 'medium'),
      low: anomalies.filter(a => a.severity === 'low'),
      info: anomalies.filter(a => a.severity === 'info'),
    };

    const displayAnomaly = (anomaly: LogAnomaly) => {
      const severityColors = {
        critical: chalk.red.bold,
        high: chalk.redBright,
        medium: chalk.yellow,
        low: chalk.yellowBright,
        info: chalk.blue,
      };

      const severityIcons = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        info: '🔵',
      };

      const color = severityColors[anomaly.severity];
      const icon = severityIcons[anomaly.severity];

      console.log(`${icon} ${color(anomaly.severity.toUpperCase())} - ${chalk.bold(anomaly.title)}`);
      console.log(`   ${anomaly.description}`);

      if (anomaly.count > 1) {
        console.log(chalk.gray(`   Occurrences: ${anomaly.count}`));
      }

      if (anomaly.timeRange) {
        console.log(chalk.gray(`   Time: ${anomaly.timeRange.start.toLocaleString()} - ${anomaly.timeRange.end.toLocaleString()}`));
      }

      if (anomaly.mitreAttack && anomaly.mitreAttack.length > 0) {
        console.log(chalk.magenta(`   MITRE ATT&CK: ${anomaly.mitreAttack.join(', ')}`));
      }

      if (anomaly.recommendation) {
        console.log(chalk.cyan(`   💡 ${anomaly.recommendation}`));
      }

      if (anomaly.evidence.length > 0) {
        console.log(chalk.gray(`   Evidence (${anomaly.evidence.length} entries):`));
        anomaly.evidence.slice(0, 2).forEach(entry => {
          const preview = entry.message.slice(0, 80);
          console.log(chalk.gray(`     Line ${entry.lineNumber}: ${preview}...`));
        });
      }

      console.log('');
    };

    // Display critical first
    if (bySeverity.critical.length > 0) {
      bySeverity.critical.forEach(displayAnomaly);
    }

    if (bySeverity.high.length > 0) {
      bySeverity.high.forEach(displayAnomaly);
    }

    if (bySeverity.medium.length > 0) {
      bySeverity.medium.slice(0, 3).forEach(displayAnomaly); // Limit medium to 3
      if (bySeverity.medium.length > 3) {
        console.log(chalk.gray(`   ... and ${bySeverity.medium.length - 3} more medium severity anomalies\n`));
      }
    }

    if (bySeverity.low.length > 0) {
      console.log(chalk.gray(`   ${bySeverity.low.length} low severity anomalies detected\n`));
    }
  }

  /**
   * Display extracted IOCs
   */
  private displayIOCs(iocs: any): void {
    const hasIOCs = iocs.ips.length > 0 || iocs.domains.length > 0 ||
                    iocs.emails.length > 0 || iocs.hashes.length > 0;

    if (!hasIOCs) return;

    console.log(chalk.bold.cyan('\n🔍 Extracted Indicators of Compromise (IOCs):\n'));

    if (iocs.ips.length > 0) {
      console.log(chalk.bold('  IP Addresses:'));
      iocs.ips.slice(0, 10).forEach((ip: string) => {
        console.log(`    • ${chalk.yellow(ip)}`);
      });
      if (iocs.ips.length > 10) {
        console.log(chalk.gray(`    ... and ${iocs.ips.length - 10} more\n`));
      } else {
        console.log('');
      }
    }

    if (iocs.domains.length > 0) {
      console.log(chalk.bold('  Domains:'));
      iocs.domains.slice(0, 10).forEach((domain: string) => {
        console.log(`    • ${chalk.yellow(domain)}`);
      });
      if (iocs.domains.length > 10) {
        console.log(chalk.gray(`    ... and ${iocs.domains.length - 10} more\n`));
      } else {
        console.log('');
      }
    }

    if (iocs.emails.length > 0) {
      console.log(chalk.bold('  Email Addresses:'));
      iocs.emails.slice(0, 5).forEach((email: string) => {
        console.log(`    • ${chalk.yellow(email)}`);
      });
      if (iocs.emails.length > 5) {
        console.log(chalk.gray(`    ... and ${iocs.emails.length - 5} more\n`));
      } else {
        console.log('');
      }
    }

    if (iocs.hashes.length > 0) {
      console.log(chalk.bold('  Hashes:'));
      iocs.hashes.slice(0, 5).forEach((hash: string) => {
        console.log(`    • ${chalk.yellow(hash)}`);
      });
      if (iocs.hashes.length > 5) {
        console.log(chalk.gray(`    ... and ${iocs.hashes.length - 5} more\n`));
      } else {
        console.log('');
      }
    }
  }

  /**
   * Display sample log entries
   */
  displayEntries(entries: LogEntry[], maxEntries: number = 20): void {
    if (entries.length === 0) return;

    console.log(chalk.bold.cyan(`\n📝 Sample Log Entries (showing ${Math.min(maxEntries, entries.length)} of ${entries.length}):\n`));

    const table = new Table({
      head: ['Line', 'Time', 'Severity', 'Source', 'Message'],
      colWidths: [8, 20, 12, 20, 50],
      wordWrap: true,
    });

    entries.slice(0, maxEntries).forEach(entry => {
      table.push([
        entry.lineNumber,
        entry.timestamp ? entry.timestamp.toLocaleTimeString() : '-',
        entry.severity || '-',
        entry.source || entry.ip || '-',
        entry.message.slice(0, 47) + (entry.message.length > 47 ? '...' : ''),
      ]);
    });

    console.log(table.toString());
    console.log('');
  }

  /**
   * Export to JSON
   */
  async exportJson(result: LogAnalysisResult, filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(chalk.green(`✅ Exported JSON to ${filePath}`));
  }

  /**
   * Export to Markdown
   */
  async exportMarkdown(result: LogAnalysisResult, filePath: string): Promise<void> {
    const lines: string[] = [];

    lines.push('# Log Analysis Report\n');
    lines.push(`**File:** ${result.filePath}  `);
    lines.push(`**Format:** ${result.format}  `);
    lines.push(`**Analyzed:** ${result.analyzedAt.toLocaleString()}  `);
    lines.push(`**Duration:** ${result.duration}ms\n`);

    // Statistics
    lines.push('## Statistics\n');
    lines.push(`- **Total Lines:** ${result.statistics.totalLines.toLocaleString()}`);
    lines.push(`- **Parsed Lines:** ${result.statistics.parsedLines.toLocaleString()}`);
    lines.push(`- **Error Rate:** ${result.statistics.errorRate.toFixed(2)}%\n`);

    if (result.statistics.timeRange) {
      lines.push(`- **Time Range:** ${result.statistics.timeRange.start.toLocaleString()} to ${result.statistics.timeRange.end.toLocaleString()}\n`);
    }

    // Severity distribution
    lines.push('### Severity Distribution\n');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    const dist = result.statistics.severityDistribution;
    Object.entries(dist).forEach(([severity, count]) => {
      if (count > 0) {
        lines.push(`| ${severity.charAt(0).toUpperCase() + severity.slice(1)} | ${count.toLocaleString()} |`);
      }
    });
    lines.push('');

    // Anomalies
    if (result.anomalies.length > 0) {
      lines.push(`## Anomalies (${result.anomalies.length})\n`);

      result.anomalies.forEach((anomaly, i) => {
        lines.push(`### ${i + 1}. ${anomaly.title}\n`);
        lines.push(`**Severity:** ${anomaly.severity.toUpperCase()}  `);
        lines.push(`**Type:** ${anomaly.type}  `);
        lines.push(`**Count:** ${anomaly.count}  `);

        if (anomaly.mitreAttack && anomaly.mitreAttack.length > 0) {
          lines.push(`**MITRE ATT&CK:** ${anomaly.mitreAttack.join(', ')}  `);
        }

        lines.push(`\n${anomaly.description}\n`);

        if (anomaly.recommendation) {
          lines.push(`**Recommendation:** ${anomaly.recommendation}\n`);
        }

        lines.push('');
      });
    }

    // IOCs
    if (result.extractedIOCs) {
      const iocs = result.extractedIOCs;
      const hasIOCs = iocs.ips.length > 0 || iocs.domains.length > 0 ||
                      iocs.emails.length > 0 || iocs.hashes.length > 0;

      if (hasIOCs) {
        lines.push('## Indicators of Compromise (IOCs)\n');

        if (iocs.ips.length > 0) {
          lines.push(`### IP Addresses (${iocs.ips.length})\n`);
          iocs.ips.slice(0, 20).forEach(ip => lines.push(`- ${ip}`));
          if (iocs.ips.length > 20) {
            lines.push(`- ... and ${iocs.ips.length - 20} more`);
          }
          lines.push('');
        }

        if (iocs.domains.length > 0) {
          lines.push(`### Domains (${iocs.domains.length})\n`);
          iocs.domains.slice(0, 20).forEach(domain => lines.push(`- ${domain}`));
          if (iocs.domains.length > 20) {
            lines.push(`- ... and ${iocs.domains.length - 20} more`);
          }
          lines.push('');
        }
      }
    }

    lines.push('---\n');
    lines.push(`*Report generated by Cyber Claude on ${new Date().toLocaleString()}*\n`);

    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    console.log(chalk.green(`✅ Exported Markdown to ${filePath}`));
  }
}
