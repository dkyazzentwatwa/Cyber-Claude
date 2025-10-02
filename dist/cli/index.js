#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { ui } from '../utils/ui.js';
import { config } from '../utils/config.js';
import { createScanCommand } from './commands/scan.js';
import { createHardenCommand } from './commands/harden.js';
import { createChatCommand } from './commands/chat.js';
import { createInteractiveCommand } from './commands/interactive.js';
import { createWebScanCommand } from './commands/webscan.js';
import { createPcapCommand } from './commands/pcap.js';
import { createReconCommand } from './commands/recon.js';
import { createFlowsCommand } from './commands/flows.js';
import { createMobileScanCommand } from './commands/mobilescan.js';
import { InteractiveSession } from './session.js';
const program = new Command();
program
    .name('cyber-claude')
    .description('🛡️  AI-powered cybersecurity agent for red/blue teaming and desktop security')
    .version('0.3.0');
// Add commands
program.addCommand(createInteractiveCommand());
program.addCommand(createFlowsCommand());
program.addCommand(createScanCommand());
program.addCommand(createHardenCommand());
program.addCommand(createChatCommand());
program.addCommand(createWebScanCommand());
program.addCommand(createMobileScanCommand());
program.addCommand(createPcapCommand());
program.addCommand(createReconCommand());
// Default action - start interactive session
program
    .action(async () => {
    // Check if API key is configured
    if (!config.anthropicApiKey) {
        ui.welcome();
        console.log('\n' + chalk.bold('Quick Commands:'));
        console.log(`  ${chalk.cyan('cyber-claude interactive')} - Start interactive session ${chalk.green('(Recommended)')}`);
        console.log(`  ${chalk.cyan('cyber-claude flows')}       - Pre-configured workflows ${chalk.green('(Beginner-friendly)')}`);
        console.log(`  ${chalk.cyan('cyber-claude scan')}        - Scan your system for security issues`);
        console.log(`  ${chalk.cyan('cyber-claude webscan <url>')} - Scan web applications for vulnerabilities`);
        console.log(`  ${chalk.cyan('cyber-claude mobilescan <file>')} - Scan mobile apps (APK/IPA) for vulnerabilities`);
        console.log(`  ${chalk.cyan('cyber-claude recon <target>')} - OSINT reconnaissance on domains/usernames`);
        console.log(`  ${chalk.cyan('cyber-claude pcap <file>')}   - Analyze network capture files`);
        console.log(`  ${chalk.cyan('cyber-claude harden')}      - Check system hardening status`);
        console.log(`  ${chalk.cyan('cyber-claude chat')}        - One-off chat mode`);
        console.log(`  ${chalk.cyan('cyber-claude --help')}      - Show all commands and options\n`);
        ui.box(`⚠️  ${chalk.yellow.bold('API Key Not Configured')}\n\n` +
            `To use Cyber Claude, you need to set your Anthropic API key:\n\n` +
            `1. Copy ${chalk.cyan('.env.example')} to ${chalk.cyan('.env')}\n` +
            `2. Add your API key: ${chalk.cyan('ANTHROPIC_API_KEY=your_key_here')}\n` +
            `3. Get your key at: ${chalk.blue('https://console.anthropic.com/')}`, '⚙️  Configuration Required', 'warning');
        return;
    }
    // API key is configured - start interactive session directly
    const session = new InteractiveSession();
    await session.start();
});
// Parse arguments
program.parse();
//# sourceMappingURL=index.js.map