import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { config, validateConfig } from '../../utils/config.js';
import { InteractiveSession } from '../session.js';
import { AgentMode } from '../../agent/types.js';
import { AVAILABLE_MODELS, getModelByKey } from '../../utils/models.js';

export function createInteractiveCommand(): Command {
  const command = new Command('interactive');

  command
    .description('Start interactive session (persistent REPL mode)')
    .alias('i')
    .option('-m, --mode <mode>', 'Initial agent mode: base, redteam, blueteam, desktopsecurity, webpentest', 'base')
    .option('--model <model>', 'AI model to use: opus-4.1, opus-4, sonnet-4.5, sonnet-4, sonnet-3.7, haiku-3.5', 'sonnet-4.5')
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

      // Validate and get model
      const modelConfig = getModelByKey(options.model);
      if (!modelConfig) {
        ui.error(`Invalid model: ${options.model}`);
        ui.info(`Valid models: ${Object.keys(AVAILABLE_MODELS).join(', ')}`);
        process.exit(1);
      }

      // Start interactive session
      const session = new InteractiveSession(
        options.mode as AgentMode,
        modelConfig.id
      );

      await session.start();
    });

  return command;
}