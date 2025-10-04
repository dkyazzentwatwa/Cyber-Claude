/**
 * Website Screenshot Command
 */

import { Command } from 'commander';
import { ScreenshotTool } from '../../agent/tools/ScreenshotTool.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';

export function createScreenshotCommand(): Command {
  const command = new Command('screenshot');

  command
    .description('Capture website screenshots and detect technologies')
    .argument('<url>', 'Website URL to capture')
    .option('-o, --output <file>', 'Output file path')
    .option('--width <number>', 'Viewport width', '1920')
    .option('--height <number>', 'Viewport height', '1080')
    .option('--no-full-page', 'Capture viewport only (not full page)')
    .option('--no-detect-tech', 'Skip technology detection')
    .option('--json', 'Output metadata in JSON format')
    .action(async (url: string, options) => {
      try {
        ui.banner();
        console.log(ui.section('📸 Website Screenshot Tool\n'));

        // Validate URL
        try {
          new URL(url);
        } catch {
          console.log(ui.error('❌ Invalid URL format'));
          process.exit(1);
        }

        const width = parseInt(options.width, 10);
        const height = parseInt(options.height, 10);

        if (isNaN(width) || isNaN(height)) {
          console.log(ui.error('❌ Invalid width or height'));
          process.exit(1);
        }

        // Generate output path if not provided
        const outputPath =
          options.output || ScreenshotTool.generateOutputPath(url, './screenshots');

        const spinner = ui.spinner(`Capturing screenshot of ${url}...`);
        spinner.start();

        const result = await ScreenshotTool.capture({
          url,
          outputPath,
          width,
          height,
          fullPage: options.fullPage,
          detectTechnologies: options.detectTech,
        });

        spinner.stop();

        if (!result.success) {
          console.log(ui.error(`\n❌ Screenshot failed: ${result.error}`));
          process.exit(1);
        }

        if (options.json) {
          // Output metadata in JSON
          const metadata = {
            success: result.success,
            url: result.url,
            screenshotPath: result.screenshotPath,
            pageTitle: result.pageTitle,
            finalUrl: result.finalUrl,
            statusCode: result.statusCode,
            technologies: result.technologies,
            metadata: result.metadata,
          };
          console.log(JSON.stringify(metadata, null, 2));
        } else {
          console.log(ScreenshotTool.formatResults(result));
        }

        // Summary
        if (!options.json) {
          console.log(ui.section('\n✅ Screenshot Complete'));

          if (result.screenshotPath) {
            console.log(ui.success(`📁 Saved to: ${result.screenshotPath}`));
          }

          if (result.technologies && result.technologies.length > 0) {
            console.log(ui.info(`🔧 Technologies: ${result.technologies.join(', ')}`));
          }

          // Open screenshot (optional)
          console.log(ui.info(`\n💡 Tip: Open the screenshot with your default image viewer`));
        }
      } catch (error: any) {
        logger.error('Screenshot capture failed:', error);
        console.log(ui.error(`\n❌ Capture failed: ${error.message}`));

        if (error.message.includes('Protocol error')) {
          console.log(
            ui.warning('\n💡 Tip: The website may be blocking headless browsers or require JavaScript')
          );
        }

        process.exit(1);
      }
    });

  return command;
}
