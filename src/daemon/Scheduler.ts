/**
 * Job Scheduler
 *
 * Manages scheduled execution of security scans
 */

import { ScanJob, JobExecution } from './types.js';
import { CronJob } from 'cron';
import { logger } from '../utils/logger.js';

export class Scheduler {
  private jobs: Map<string, CronJob> = new Map();
  private executions: Map<string, JobExecution> = new Map();

  /**
   * Schedule a scan job
   */
  schedule(job: ScanJob, executor: (job: ScanJob) => Promise<void>): void {
    // Stop existing job if any
    this.unschedule(job.id);

    try {
      // Create cron job
      const cronJob = new CronJob(
        job.schedule,
        async () => {
          await this.executeJob(job, executor);
        },
        null, // onComplete
        false, // start
        'America/Los_Angeles' // timezone
      );

      // Store and start
      this.jobs.set(job.id, cronJob);
      cronJob.start();

      // Calculate next run
      job.nextRun = cronJob.nextDate().toJSDate();

      logger.info(`Scheduled job: ${job.name} (${job.id}) - Next run: ${job.nextRun}`);
    } catch (error: any) {
      logger.error(`Failed to schedule job ${job.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unschedule a job
   */
  unschedule(jobId: string): void {
    const cronJob = this.jobs.get(jobId);
    if (cronJob) {
      cronJob.stop();
      this.jobs.delete(jobId);
      logger.info(`Unscheduled job: ${jobId}`);
    }
  }

  /**
   * Execute a job immediately
   */
  async executeNow(job: ScanJob, executor: (job: ScanJob) => Promise<void>): Promise<void> {
    await this.executeJob(job, executor);
  }

  /**
   * Execute a job
   */
  private async executeJob(job: ScanJob, executor: (job: ScanJob) => Promise<void>): Promise<void> {
    const execution: JobExecution = {
      jobId: job.id,
      startTime: new Date(),
      status: 'running',
    };

    this.executions.set(job.id, execution);

    logger.info(`Executing job: ${job.name} (${job.id})`);

    try {
      await executor(job);

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      job.lastRun = execution.startTime;

      // Update next run
      const cronJob = this.jobs.get(job.id);
      if (cronJob) {
        job.nextRun = cronJob.nextDate().toJSDate();
      }

      logger.info(`Job completed: ${job.name} (${job.id}) - Duration: ${execution.duration}ms`);
    } catch (error: any) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = error.message;

      logger.error(`Job failed: ${job.name} (${job.id}) - ${error.message}`);
    } finally {
      // Clean up execution after a delay
      setTimeout(() => {
        this.executions.delete(job.id);
      }, 60000); // 1 minute
    }
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Get currently running executions
   */
  getRunningExecutions(): JobExecution[] {
    return Array.from(this.executions.values()).filter(e => e.status === 'running');
  }

  /**
   * Get next scheduled run for a job
   */
  getNextRun(jobId: string): Date | null {
    const cronJob = this.jobs.get(jobId);
    if (cronJob) {
      return cronJob.nextDate().toJSDate();
    }
    return null;
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    for (const [jobId, cronJob] of this.jobs.entries()) {
      cronJob.stop();
      logger.info(`Stopped job: ${jobId}`);
    }
    this.jobs.clear();
  }
}
