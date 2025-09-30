/**
 * OSINT Reporter
 * Formats and exports OSINT reconnaissance results
 */

import fs from 'fs/promises';
import chalk from 'chalk';
import boxen from 'boxen';
import { OSINTReconResult } from './types.js';
import { ui } from '../../../utils/ui.js';
import { logger } from '../../../utils/logger.js';

export class OSINTReporter {
  /**
   * Display OSINT results to console
   */
  displayResults(result: OSINTReconResult): void {
    console.log('\n');
    console.log(
      boxen(
        chalk.bold.cyan(`🔍 OSINT Reconnaissance Report\n`) +
          chalk.white(`Target: ${result.target}\n`) +
          chalk.gray(
            `Scan Type: ${result.scanType.toUpperCase()} | Duration: ${this.getDuration(result)}s`
          ),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    // Summary
    this.displaySummary(result);

    // WHOIS Information
    if (result.results.whois) {
      console.log(chalk.bold.yellow('\n📋 WHOIS Information'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.white(`Domain: ${result.results.whois.domain}`));
      if (result.results.whois.registrar) {
        console.log(
          chalk.white(`Registrar: ${result.results.whois.registrar}`)
        );
      }
      if (result.results.whois.registrationDate) {
        console.log(
          chalk.white(
            `Registered: ${result.results.whois.registrationDate}`
          )
        );
      }
      if (result.results.whois.expirationDate) {
        console.log(
          chalk.white(`Expires: ${result.results.whois.expirationDate}`)
        );
      }
      if (result.results.whois.nameServers) {
        console.log(
          chalk.white(
            `Name Servers: ${result.results.whois.nameServers.join(', ')}`
          )
        );
      }
    }

    // DNS Records
    if (result.results.dns) {
      console.log(chalk.bold.yellow('\n🌐 DNS Records'));
      console.log(chalk.gray('─'.repeat(60)));

      if (result.results.dns.records.A) {
        console.log(
          chalk.white(
            `A Records: ${result.results.dns.records.A.join(', ')}`
          )
        );
      }
      if (result.results.dns.records.MX) {
        console.log(
          chalk.white(
            `MX Records: ${result.results.dns.records.MX.join(', ')}`
          )
        );
      }
      if (result.results.dns.records.NS) {
        console.log(
          chalk.white(
            `NS Records: ${result.results.dns.records.NS.join(', ')}`
          )
        );
      }
      if (result.results.dns.records.TXT && result.results.dns.records.TXT.length > 0) {
        console.log(chalk.white(`TXT Records:`));
        result.results.dns.records.TXT.forEach((txt) => {
          console.log(chalk.gray(`  - ${txt.substring(0, 100)}${txt.length > 100 ? '...' : ''}`));
        });
      }
    }

    // Subdomains
    if (result.results.subdomains && result.results.subdomains.total > 0) {
      console.log(chalk.bold.yellow('\n🔗 Subdomains'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(
        chalk.white(
          `Total Found: ${result.results.subdomains.total} (from ${result.results.subdomains.sources.join(', ')})`
        )
      );

      const topSubdomains = result.results.subdomains.subdomains.slice(0, 20);
      topSubdomains.forEach((sub) => {
        const ips = sub.ip ? ` [${sub.ip.join(', ')}]` : '';
        console.log(chalk.gray(`  • ${sub.subdomain}${ips}`));
      });

      if (result.results.subdomains.total > 20) {
        console.log(
          chalk.gray(
            `  ... and ${result.results.subdomains.total - 20} more`
          )
        );
      }
    }

    // Emails
    if (result.results.emails && result.results.emails.total > 0) {
      console.log(chalk.bold.yellow('\n📧 Email Addresses'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(
        chalk.white(`Total Found: ${result.results.emails.total}`)
      );

      result.results.emails.emails.slice(0, 15).forEach((email) => {
        const verified = email.verified ? chalk.green('[✓]') : chalk.gray('[?]');
        console.log(chalk.white(`  ${verified} ${email.email}`));
      });

      if (result.results.emails.total > 15) {
        console.log(
          chalk.gray(`  ... and ${result.results.emails.total - 15} more`)
        );
      }
    }

    // Technologies
    if (result.results.technologies && result.results.technologies.technologies.length > 0) {
      console.log(chalk.bold.yellow('\n⚙️  Technology Stack'));
      console.log(chalk.gray('─'.repeat(60)));

      if (result.results.technologies.server) {
        console.log(
          chalk.white(`Server: ${result.results.technologies.server}`)
        );
      }

      const techsByCategory = new Map<string, string[]>();
      result.results.technologies.technologies.forEach((tech) => {
        tech.categories.forEach((cat) => {
          if (!techsByCategory.has(cat)) {
            techsByCategory.set(cat, []);
          }
          techsByCategory.get(cat)!.push(tech.name);
        });
      });

      techsByCategory.forEach((techs, category) => {
        console.log(chalk.white(`${category}: ${techs.join(', ')}`));
      });
    }

    // Breach Data
    if (result.results.breaches && result.results.breaches.length > 0) {
      const breachedEmails = result.results.breaches.filter(
        (b) => b.breached
      );
      if (breachedEmails.length > 0) {
        console.log(chalk.bold.red('\n⚠️  Data Breaches'));
        console.log(chalk.gray('─'.repeat(60)));

        breachedEmails.forEach((breach) => {
          console.log(chalk.red(`\n${breach.email}:`));
          console.log(
            chalk.white(
              `  Found in ${breach.totalBreaches} breach(es)`
            )
          );

          breach.breaches.slice(0, 5).forEach((b) => {
            console.log(
              chalk.gray(
                `    • ${b.title} (${b.breachDate}) - ${b.pwnCount.toLocaleString()} accounts`
              )
            );
          });

          if (breach.breaches.length > 5) {
            console.log(
              chalk.gray(`    ... and ${breach.breaches.length - 5} more breaches`)
            );
          }
        });
      }
    }

    // Wayback Machine
    if (result.results.wayback && result.results.wayback.totalSnapshots > 0) {
      console.log(chalk.bold.yellow('\n📜 Archive History'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(
        chalk.white(
          `Total Snapshots: ${result.results.wayback.totalSnapshots}`
        )
      );
      if (result.results.wayback.firstSnapshot) {
        console.log(
          chalk.white(
            `First Archive: ${this.formatWaybackTimestamp(result.results.wayback.firstSnapshot)}`
          )
        );
      }
      if (result.results.wayback.lastSnapshot) {
        console.log(
          chalk.white(
            `Last Archive: ${this.formatWaybackTimestamp(result.results.wayback.lastSnapshot)}`
          )
        );
      }
    }

    // Username Profiles
    if (result.results.usernames && result.results.usernames.totalFound > 0) {
      console.log(chalk.bold.yellow('\n👤 Social Media Profiles'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(
        chalk.white(
          `Found: ${result.results.usernames.totalFound}/${result.results.usernames.totalChecked} platforms`
        )
      );

      result.results.usernames.profiles
        .filter((p) => p.exists)
        .forEach((profile) => {
          console.log(chalk.green(`  ✓ ${profile.platform}: ${profile.url}`));
        });
    }

    // Geolocation
    if (result.results.geolocation && result.results.geolocation.length > 0) {
      console.log(chalk.bold.yellow('\n🌍 IP Geolocation'));
      console.log(chalk.gray('─'.repeat(60)));

      result.results.geolocation.forEach((geo) => {
        console.log(chalk.white(`\n${geo.ip}:`));
        if (geo.city && geo.country) {
          console.log(
            chalk.gray(
              `  Location: ${geo.city}, ${geo.region}, ${geo.country}`
            )
          );
        }
        if (geo.isp) {
          console.log(chalk.gray(`  ISP: ${geo.isp}`));
        }
        if (geo.org) {
          console.log(chalk.gray(`  Organization: ${geo.org}`));
        }
      });
    }

    // Recommendations
    if (result.summary.recommendations.length > 0) {
      console.log(chalk.bold.cyan('\n💡 Recommendations'));
      console.log(chalk.gray('─'.repeat(60)));
      result.summary.recommendations.forEach((rec) => {
        console.log(chalk.white(`  • ${rec}`));
      });
    }

    console.log('\n');
  }

  /**
   * Display summary section
   */
  private displaySummary(result: OSINTReconResult): void {
    console.log(chalk.bold.yellow('\n📊 Summary'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(
      chalk.white(`Total Findings: ${result.summary.totalFindings}`)
    );

    // Risk score with color
    let riskColor = chalk.green;
    let riskLevel = 'Low';

    if (result.summary.riskScore > 70) {
      riskColor = chalk.red;
      riskLevel = 'High';
    } else if (result.summary.riskScore > 40) {
      riskColor = chalk.yellow;
      riskLevel = 'Medium';
    }

    console.log(
      riskColor(`Risk Score: ${result.summary.riskScore}/100 (${riskLevel})`)
    );

    if (result.summary.dataExposure.length > 0) {
      console.log(chalk.white('\nData Exposure:'));
      result.summary.dataExposure.forEach((exposure) => {
        console.log(chalk.yellow(`  ⚠ ${exposure}`));
      });
    }
  }

  /**
   * Export results to JSON
   */
  async exportJSON(
    result: OSINTReconResult,
    filePath: string
  ): Promise<void> {
    try {
      const json = JSON.stringify(result, null, 2);
      await fs.writeFile(filePath, json, 'utf-8');
      logger.info(`Results exported to JSON: ${filePath}`);
      ui.success(`Results exported to: ${filePath}`);
    } catch (error) {
      logger.error('Failed to export JSON:', error);
      throw new Error('Failed to export JSON results');
    }
  }

  /**
   * Export results to Markdown
   */
  async exportMarkdown(
    result: OSINTReconResult,
    filePath: string
  ): Promise<void> {
    try {
      let md = `# OSINT Reconnaissance Report\n\n`;
      md += `**Target:** ${result.target}\n`;
      md += `**Scan Type:** ${result.scanType.toUpperCase()}\n`;
      md += `**Duration:** ${this.getDuration(result)}s\n`;
      md += `**Date:** ${result.startTime.toISOString()}\n\n`;

      md += `## Summary\n\n`;
      md += `- **Total Findings:** ${result.summary.totalFindings}\n`;
      md += `- **Risk Score:** ${result.summary.riskScore}/100\n\n`;

      if (result.summary.dataExposure.length > 0) {
        md += `### Data Exposure\n\n`;
        result.summary.dataExposure.forEach((exposure) => {
          md += `- ⚠️ ${exposure}\n`;
        });
        md += `\n`;
      }

      // Add all sections
      if (result.results.whois) {
        md += `## WHOIS Information\n\n`;
        md += `- **Domain:** ${result.results.whois.domain}\n`;
        if (result.results.whois.registrar) {
          md += `- **Registrar:** ${result.results.whois.registrar}\n`;
        }
        if (result.results.whois.registrationDate) {
          md += `- **Registered:** ${result.results.whois.registrationDate}\n`;
        }
        md += `\n`;
      }

      if (result.results.subdomains && result.results.subdomains.total > 0) {
        md += `## Subdomains (${result.results.subdomains.total} found)\n\n`;
        result.results.subdomains.subdomains.forEach((sub) => {
          md += `- ${sub.subdomain}\n`;
        });
        md += `\n`;
      }

      if (result.results.emails && result.results.emails.total > 0) {
        md += `## Email Addresses (${result.results.emails.total} found)\n\n`;
        result.results.emails.emails.forEach((email) => {
          md += `- ${email.email}\n`;
        });
        md += `\n`;
      }

      if (result.summary.recommendations.length > 0) {
        md += `## Recommendations\n\n`;
        result.summary.recommendations.forEach((rec) => {
          md += `- ${rec}\n`;
        });
        md += `\n`;
      }

      await fs.writeFile(filePath, md, 'utf-8');
      logger.info(`Results exported to Markdown: ${filePath}`);
      ui.success(`Results exported to: ${filePath}`);
    } catch (error) {
      logger.error('Failed to export Markdown:', error);
      throw new Error('Failed to export Markdown results');
    }
  }

  /**
   * Get scan duration in seconds
   */
  private getDuration(result: OSINTReconResult): number {
    const duration =
      (result.endTime.getTime() - result.startTime.getTime()) / 1000;
    return Math.round(duration);
  }

  /**
   * Format Wayback timestamp
   */
  private formatWaybackTimestamp(timestamp: string): string {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
}