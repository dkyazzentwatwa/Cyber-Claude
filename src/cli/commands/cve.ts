import { Command } from 'commander';
import { VulnEnricher } from '../../agent/tools/vuln/VulnEnricher.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';
import chalk from 'chalk';

/**
 * Create CVE lookup command
 */
export function createCVECommand(): Command {
  const cmd = new Command('cve');

  cmd
    .description('Lookup CVE (Common Vulnerabilities and Exposures) information from NVD')
    .argument('[cve-id]', 'CVE ID to lookup (e.g., CVE-2024-1234)')
    .option('--product <name>', 'Search by product name')
    .option('--version <version>', 'Product version (use with --product)')
    .option('--keyword <keyword>', 'Keyword search')
    .option('--severity <level>', 'Minimum severity (LOW, MEDIUM, HIGH, CRITICAL)')
    .option('--year <year>', 'Filter by publication year', parseInt)
    .option('--cache-stats', 'Show cache statistics')
    .option('--clear-cache', 'Clear vulnerability cache')
    .option('--api-key <key>', 'NVD API key for higher rate limits')
    .action(async (cveId: string | undefined, options: any) => {
      try {
        ui.banner();

        const enricher = new VulnEnricher(options.apiKey);

        // Show cache statistics
        if (options.cacheStats) {
          ui.section('📊 Vulnerability Cache Statistics');
          console.log('');

          const spinner = ui.spinner('Loading cache stats...').start();
          const stats = await enricher.getCacheStats();
          spinner.stop();

          console.log(`  Total Entries: ${stats.totalEntries}`);
          console.log(`  Expired Entries: ${stats.expiredEntries}`);
          console.log(`  Cache Size: ${formatBytes(stats.cacheSize)}`);
          console.log('');

          return;
        }

        // Clear cache
        if (options.clearCache) {
          ui.section('🗑️  Clear Vulnerability Cache');
          console.log('');

          const spinner = ui.spinner('Clearing cache...').start();
          const deletedCount = await enricher.clearCache();
          spinner.succeed(`Cleared ${deletedCount} cache entries`);
          console.log('');

          return;
        }

        // Lookup specific CVE
        if (cveId) {
          ui.section(`🔍 CVE Lookup: ${cveId}`);
          console.log('');

          const spinner = ui.spinner('Fetching CVE data from NVD...').start();

          const vulnInfo = await enricher.getCVEDetails(cveId);

          spinner.stop();

          if (!vulnInfo) {
            ui.error(`CVE ${cveId} not found in NVD database`);
            return;
          }

          // Display CVE details
          displayCVEDetails(vulnInfo);
          return;
        }

        // Search by product
        if (options.product) {
          ui.section(`🔍 Product Vulnerability Search: ${options.product}`);
          console.log('');

          const version = options.version || 'latest';

          const spinner = ui.spinner(`Searching for vulnerabilities in ${options.product}...`).start();

          const enrichResult = await enricher.enrichComponent(
            options.product,
            version
          );

          spinner.stop();

          if (!enrichResult.enriched || !enrichResult.vulnInfo || enrichResult.vulnInfo.length === 0) {
            ui.info(`No vulnerabilities found for ${options.product}${options.version ? `@${options.version}` : ''}`);
            console.log('');
            return;
          }

          console.log(`Found ${enrichResult.vulnInfo.length} vulnerabilities:\n`);

          // Display each vulnerability
          for (const vuln of enrichResult.vulnInfo.slice(0, 10)) {
            displayCVEDetails(vuln);
            console.log(''); // spacing between entries
          }

          if (enrichResult.vulnInfo.length > 10) {
            console.log(chalk.gray(`... and ${enrichResult.vulnInfo.length - 10} more vulnerabilities`));
            console.log('');
          }

          return;
        }

        // Show usage help
        cmd.help();

      } catch (error: any) {
        logger.error('CVE lookup failed:', error);
        ui.error(`CVE lookup failed: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Display CVE details in a formatted way
 */
function displayCVEDetails(vulnInfo: any): void {
  type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

  const severityEmojiMap: Record<SeverityLevel, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    info: '🔵',
  };

  const severityColorMap: Record<SeverityLevel, typeof chalk.red> = {
    critical: chalk.red,
    high: chalk.redBright,
    medium: chalk.yellow,
    low: chalk.green,
    info: chalk.blue,
  };

  const severity = (vulnInfo.severity?.toLowerCase() || 'info') as SeverityLevel;
  const severityEmoji = severityEmojiMap[severity] || 'ℹ️';
  const severityColor = severityColorMap[severity] || chalk.white;

  console.log(severityColor.bold(`${severityEmoji} ${vulnInfo.cveId} - ${vulnInfo.severity.toUpperCase()}`));

  if (vulnInfo.cvssScore) {
    console.log(`   CVSS Score: ${chalk.bold(vulnInfo.cvssScore.toFixed(1))}/10.0`);
  }

  if (vulnInfo.cvssVector) {
    console.log(chalk.gray(`   Vector: ${vulnInfo.cvssVector}`));
  }

  console.log('');
  console.log(`   ${chalk.white(vulnInfo.description)}`);
  console.log('');

  if (vulnInfo.affectedVersions && vulnInfo.affectedVersions.length > 0) {
    console.log(chalk.cyan('   Affected Versions:'));
    vulnInfo.affectedVersions.slice(0, 3).forEach((ver: string) => {
      console.log(`     • ${ver}`);
    });
    if (vulnInfo.affectedVersions.length > 3) {
      console.log(chalk.gray(`     ... and ${vulnInfo.affectedVersions.length - 3} more`));
    }
    console.log('');
  }

  if (vulnInfo.fixedVersion) {
    console.log(chalk.green(`   Fixed In: ${vulnInfo.fixedVersion}`));
    console.log('');
  }

  if (vulnInfo.cwe && vulnInfo.cwe.length > 0) {
    console.log(chalk.magenta('   Weakness Types (CWE):'));
    vulnInfo.cwe.slice(0, 3).forEach((cwe: string) => {
      console.log(`     • ${cwe}`);
    });
    console.log('');
  }

  if (vulnInfo.published) {
    console.log(chalk.gray(`   Published: ${vulnInfo.published.toLocaleDateString()}`));
  }

  if (vulnInfo.lastModified) {
    console.log(chalk.gray(`   Last Modified: ${vulnInfo.lastModified.toLocaleDateString()}`));
  }

  if (vulnInfo.references && vulnInfo.references.length > 0) {
    console.log('');
    console.log(chalk.cyan('   References:'));
    vulnInfo.references.slice(0, 3).forEach((ref: string) => {
      console.log(chalk.gray(`     • ${ref}`));
    });
    if (vulnInfo.references.length > 3) {
      console.log(chalk.gray(`     ... and ${vulnInfo.references.length - 3} more`));
    }
  }

  console.log('');
  console.log(chalk.gray('   ─'.repeat(70)));
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
