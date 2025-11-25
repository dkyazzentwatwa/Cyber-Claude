import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { Daemon } from '../../daemon/Daemon.js';
import { ScanJob } from '../../daemon/types.js';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import * as path from 'path';

let daemonInstance: Daemon | null = null;

/**
 * Get or create daemon instance
 */
function getDaemon(): Daemon {
  if (!daemonInstance) {
    daemonInstance = new Daemon();
  }
  return daemonInstance;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format date in human-readable format
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleString();
}

export function createDaemonCommand(): Command {
  const command = new Command('daemon');

  command.description('Manage the background scanning daemon');

  // daemon start
  command
    .command('start')
    .description('Start the daemon in the background')
    .option('-d, --detach', 'Run daemon in detached mode (background)')
    .action(async (options) => {
      try {
        const daemon = getDaemon();

        if (options.detach) {
          // TODO: Implement proper daemon detachment with process management
          ui.warning('Detached mode not yet implemented. Starting in foreground...');
        }

        ui.section('Starting Cyber Claude Daemon');
        await daemon.start();

        const status = daemon.getStatus();
        ui.success(`✓ Daemon started with ${daemon.getJobs().length} jobs`);

        if (status.nextScheduledJob) {
          console.log(`Next scheduled run: ${status.nextScheduledJob.jobName} at ${formatDate(status.nextScheduledJob.scheduledTime)}`);
        }

        // Keep daemon running
        console.log('\nPress Ctrl+C to stop the daemon\n');

        process.on('SIGINT', () => {
          console.log('\n');
          ui.section('Stopping daemon...');
          daemon.stop();
          process.exit(0);
        });

        // Keep process alive
        await new Promise(() => {}); // Infinite wait

      } catch (error: any) {
        ui.error(`Failed to start daemon: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon stop
  command
    .command('stop')
    .description('Stop the daemon')
    .action(async () => {
      try {
        const daemon = getDaemon();
        daemon.stop();
        ui.success('✓ Daemon stopped');
      } catch (error: any) {
        ui.error(`Failed to stop daemon: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon status
  command
    .command('status')
    .description('Show daemon status')
    .action(async () => {
      try {
        const daemon = getDaemon();
        const status = daemon.getStatus();

        ui.section('Daemon Status');

        console.log(`Running: ${status.running ? chalk.green('Yes') : chalk.red('No')}`);

        if (status.running) {
          console.log(`Uptime: ${formatDuration(status.uptime)}`);
          console.log(`Jobs executed: ${status.jobsExecuted}`);
          console.log(`Jobs failed: ${status.jobsFailed}`);

          if (status.currentJobs.length > 0) {
            console.log(`\nCurrently running jobs: ${status.currentJobs.length}`);
            status.currentJobs.forEach(job => {
              console.log(`  - ${job.jobId} (started ${formatDate(job.startTime)})`);
            });
          }

          if (status.nextScheduledJob) {
            console.log(`\nNext scheduled job:`);
            console.log(`  ${status.nextScheduledJob.jobName}`);
            console.log(`  at ${formatDate(status.nextScheduledJob.scheduledTime)}`);
          }
        }

      } catch (error: any) {
        ui.error(`Failed to get status: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon jobs list
  command
    .command('jobs')
    .description('List all scheduled jobs')
    .action(async () => {
      try {
        const daemon = getDaemon();
        const jobs = daemon.getJobs();

        if (jobs.length === 0) {
          console.log('No scheduled jobs');
          return;
        }

        ui.section(`Scheduled Jobs (${jobs.length})`);

        jobs.forEach(job => {
          const statusIcon = job.enabled ? chalk.green('✓') : chalk.gray('○');
          const typeColor = {
            webscan: chalk.blue,
            portscan: chalk.cyan,
            'log-analysis': chalk.yellow,
            'cve-check': chalk.magenta,
          }[job.type] || chalk.white;

          console.log(`\n${statusIcon} ${chalk.bold(job.name)} ${chalk.gray(`(${job.id.substring(0, 8)})`)}`);
          console.log(`  Type: ${typeColor(job.type)}`);
          console.log(`  Target: ${job.target}`);
          console.log(`  Schedule: ${job.schedule}`);

          if (job.lastRun) {
            const resultIcon = job.lastResult?.success ? chalk.green('✓') : chalk.red('✗');
            console.log(`  Last run: ${formatDate(job.lastRun)} ${resultIcon}`);
            if (job.lastResult) {
              console.log(`    Duration: ${formatDuration(job.lastResult.duration)}`);
              console.log(`    Findings: ${job.lastResult.findingsCount}`);
              if (job.lastResult.error) {
                console.log(`    Error: ${chalk.red(job.lastResult.error)}`);
              }
            }
          }

          if (job.nextRun) {
            console.log(`  Next run: ${formatDate(job.nextRun)}`);
          }
        });

      } catch (error: any) {
        ui.error(`Failed to list jobs: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon add
  command
    .command('add')
    .description('Add a new scheduled job')
    .requiredOption('-n, --name <name>', 'Job name')
    .requiredOption('-t, --type <type>', 'Job type: webscan, portscan, log-analysis, cve-check')
    .requiredOption('-T, --target <target>', 'Scan target (URL, IP, log file, CVE ID)')
    .requiredOption('-s, --schedule <cron>', 'Cron schedule expression (e.g., "0 */6 * * *" for every 6 hours)')
    .option('--disabled', 'Create job in disabled state')
    .option('-o, --options <json>', 'Job options as JSON string')
    .action(async (options) => {
      try {
        const daemon = getDaemon();

        // Validate job type
        const validTypes = ['webscan', 'portscan', 'log-analysis', 'cve-check'];
        if (!validTypes.includes(options.type)) {
          ui.error(`Invalid job type. Must be one of: ${validTypes.join(', ')}`);
          process.exit(1);
        }

        // Parse options
        let jobOptions = {};
        if (options.options) {
          try {
            jobOptions = JSON.parse(options.options);
          } catch (error) {
            ui.error('Invalid options JSON');
            process.exit(1);
          }
        }

        const job = await daemon.addJob({
          name: options.name,
          type: options.type,
          target: options.target,
          schedule: options.schedule,
          enabled: !options.disabled,
          options: jobOptions,
        });

        ui.success(`✓ Added job: ${job.name} (${job.id})`);
        console.log(`Schedule: ${job.schedule}`);
        if (job.nextRun) {
          console.log(`Next run: ${formatDate(job.nextRun)}`);
        }

      } catch (error: any) {
        ui.error(`Failed to add job: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon remove
  command
    .command('remove <job-id>')
    .description('Remove a scheduled job')
    .action(async (jobId: string) => {
      try {
        const daemon = getDaemon();
        await daemon.removeJob(jobId);
        ui.success(`✓ Removed job: ${jobId}`);
      } catch (error: any) {
        ui.error(`Failed to remove job: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon enable
  command
    .command('enable <job-id>')
    .description('Enable a scheduled job')
    .action(async (jobId: string) => {
      try {
        const daemon = getDaemon();
        await daemon.updateJob(jobId, { enabled: true });
        ui.success(`✓ Enabled job: ${jobId}`);
      } catch (error: any) {
        ui.error(`Failed to enable job: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon disable
  command
    .command('disable <job-id>')
    .description('Disable a scheduled job')
    .action(async (jobId: string) => {
      try {
        const daemon = getDaemon();
        await daemon.updateJob(jobId, { enabled: false });
        ui.success(`✓ Disabled job: ${jobId}`);
      } catch (error: any) {
        ui.error(`Failed to disable job: ${error.message}`);
        process.exit(1);
      }
    });

  // daemon run
  command
    .command('run <job-id>')
    .description('Execute a job immediately')
    .action(async (jobId: string) => {
      try {
        const daemon = getDaemon();
        const job = daemon.getJob(jobId);

        if (!job) {
          ui.error(`Job not found: ${jobId}`);
          process.exit(1);
        }

        ui.section(`Executing job: ${job.name}`);
        await daemon.executeJob(jobId);
        ui.success('✓ Job completed');

      } catch (error: any) {
        ui.error(`Failed to execute job: ${error.message}`);
        process.exit(1);
      }
    });

  return command;
}
