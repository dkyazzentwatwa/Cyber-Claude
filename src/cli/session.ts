import inquirer from 'inquirer';
import chalk from 'chalk';
import { ui } from '../utils/ui.js';
import { CyberAgent } from '../agent/core.js';
import { DesktopScanner } from '../agent/tools/scanner.js';
import { HardeningChecker } from '../agent/tools/hardening.js';
import { SecurityReporter } from '../agent/tools/reporter.js';
import { config } from '../utils/config.js';
import { AgentMode } from '../agent/types.js';
import { AVAILABLE_MODELS, ModelKey, getModelByKey } from '../utils/models.js';

interface SessionState {
  agent: CyberAgent;
  mode: AgentMode;
  model: string;
  commandHistory: string[];
}

export class InteractiveSession {
  private state: SessionState;
  private scanner: DesktopScanner;
  private hardening: HardeningChecker;
  private reporter: SecurityReporter;

  constructor(initialMode: AgentMode = 'base', model?: string) {
    this.scanner = new DesktopScanner();
    this.hardening = new HardeningChecker();
    this.reporter = new SecurityReporter();

    const selectedModel = model || config.model;

    this.state = {
      agent: new CyberAgent({
        mode: initialMode,
        apiKey: config.anthropicApiKey,
        googleApiKey: config.googleApiKey,
        model: selectedModel,
      }),
      mode: initialMode,
      model: selectedModel,
      commandHistory: [],
    };
  }

  /**
   * Start the interactive session
   */
  async start(): Promise<void> {
    ui.clear();
    ui.banner();
    this.showModeStatus();
    this.showWelcome();

    // Main session loop
    while (true) {
      try {
        const prompt = this.getPrompt();
        const { command } = await inquirer.prompt({
          type: 'input',
          name: 'command',
          message: prompt,
          prefix: '',
        } as any);

        if (!command || command.trim() === '') {
          continue;
        }

        const trimmedCommand = command.trim();
        this.state.commandHistory.push(trimmedCommand);

        // Handle commands
        const shouldExit = await this.handleCommand(trimmedCommand);
        if (shouldExit) {
          break;
        }
      } catch (error) {
        // User pressed Ctrl+C or error occurred
        console.log('\n');
        ui.info('Exiting session...');
        break;
      }
    }
  }

  private getPrompt(): string {
    const modeIcons = {
      base: '🤖',
      redTeam: '⚔️',
      blueTeam: '🛡️',
      desktopSecurity: '🔒',
    };

    const icon = modeIcons[this.state.mode];
    const text = `${icon} [${this.state.mode}] >`;

    // Apply color based on mode
    switch (this.state.mode) {
      case 'redTeam':
        return chalk.red(text);
      case 'blueTeam':
        return chalk.blue(text);
      case 'desktopSecurity':
        return chalk.green(text);
      default:
        return chalk.cyan(text);
    }
  }

  private showModeStatus(): void {
    const modelInfo = Object.values(AVAILABLE_MODELS).find(m => m.id === this.state.model);
    const modelName = modelInfo?.name || this.state.model;

    console.log(chalk.dim(`Mode: ${chalk.bold(this.state.mode)} | Model: ${chalk.bold(modelName)}\n`));
  }

  private showWelcome(): void {
    ui.box(
      `Welcome to ${chalk.bold('Cyber Claude Interactive Session')}!\n\n` +
      `${chalk.bold('Commands:')}\n` +
      `  ${chalk.cyan('scan')} - Quick security scan\n` +
      `  ${chalk.cyan('scan full')} - Full system scan\n` +
      `  ${chalk.cyan('scan network')} - Network scan\n` +
      `  ${chalk.cyan('harden')} - Check hardening\n` +
      `  ${chalk.cyan('mode <mode>')} - Change mode (base, redTeam, blueTeam, desktopSecurity)\n` +
      `  ${chalk.cyan('model')} - Select model\n` +
      `  ${chalk.cyan('status')} - Show session status\n` +
      `  ${chalk.cyan('clear')} - Clear conversation history\n` +
      `  ${chalk.cyan('history')} - Show command history\n` +
      `  ${chalk.cyan('help')} - Show help\n` +
      `  ${chalk.cyan('exit')} / ${chalk.cyan('quit')} - Exit session\n\n` +
      `${chalk.dim('Or just type naturally to chat with the agent...')}`,
      '🚀 Interactive Session',
      'info'
    );
  }

