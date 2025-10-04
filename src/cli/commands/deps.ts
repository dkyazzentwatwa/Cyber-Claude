/**
 * Dependency Vulnerability Scanning Command
 */

import { Command } from 'commander';
import { DependencyScanner } from '../../agent/tools/DependencyScanner.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';

export function createDepsCommand(): Command {
  const command = new Command('deps');

  command
    .description('Scan JavaScript dependencies for known vulnerabilities')
    .argument('[path]', 'Path to project directory', '.')
    .option('-o, --output <file>', 'Save results to file')
    .option('--json', 'Output in JSON format')
    .action(async (path: string, options) => {
      try {
        ui.banner();
        console.log(ui.section('🔍 Dependency Vulnerability Scanner\n'));

        // Check if retire.js is available
        const available = await DependencyScanner.isAvailable();
        if (!available) {
          console.log(ui.error('❌ retire.js is not available'));
          console.log(ui.info('\n📦 Installing retire.js...'));
          console.log(ui.info('Please wait while we install the required dependency scanner.\n'));
          process.exit(1);
        }

        const spinner = ui.spinner('Scanning dependencies for vulnerabilities...');
        spinner.start();

        const result = await DependencyScanner.scan(path);
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(DependencyScanner.formatResults(result));
        }

        // Save to file if requested
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(
            options.output,
            options.json
              ? JSON.stringify(result, null, 2)
              : DependencyScanner.formatResults(result)
          );
          console.log(ui.success(`\n💾 Results saved to ${options.output}`));
        }

        // Summary
        if (!options.json) {
          console.log(ui.section('\n📊 Summary'));
          console.log(ui.info(`Path: ${result.scannedPath}`));
          console.log(ui.info(`Total Vulnerabilities: ${result.totalVulnerabilities}`));

          if (result.totalVulnerabilities > 0) {
            console.log(ui.warning(`\n⚠️  Found ${result.totalVulnerabilities} vulnerable dependencies`));

            if (result.summary.critical > 0) {
              console.log(
                ui.error(`🔴 ${result.summary.critical} CRITICAL vulnerabilities require immediate attention`)
              );
            }

            console.log(
              ui.info('\n💡 Update vulnerable packages to their latest versions to fix security issues')
            );
          } else {
            console.log(ui.success('\n✅ No vulnerabilities found!'));
          }
        }

        // Exit with error code if vulnerabilities found
        if (result.summary.critical > 0 || result.summary.high > 0) {
          process.exit(1);
        }
      } catch (error: any) {
        logger.error('Dependency scan failed:', error);
        console.log(ui.error(`\n❌ Scan failed: ${error.message}`));
        process.exit(1);
      }
    });

  return command;
}
