import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { HardeningChecker } from '../../agent/tools/hardening.js';
import { SecurityReporter } from '../../agent/tools/reporter.js';
import { CyberAgent } from '../../agent/core.js';
import { config, validateConfig } from '../../utils/config.js';
import { getModelByKey } from '../../utils/models.js';
import chalk from 'chalk';

export function createHardenCommand(): Command {
  const command = new Command('harden');

  command
    .description('Check system hardening and get security recommendations')
    .option('-c, --check', 'Check current hardening status')
    .option('-r, --recommendations', 'Get hardening recommendations')
    .option('--model <model>', 'AI model to use: opus-4.1, opus-4, sonnet-4.5, sonnet-4, sonnet-3.7, haiku-3.5')
    .option('--json <file>', 'Export results to JSON file')
    .option('--md <file>', 'Export results to Markdown file')
    .action(async (options) => {
      const validation = validateConfig();
      if (!validation.valid) {
        ui.error('Configuration Error:');
        validation.errors.forEach(err => ui.error(`  ${err}`));
        process.exit(1);
      }

      ui.section('System Hardening');

      // Get model
      let modelId = config.model;
      if (options.model) {
        const modelConfig = getModelByKey(options.model);
        if (!modelConfig) {
          ui.error(`Invalid model: ${options.model}`);
          ui.info('Valid models: opus-4.1, opus-4, sonnet-4.5, sonnet-4, sonnet-3.7, haiku-3.5');
          process.exit(1);
        }
        modelId = modelConfig.id;
      }

      const checker = new HardeningChecker();
      const reporter = new SecurityReporter();
      const startTime = new Date();

      try {
        if (options.recommendations) {
          const spinner = ui.spinner('Generating hardening recommendations...');
          const result = await checker.getRecommendations();
          spinner.succeed('Recommendations generated');

          if (result.success && result.data) {
            ui.info(`\nPlatform: ${result.data.platform}\n`);

            console.log(chalk.bold.cyan('General Recommendations:'));
            result.data.general.forEach((rec: string, index: number) => {
              console.log(`  ${index + 1}. ${rec}`);
            });

            console.log('\n' + chalk.bold.cyan('Platform-Specific Recommendations:'));
            result.data.platformSpecific.forEach((rec: string, index: number) => {
              console.log(`  ${index + 1}. ${rec}`);
            });
          }
        } else {
          // Default: check hardening
          const spinner = ui.spinner('Checking system hardening...');
          const result = await checker.checkHardening();
          spinner.succeed('Hardening check completed');

          if (result.success && result.data.findings) {
            const scanResult = reporter.createScanResult(result.data.findings, startTime);
            reporter.displayReport(scanResult);

            // Get AI recommendations
            const agent = new CyberAgent({
              mode: 'desktopsecurity',
              apiKey: config.anthropicApiKey,
              googleApiKey: config.googleApiKey,
              model: modelId,
            });

            const aiSpinner = ui.spinner('Getting AI recommendations...');
            const analysis = await agent.analyze(
              'Based on these hardening check findings, provide prioritized, actionable recommendations to improve system security. Focus on the most critical issues first.',
              result.data.findings
            );
            aiSpinner.succeed('AI recommendations ready');

            console.log('\n' + ui.formatAIResponse(analysis));

            if (options.json) {
              reporter.exportJSON(scanResult, options.json);
            }
            if (options.md) {
              reporter.exportMarkdown(scanResult, options.md);
            }
          }
        }
      } catch (error) {
        ui.error(`Hardening check failed: ${error}`);
        process.exit(1);
      }
    });

  return command;
}