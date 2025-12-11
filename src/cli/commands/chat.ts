import { Command } from 'commander';
import inquirer from 'inquirer';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { config, validateConfig } from '../../utils/config.js';
import { AgentMode } from '../../agent/types.js';
import { getModelByKey } from '../../utils/models.js';
import chalk from 'chalk';

export function createChatCommand(): Command {
  const command = new Command('chat');

  command
    .description('Interactive chat mode with security agent (one-off)')
    .option('-m, --mode <mode>', 'Agent mode: base, redteam, blueteam, desktopsecurity, webpentest', 'base')
    .option('--model <model>', 'AI model to use: opus-4.1, opus-4, sonnet-4.5, sonnet-4, sonnet-3.7, haiku-3.5')
    .action(async (options) => {
      const validation = validateConfig();
      if (!validation.valid) {
        ui.error('Configuration Error:');
        validation.errors.forEach(err => ui.error(`  ${err}`));
        process.exit(1);
      }

      // Validate mode
      const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest'];
      if (!validModes.includes(options.mode)) {
        ui.error(`Invalid mode: ${options.mode}`);
        ui.info(`Valid modes: ${validModes.join(', ')}`);
        process.exit(1);
      }

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

      ui.clear();
      ui.banner();

      const modeEmojis: Record<AgentMode, string> = {
        base: '🤖',
        redteam: '⚔️',
        blueteam: '🛡️',
        desktopsecurity: '🔒',
        webpentest: '🌐',
        osint: '🔍',
        smartcontract: '📜',
      };

      const currentMode = options.mode as AgentMode;
      let modeText = `\n${modeEmojis[currentMode]} ${options.mode.toUpperCase()} MODE ACTIVATED\n`;

      // Apply color based on mode
      switch (currentMode) {
        case 'redteam':
          console.log(chalk.red.bold(modeText));
          break;
        case 'blueteam':
          console.log(chalk.blue.bold(modeText));
          break;
        case 'desktopsecurity':
          console.log(chalk.green.bold(modeText));
          break;
        case 'webpentest':
          console.log(chalk.magenta.bold(modeText));
          break;
        default:
          console.log(chalk.cyan.bold(modeText));
      }

      ui.box(
        `You are now chatting with Cyber Claude in ${chalk.bold(options.mode)} mode.\n\n` +
        `Commands:\n` +
        `  ${chalk.cyan('/mode <mode>')} - Switch agent mode\n` +
        `  ${chalk.cyan('/clear')} - Clear conversation history\n` +
        `  ${chalk.cyan('/help')} - Show help\n` +
        `  ${chalk.cyan('/exit')} - Exit chat mode\n\n` +
        `Type your security questions or requests below.`,
        '💬 Chat Mode',
        'info'
      );

      const agent = new CyberAgent({
        mode: options.mode as AgentMode,
        apiKey: config.anthropicApiKey,
        googleApiKey: config.googleApiKey,
        model: modelId,
      });

      // Chat loop
      while (true) {
        try {
          const { message } = await inquirer.prompt({
            type: 'input',
            name: 'message',
            message: chalk.cyan('You:'),
            prefix: '',
          } as any);

          if (!message || message.trim() === '') {
            continue;
          }

          const trimmedMessage = message.trim();

          // Handle commands
          if (trimmedMessage.startsWith('/')) {
            const handled = await handleChatCommand(trimmedMessage, agent);
            if (handled === 'exit') {
              break;
            }
            continue;
          }

          // Send to agent
          const spinner = ui.spinner('Thinking...');

          try {
            const response = await agent.chat(trimmedMessage);
            spinner.stop();

            console.log(chalk.magenta('\nCyber Claude:'));
            console.log(ui.formatAIResponse(response));
            console.log('');
          } catch (error) {
            spinner.fail('Error communicating with agent');
            ui.error(`${error}`);
          }

        } catch (error) {
          // User pressed Ctrl+C or error occurred
          break;
        }
      }

      ui.info('Exiting chat mode...');
    });

  return command;
}

async function handleChatCommand(command: string, agent: CyberAgent): Promise<string | void> {
  const parts = command.slice(1).split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case 'exit':
    case 'quit':
      return 'exit';

    case 'clear':
      agent.clearHistory();
      ui.success('Conversation history cleared');
      break;

    case 'mode':
      if (args.length === 0) {
        ui.info(`Current mode: ${agent.getMode()}`);
        ui.info('Available modes: base, redteam, blueteam, desktopsecurity, webpentest');
      } else {
        const newMode = args[0] as AgentMode;
        const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest'];

        if (validModes.includes(newMode)) {
          agent.setMode(newMode);
          ui.success(`Switched to ${newMode} mode`);
        } else {
          ui.error(`Invalid mode: ${newMode}`);
          ui.info(`Valid modes: ${validModes.join(', ')}`);
        }
      }
      break;

    case 'help':
      ui.box(
        `Chat Commands:\n\n` +
        `  ${chalk.cyan('/mode <mode>')} - Switch between modes\n` +
        `  ${chalk.cyan('/clear')} - Clear conversation history\n` +
        `  ${chalk.cyan('/help')} - Show this help message\n` +
        `  ${chalk.cyan('/exit')} - Exit chat mode\n\n` +
        `Agent Modes:\n` +
        `  ${chalk.cyan('base')} - General security assistant\n` +
        `  ${chalk.red('redteam')} - Offensive security perspective (defensive only)\n` +
        `  ${chalk.blue('blueteam')} - Defensive security focus\n` +
        `  ${chalk.green('desktopsecurity')} - Personal computer security\n` +
        `  ${chalk.magenta('webpentest')} - Web application security testing`,
        '❓ Help',
        'info'
      );
      break;

    default:
      ui.error(`Unknown command: ${cmd}`);
      ui.info('Type /help for available commands');
      break;
  }
}