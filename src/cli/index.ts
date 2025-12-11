#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ui } from '../utils/ui.js';
import { config, getSetupSuggestions } from '../utils/config.js';
import { createScanCommand } from './commands/scan.js';
import { createHardenCommand } from './commands/harden.js';
import { createChatCommand } from './commands/chat.js';
import { createInteractiveCommand } from './commands/interactive.js';
import { createWebScanCommand } from './commands/webscan.js';
import { createPcapCommand } from './commands/pcap.js';
import { createReconCommand } from './commands/recon.js';
import { createFlowsCommand } from './commands/flows.js';
import { createMobileScanCommand } from './commands/mobilescan.js';
import { createAutoCommand } from './commands/auto.js';
import { createDepsCommand } from './commands/deps.js';
import { createSSLCommand } from './commands/ssl.js';
import { createScreenshotCommand } from './commands/screenshot.js';
import { createToolsCommand } from './commands/tools.js';
import { createCVECommand } from './commands/cve.js';
import { createLogsCommand } from './commands/logs.js';
import { createDaemonCommand } from './commands/daemon.js';
import { createWeb3Command } from './commands/web3.js';
import { InteractiveSession } from './session.js';
import { checkProviderAvailability } from '../agent/providers/fallback.js';

const program = new Command();

program
  .name('cyber-claude')
  .description('🛡️  AI-powered cybersecurity agent for red/blue teaming and desktop security')
  .version('0.7.0');

// Add commands
program.addCommand(createInteractiveCommand());
program.addCommand(createAutoCommand());
program.addCommand(createFlowsCommand());
program.addCommand(createScanCommand());
program.addCommand(createHardenCommand());
program.addCommand(createChatCommand());
program.addCommand(createWebScanCommand());
program.addCommand(createMobileScanCommand());
program.addCommand(createPcapCommand());
program.addCommand(createReconCommand());
program.addCommand(createDepsCommand());
program.addCommand(createSSLCommand());
program.addCommand(createScreenshotCommand());
program.addCommand(createToolsCommand());
program.addCommand(createCVECommand());
program.addCommand(createLogsCommand());
program.addCommand(createDaemonCommand());
program.addCommand(createWeb3Command());

// Default action - start interactive session
program
  .action(async () => {
    // Check for available AI providers
    const providerStatuses = await checkProviderAvailability();
    const availableProviders = providerStatuses.filter(s => s.available);

    if (availableProviders.length === 0) {
      // No providers available - show setup instructions
      ui.welcome();
      console.log('\n' + chalk.bold('Quick Commands:'));
      console.log(`  ${chalk.cyan('cyber-claude interactive')} - Start interactive session ${chalk.green('(Recommended)')}`);
      console.log(`  ${chalk.cyan('cyber-claude flows')}       - Pre-configured workflows ${chalk.green('(Beginner-friendly)')}`);
      console.log(`  ${chalk.cyan('cyber-claude auto <task>')} - Autonomous AI execution ${chalk.yellow('(Advanced)')}`);
      console.log(`  ${chalk.cyan('cyber-claude scan')}        - Scan your system for security issues`);
      console.log(`  ${chalk.cyan('cyber-claude webscan <url>')} - Scan web applications for vulnerabilities`);
      console.log(`  ${chalk.cyan('cyber-claude mobilescan <file>')} - Scan mobile apps (APK/IPA) for vulnerabilities`);
      console.log(`  ${chalk.cyan('cyber-claude recon <target>')} - OSINT reconnaissance on domains/usernames`);
      console.log(`  ${chalk.cyan('cyber-claude pcap <file>')}   - Analyze network capture files`);
      console.log(`  ${chalk.cyan('cyber-claude deps [path]')}   - Scan JavaScript dependencies for vulnerabilities`);
      console.log(`  ${chalk.cyan('cyber-claude ssl <host>')}    - Analyze SSL/TLS certificates`);
      console.log(`  ${chalk.cyan('cyber-claude screenshot <url>')} - Capture website screenshots`);
      console.log(`  ${chalk.cyan('cyber-claude cve <cve-id>')}  - Lookup CVE vulnerability details`);
      console.log(`  ${chalk.cyan('cyber-claude logs <file>')}  - Analyze log files for security issues`);
      console.log(`  ${chalk.cyan('cyber-claude web3 scan <file>')} - Scan smart contracts for vulnerabilities`);
      console.log(`  ${chalk.cyan('cyber-claude tools')}        - Manage external security tools`);
      console.log(`  ${chalk.cyan('cyber-claude harden')}      - Check system hardening status`);
      console.log(`  ${chalk.cyan('cyber-claude chat')}        - One-off chat mode`);
      console.log(`  ${chalk.cyan('cyber-claude --help')}      - Show all commands and options\n`);

      ui.box(
        `⚠️  ${chalk.yellow.bold('No AI Provider Available')}\n\n` +
        `Configure at least one AI provider:\n\n` +
        `${chalk.bold('Option 1: Claude (Anthropic)')}\n` +
        `  • Set ${chalk.cyan('ANTHROPIC_API_KEY')} in .env file\n` +
        `  • Get key: ${chalk.blue('https://console.anthropic.com/')}\n\n` +
        `${chalk.bold('Option 2: Gemini (Google)')}\n` +
        `  • Set ${chalk.cyan('GOOGLE_API_KEY')} in .env file\n` +
        `  • Get key: ${chalk.blue('https://aistudio.google.com/apikey')}\n\n` +
        `${chalk.bold('Option 3: Ollama (Free, Local)')} ${chalk.green('← No API key needed!')}\n` +
        `  • Install: ${chalk.cyan('curl -fsSL https://ollama.com/install.sh | sh')}\n` +
        `  • Pull model: ${chalk.cyan('ollama pull deepseek-r1:8b')}\n` +
        `  • Start: ${chalk.cyan('ollama serve')}`,
        '⚙️  Configuration Required',
        'warning'
      );
      return;
    }

    // At least one provider is available - show status and start
    const providerNames = availableProviders.map(p => {
      if (p.provider === 'ollama') return `${chalk.green('Ollama')} (local)`;
      if (p.provider === 'claude') return chalk.blue('Claude');
      if (p.provider === 'gemini') return chalk.yellow('Gemini');
      return p.provider;
    }).join(', ');

    console.log(chalk.dim(`Available providers: ${providerNames}\n`));

    // Start interactive session
    const session = new InteractiveSession();
    await session.start();
  });

// Parse arguments
program.parse();