  private async handleCommand(command: string): Promise<boolean> {
    const parts = command.toLowerCase().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    // Check for built-in commands first
    switch (cmd) {
      case 'exit':
      case 'quit':
        ui.info('Goodbye! 👋');
        return true;

      case 'help':
        this.showHelp();
        return false;

      case 'clear':
        this.state.agent.clearHistory();
        ui.success('Conversation history cleared');
        return false;

      case 'status':
        this.showStatus();
        return false;

      case 'history':
        this.showHistory();
        return false;

      case 'mode':
        await this.handleModeChange(args);
        return false;

      case 'model':
        await this.handleModelSelect();
        return false;

      case 'scan':
        await this.handleScan(args);
        return false;

      case 'harden':
        await this.handleHarden();
        return false;

      default:
        // If not a built-in command, send to agent as chat
        await this.handleChat(command);
        return false;
    }
  }

  private showHelp(): void {
    ui.section('Available Commands');

    console.log(chalk.bold.cyan('\n📊 Scanning & Analysis:'));
    console.log(`  ${chalk.cyan('scan')}              Quick security check`);
    console.log(`  ${chalk.cyan('scan full')}         Full system scan with AI analysis`);
    console.log(`  ${chalk.cyan('scan network')}      Analyze network connections`);
    console.log(`  ${chalk.cyan('harden')}            Check system hardening status`);

    console.log(chalk.bold.cyan('\n⚙️  Session Control:'));
    console.log(`  ${chalk.cyan('mode <mode>')}       Switch agent mode`);
    console.log(`  ${chalk.cyan('model')}             Select AI model`);
    console.log(`  ${chalk.cyan('status')}            Show current session status`);
    console.log(`  ${chalk.cyan('clear')}             Clear conversation history`);
    console.log(`  ${chalk.cyan('history')}           Show command history`);

    console.log(chalk.bold.cyan('\n💬 Chat:'));
    console.log(`  ${chalk.dim('Just type naturally to chat with the agent')}`);

    console.log(chalk.bold.cyan('\n🚪 Exit:'));
    console.log(`  ${chalk.cyan('exit')} / ${chalk.cyan('quit')}     Exit session\n`);

    console.log(chalk.bold('Agent Modes:'));
    console.log(`  ${chalk.cyan('base')}             General security assistant`);
    console.log(`  ${chalk.red('redTeam')}          Offensive security perspective`);
    console.log(`  ${chalk.blue('blueTeam')}         Defensive security focus`);
    console.log(`  ${chalk.green('desktopSecurity')}  Personal computer security\n`);
  }

  private showStatus(): void {
    const modelInfo = Object.values(AVAILABLE_MODELS).find(m => m.id === this.state.model);

    ui.box(
      `${chalk.bold('Current Mode:')} ${this.state.mode}\n` +
      `${chalk.bold('Model:')} ${modelInfo?.name || this.state.model}\n` +
      `${chalk.bold('Commands Executed:')} ${this.state.commandHistory.length}\n` +
      `${chalk.bold('Conversation Messages:')} ${this.state.agent.getHistory().length}`,
      '📊 Session Status',
      'info'
    );
  }

  private showHistory(): void {
    if (this.state.commandHistory.length === 0) {
      ui.info('No commands in history yet');
      return;
    }

    console.log(chalk.bold('\n📜 Command History:\n'));
    this.state.commandHistory.slice(-10).forEach((cmd, index) => {
      const num = this.state.commandHistory.length - 10 + index + 1;
      console.log(chalk.dim(`  ${num}.`) + ` ${cmd}`);
    });
    console.log('');
  }

  private async handleModeChange(args: string[]): Promise<void> {
    if (args.length === 0) {
      ui.info(`Current mode: ${this.state.mode}`);
      ui.info('Available modes: base, redTeam, blueTeam, desktopSecurity');
      return;
    }

    const newMode = args[0] as AgentMode;
    const validModes = ['base', 'redTeam', 'blueTeam', 'desktopSecurity'];

    if (validModes.includes(newMode)) {
      this.state.mode = newMode;
      this.state.agent.setMode(newMode);
      ui.success(`Switched to ${chalk.bold(newMode)} mode`);
      this.showModeStatus();
    } else {
      ui.error(`Invalid mode: ${newMode}`);
      ui.info(`Valid modes: ${validModes.join(', ')}`);
    }
  }

