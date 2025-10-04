/**
 * External Tools Management Command
 */

import { Command } from 'commander';
import { ExternalToolManager } from '../../agent/tools/ExternalToolManager.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';

export function createToolsCommand(): Command {
  const command = new Command('tools');

  command
    .description('Manage external CLI security tools')
    .option('-s, --scan', 'Scan for available tools')
    .option('-l, --list', 'List all tools and their status')
    .option('-a, --available', 'Show only available tools')
    .option('-m, --missing', 'Show only missing tools')
    .option('-i, --install-guide', 'Show installation guide for missing tools')
    .option('-c, --check <tool>', 'Check if a specific tool is available')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        ui.banner();
        console.log(ui.section('🛠️  External Security Tools Manager\n'));

        const spinner = ui.spinner('Scanning for external security tools...');

        // Check specific tool
        if (options.check) {
          spinner.text = `Checking for ${options.check}...`;
          spinner.start();

          const available = await ExternalToolManager.isAvailable(options.check);
          const tool = await ExternalToolManager.getTool(options.check);

          spinner.stop();

          if (!tool) {
            console.log(ui.error(`❌ Tool '${options.check}' not found in registry`));
            process.exit(1);
          }

          if (options.json) {
            console.log(JSON.stringify(tool, null, 2));
          } else {
            const statusIcon = available ? '✅' : '❌';
            const status = available ? 'INSTALLED' : 'NOT INSTALLED';

            console.log(`${statusIcon} ${tool.name} - ${status}`);
            console.log(ui.info(`   ${tool.description}`));

            if (tool.version) {
              console.log(ui.info(`   Version: ${tool.version}`));
            }

            if (!available && tool.installInstructions) {
              console.log(ui.warning(`\n📦 Install: ${tool.installInstructions}`));
            }
          }

          process.exit(available ? 0 : 1);
        }

        // Scan for tools
        spinner.start();
        await ExternalToolManager.scan();
        spinner.stop();

        // Show installation guide
        if (options.installGuide) {
          const guide = await ExternalToolManager.generateInstallGuide();
          console.log(guide);
          return;
        }

        // Show available tools only
        if (options.available) {
          const available = await ExternalToolManager.getAvailable();

          if (options.json) {
            console.log(JSON.stringify(available, null, 2));
          } else {
            if (available.length === 0) {
              console.log(ui.warning('⚠️  No external tools installed'));
              console.log(ui.info('\n💡 Run with --install-guide to see installation instructions'));
            } else {
              console.log(ui.section(`✅ Available Tools (${available.length})\n`));
              for (const tool of available) {
                const version = tool.version || 'unknown';
                console.log(`✅ ${tool.name} (${version}) - ${tool.description}`);
              }
            }
          }
          return;
        }

        // Show missing tools only
        if (options.missing) {
          const missing = await ExternalToolManager.getUnavailable();

          if (options.json) {
            console.log(JSON.stringify(missing, null, 2));
          } else {
            if (missing.length === 0) {
              console.log(ui.success('✅ All external tools are installed!'));
            } else {
              console.log(ui.section(`❌ Missing Tools (${missing.length})\n`));
              for (const tool of missing) {
                console.log(`❌ ${tool.name} - ${tool.description}`);
                if (tool.installInstructions) {
                  console.log(ui.info(`   Install: ${tool.installInstructions}`));
                }
                console.log('');
              }

              console.log(ui.info('\n💡 These tools are optional. Cyber Claude works without them.'));
            }
          }
          return;
        }

        // Default: show status report
        const report = await ExternalToolManager.generateStatusReport();

        if (options.json) {
          const available = await ExternalToolManager.getAvailable();
          const missing = await ExternalToolManager.getUnavailable();
          console.log(
            JSON.stringify(
              {
                available,
                missing,
                summary: {
                  total: available.length + missing.length,
                  installed: available.length,
                  missing: missing.length,
                },
              },
              null,
              2
            )
          );
        } else {
          console.log(report);
        }
      } catch (error: any) {
        logger.error('Tools command failed:', error);
        console.log(ui.error(`\n❌ Command failed: ${error.message}`));
        process.exit(1);
      }
    });

  return command;
}
