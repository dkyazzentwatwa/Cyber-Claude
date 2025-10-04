/**
 * SSL/TLS Certificate Analysis Command
 */

import { Command } from 'commander';
import { SSLAnalyzer } from '../../agent/tools/SSLAnalyzer.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';

export function createSSLCommand(): Command {
  const command = new Command('ssl');

  command
    .description('Analyze SSL/TLS certificates for security issues')
    .argument('<host>', 'Hostname to analyze')
    .option('-p, --port <number>', 'Port number', '443')
    .option('-o, --output <file>', 'Save results to file')
    .option('--json', 'Output in JSON format')
    .action(async (host: string, options) => {
      try {
        ui.banner();
        console.log(ui.section('🔒 SSL/TLS Certificate Analyzer\n'));

        const port = parseInt(options.port, 10);

        if (isNaN(port) || port < 1 || port > 65535) {
          console.log(ui.error('❌ Invalid port number'));
          process.exit(1);
        }

        const spinner = ui.spinner(`Analyzing SSL certificate for ${host}:${port}...`);
        spinner.start();

        const result = await SSLAnalyzer.analyze(host, port);
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(SSLAnalyzer.formatResults(result));
        }

        // Save to file if requested
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(
            options.output,
            options.json
              ? JSON.stringify(result, null, 2)
              : SSLAnalyzer.formatResults(result)
          );
          console.log(ui.success(`\n💾 Results saved to ${options.output}`));
        }

        // Summary
        if (!options.json && result.success) {
          console.log(ui.section('\n📊 Quick Summary'));

          if (result.valid) {
            console.log(ui.success(`✅ Certificate is VALID`));
          } else {
            console.log(ui.error(`❌ Certificate is INVALID`));
          }

          console.log(ui.info(`📅 Days Remaining: ${result.daysRemaining}`));
          console.log(ui.info(`🎯 Risk Score: ${result.riskScore}/100`));

          // Warnings
          if (result.riskScore >= 60) {
            console.log(ui.error('\n🚨 HIGH RISK - Immediate action required!'));
          } else if (result.riskScore >= 30) {
            console.log(ui.warning('\n⚠️  MEDIUM RISK - Address issues soon'));
          } else {
            console.log(ui.success('\n✅ LOW RISK - Certificate is secure'));
          }

          // Critical findings
          const criticalFindings = result.findings.filter((f) => f.severity === 'critical');
          if (criticalFindings.length > 0) {
            console.log(ui.error(`\n🔴 ${criticalFindings.length} CRITICAL issues found`));
            criticalFindings.forEach((f) => {
              console.log(ui.error(`   • ${f.title}`));
            });
          }
        }

        // Exit with error code if critical issues
        if (result.riskScore >= 60) {
          process.exit(1);
        }
      } catch (error: any) {
        logger.error('SSL analysis failed:', error);
        console.log(ui.error(`\n❌ Analysis failed: ${error.message}`));
        process.exit(1);
      }
    });

  return command;
}
