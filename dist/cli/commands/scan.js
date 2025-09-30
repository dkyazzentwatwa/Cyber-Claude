import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { DesktopScanner } from '../../agent/tools/scanner.js';
import { SecurityReporter } from '../../agent/tools/reporter.js';
import { config, validateConfig } from '../../utils/config.js';
import { getModelByKey } from '../../utils/models.js';
export function createScanCommand() {
    const command = new Command('scan');
    command
        .description('Perform security scan on the system')
        .option('-q, --quick', 'Perform quick security check')
        .option('-f, --full', 'Perform full system scan')
        .option('-n, --network', 'Scan network connections')
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
        ui.section('Security Scan');
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
        const scanner = new DesktopScanner();
        const reporter = new SecurityReporter();
        const startTime = new Date();
        try {
            let spinner;
            let result;
            if (options.quick) {
                spinner = ui.spinner('Running quick security check...');
                result = await scanner.quickCheck();
                spinner.succeed('Quick check completed');
                if (result.success && result.data.findings) {
                    const scanResult = reporter.createScanResult(result.data.findings, startTime);
                    reporter.displayReport(scanResult);
                    if (options.json) {
                        reporter.exportJSON(scanResult, options.json);
                    }
                    if (options.md) {
                        reporter.exportMarkdown(scanResult, options.md);
                    }
                }
            }
            else if (options.network) {
                spinner = ui.spinner('Scanning network connections...');
                result = await scanner.scanNetwork();
                spinner.succeed('Network scan completed');
                if (result.success) {
                    ui.info(`Found ${result.data.connections.length} network connections`);
                    // Analyze with AI
                    const agent = new CyberAgent({
                        mode: 'desktopsecurity',
                        apiKey: config.anthropicApiKey,
                        googleApiKey: config.googleApiKey,
                        model: modelId,
                    });
                    spinner = ui.spinner('Analyzing network connections with AI...');
                    const analysis = await agent.analyze('Analyze these network connections for security concerns. Identify any suspicious connections, unusual ports, or potential security risks.', result.data);
                    spinner.succeed('Analysis completed');
                    console.log('\n' + ui.formatAIResponse(analysis));
                }
            }
            else {
                // Full system scan
                spinner = ui.spinner('Performing full system scan...');
                result = await scanner.scanSystem();
                spinner.succeed('System scan completed');
                if (result.success) {
                    ui.info('Scan data collected. Analyzing with AI...');
                    // Analyze with AI
                    const agent = new CyberAgent({
                        mode: 'desktopsecurity',
                        apiKey: config.anthropicApiKey,
                        googleApiKey: config.googleApiKey,
                        model: modelId,
                    });
                    spinner = ui.spinner('AI analyzing system security...');
                    const analysis = await agent.analyze('Perform a comprehensive security analysis of this system. Identify vulnerabilities, security misconfigurations, and potential risks. Provide specific, actionable recommendations.', result.data);
                    spinner.succeed('AI analysis completed');
                    console.log('\n' + ui.formatAIResponse(analysis));
                    // Parse findings (if we want structured output)
                    // For now, just show the AI response
                }
            }
            if (!result.success) {
                ui.error(result.error || 'Scan failed');
                process.exit(1);
            }
        }
        catch (error) {
            ui.error(`Scan failed: ${error}`);
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=scan.js.map