  private async handleModelSelect(): Promise<void> {
    const choices = Object.entries(AVAILABLE_MODELS).map(([key, model]) => ({
      name: `${model.name} ${model.recommended ? chalk.green('(Recommended)') : ''}\n  ${chalk.dim(model.description)}`,
      value: key,
      short: model.name,
    }));

    const { selectedModel } = await inquirer.prompt({
      type: 'list',
      name: 'selectedModel',
      message: 'Select AI model:',
      choices,
      default: 'sonnet-4',
    } as any);

    const model = getModelByKey(selectedModel);
    if (model) {
      this.state.model = model.id;
      this.state.agent = new CyberAgent({
        mode: this.state.mode,
        apiKey: config.anthropicApiKey,
        googleApiKey: config.googleApiKey,
        model: model.id,
      });
      ui.success(`Switched to ${chalk.bold(model.name)}`);
      this.showModeStatus();
    }
  }

  private async handleScan(args: string[]): Promise<void> {
    const scanType = args[0] || 'quick';

    try {
      if (scanType === 'full') {
        const spinner = ui.spinner('Performing full system scan...');
        const result = await this.scanner.scanSystem();
        spinner.succeed('System scan completed');

        if (result.success) {
          ui.info('Analyzing with AI...');
          const aiSpinner = ui.spinner('AI analyzing system security...');
          const analysis = await this.state.agent.analyze(
            'Perform a comprehensive security analysis of this system. Identify vulnerabilities, security misconfigurations, and potential risks. Provide specific, actionable recommendations.',
            result.data
          );
          aiSpinner.succeed('Analysis complete');
          console.log('\n' + analysis + '\n');
        }
      } else if (scanType === 'network') {
        const spinner = ui.spinner('Scanning network connections...');
        const result = await this.scanner.scanNetwork();
        spinner.succeed('Network scan completed');

        if (result.success) {
          const aiSpinner = ui.spinner('Analyzing network connections...');
          const analysis = await this.state.agent.analyze(
            'Analyze these network connections for security concerns. Identify any suspicious connections, unusual ports, or potential security risks.',
            result.data
          );
          aiSpinner.succeed('Analysis complete');
          console.log('\n' + analysis + '\n');
        }
      } else {
        // Quick scan
        const spinner = ui.spinner('Running quick security check...');
        const result = await this.scanner.quickCheck();
        spinner.succeed('Quick check completed');

        if (result.success && result.data.findings) {
          const scanResult = this.reporter.createScanResult(result.data.findings, new Date());
          this.reporter.displayReport(scanResult);
        }
      }
    } catch (error) {
      ui.error(`Scan failed: ${error}`);
    }
  }

  private async handleHarden(): Promise<void> {
    try {
      const spinner = ui.spinner('Checking system hardening...');
      const result = await this.hardening.checkHardening();
      spinner.succeed('Hardening check completed');

      if (result.success && result.data.findings) {
        const scanResult = this.reporter.createScanResult(result.data.findings, new Date());
        this.reporter.displayReport(scanResult);

        const aiSpinner = ui.spinner('Getting AI recommendations...');
        const analysis = await this.state.agent.analyze(
          'Based on these hardening check findings, provide prioritized, actionable recommendations to improve system security. Focus on the most critical issues first.',
          result.data.findings
        );
        aiSpinner.succeed('Recommendations ready');
        console.log('\n' + analysis + '\n');
      }
    } catch (error) {
      ui.error(`Hardening check failed: ${error}`);
    }
  }

  private async handleChat(message: string): Promise<void> {
    const spinner = ui.spinner('Thinking...');

    try {
      const response = await this.state.agent.chat(message);
      spinner.stop();

      console.log(chalk.magenta('\nCyber Claude:'));
      console.log(response + '\n');
    } catch (error) {
      spinner.fail('Error communicating with agent');
      ui.error(`${error}`);
    }
  }
}