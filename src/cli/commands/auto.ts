/**
 * Autonomous Command - AI-powered autonomous task execution
 * Usage: cyber-claude auto "scan example.com for vulnerabilities"
 */

import { Command } from 'commander';
import { AgenticCore, AgenticConfig } from '../../agent/core/agentic.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';
import { Step } from '../../agent/types.js';
import readline from 'readline';

/**
 * Request approval from user for high-risk steps
 */
async function requestUserApproval(step: Step): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    ui.warning(
      `⚠️  Step ${step.stepNumber} requires approval:\n\n` +
        `   Description: ${step.description}\n` +
        `   Tool: ${step.tool}\n` +
        `   Risk Level: ${step.riskLevel.toUpperCase()}\n` +
        `   Parameters: ${JSON.stringify(step.parameters, null, 2)}`
    );

    rl.question('\n   Approve this step? (yes/no): ', (answer) => {
      rl.close();
      const approved = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
      if (approved) {
        ui.success('✓ Step approved');
      } else {
        ui.error('✗ Step denied');
      }
      resolve(approved);
    });
  });
}

/**
 * Create autonomous command
 */
export function createAutoCommand(): Command {
  const command = new Command('auto')
    .description('Execute tasks autonomously using AI planning and execution')
    .argument('<task>', 'Task description (e.g., "scan example.com for vulnerabilities")')
    .option('--mode <mode>', 'Agent mode: base, redteam, blueteam, desktopsecurity, webpentest, osint', 'base')
    .option('--model <model>', 'AI model to use', 'claude-sonnet-4-5')
    .option(
      '--thinking',
      'Enable extended thinking for complex planning',
      false
    )
    .option('--max-steps <n>', 'Maximum steps to execute', '20')
    .option('--max-duration <ms>', 'Maximum duration in milliseconds', '600000')
    .option('--auto-approve', 'Auto-approve all steps (USE WITH CAUTION)', false)
    .option('--verbose', 'Verbose output with progress updates', false)
    .option('--export <file>', 'Export execution context to file')
    .action(async (task: string, options) => {
      try {
        // Validate agent mode
        const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest', 'osint'];
        if (!validModes.includes(options.mode)) {
          throw new Error(
            `Invalid agent mode: ${options.mode}. Must be one of: ${validModes.join(', ')}`
          );
        }

        // Display banner
        ui.section('🤖 AUTONOMOUS AGENT');
        ui.box(
          `Task: ${task}\n` +
          `Mode: ${options.mode.toUpperCase()}\n` +
          `Model: ${options.model}\n` +
          `Max Steps: ${options.maxSteps}\n` +
          `Extended Thinking: ${options.thinking ? 'Enabled' : 'Disabled'}\n` +
          `Auto-Approve: ${options.autoApprove ? 'YES (CAUTION)' : 'No (Safe)'}`
        );

        // Get API keys
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const googleApiKey = process.env.GOOGLE_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (!apiKey && !googleApiKey && !openaiApiKey) {
          throw new Error(
            'No API keys found. Set ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY in environment.'
          );
        }

        // Create agentic config
        const config: AgenticConfig = {
          apiKey,
          googleApiKey,
          openaiApiKey,
          model: options.model,
          mode: options.mode,
          maxSteps: parseInt(options.maxSteps, 10),
          maxDuration: parseInt(options.maxDuration, 10),
          useExtendedThinking: options.thinking,
          autoApprove: options.autoApprove,
          requireApprovalCallback: options.autoApprove ? undefined : requestUserApproval,
          verbose: options.verbose,
        };

        // Create agent
        ui.info('Initializing autonomous agent...');
        const agent = new AgenticCore(config);

        // Execute task
        ui.info('Starting autonomous execution...\n');
        const startTime = Date.now();

        const result = await agent.executeTask(task);

        const duration = Date.now() - startTime;

        // Display results
        if (result.success) {
          ui.success('\n✅ TASK COMPLETED');

          const summary = {
            status: result.context.status,
            stepsCompleted: result.context.completedSteps.length,
            stepsTotal: result.context.plan.steps.length,
            findingsCount: result.context.findings.length,
            errorsCount: result.context.errors.length,
            duration: (duration / 1000).toFixed(1) + 's',
          };

          ui.box(
            `Status: ${summary.status}\n` +
            `Steps: ${summary.stepsCompleted}/${summary.stepsTotal}\n` +
            `Findings: ${summary.findingsCount}\n` +
            `Errors: ${summary.errorsCount}\n` +
            `Duration: ${summary.duration}`
          );

          // Show findings
          if (result.context.findings.length > 0) {
            ui.section('🔍 SECURITY FINDINGS');

            const findingsBySeverity = {
              critical: result.context.findings.filter((f) => f.severity === 'critical'),
              high: result.context.findings.filter((f) => f.severity === 'high'),
              medium: result.context.findings.filter((f) => f.severity === 'medium'),
              low: result.context.findings.filter((f) => f.severity === 'low'),
              info: result.context.findings.filter((f) => f.severity === 'info'),
            };

            ui.box(
              `Critical: ${findingsBySeverity.critical.length}\n` +
              `High: ${findingsBySeverity.high.length}\n` +
              `Medium: ${findingsBySeverity.medium.length}\n` +
              `Low: ${findingsBySeverity.low.length}\n` +
              `Info: ${findingsBySeverity.info.length}`
            );

            // Show top findings
            const topFindings = [
              ...findingsBySeverity.critical,
              ...findingsBySeverity.high,
            ].slice(0, 5);

            if (topFindings.length > 0) {
              console.log('\nTop Findings:\n');
              topFindings.forEach((finding, idx) => {
                console.log(`${idx + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`);
                console.log(`   ${finding.description}\n`);
              });
            }
          }

          // Show errors
          if (result.context.errors.length > 0) {
            ui.warning(`\n⚠️  ${result.context.errors.length} error(s) occurred during execution`);
            result.context.errors.slice(0, 3).forEach((err) => {
              console.log(`   Step ${err.step}: ${err.error}`);
            });
          }

          // Export context if requested
          if (options.export) {
            const fs = await import('fs/promises');
            const contextJson = JSON.stringify(result.context, null, 2);
            await fs.writeFile(options.export, contextJson, 'utf-8');
            ui.success(`\n✓ Context exported to ${options.export}`);
          }
        } else {
          ui.error('\n❌ TASK FAILED');
          ui.box(
            `Error: ${result.error}\n` +
            `Duration: ${(duration / 1000).toFixed(1)}s`
          );

          process.exit(1);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Autonomous execution failed: ${errorMessage}`);
        ui.error(`\n❌ Error: ${errorMessage}`);
        process.exit(1);
      }
    });

  return command;
}
