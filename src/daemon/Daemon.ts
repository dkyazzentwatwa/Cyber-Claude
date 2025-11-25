/**
 * Cyber Claude Daemon
 *
 * Background daemon for scheduled security scanning
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { ScanJob, DaemonConfig, DaemonStatus, JobExecution } from './types.js';
import { Scheduler } from './Scheduler.js';
import { logger } from '../utils/logger.js';
import { WebScanner } from '../agent/tools/web/WebScanner.js';
import { LogAnalyzer } from '../agent/tools/log/LogAnalyzer.js';
import { VulnerabilityDB } from '../agent/tools/vuln/VulnerabilityDB.js';
import { v4 as uuidv4 } from 'uuid';

export class Daemon {
  private config: DaemonConfig;
  private scheduler: Scheduler;
  private startTime: Date;
  private jobsExecuted: number = 0;
  private jobsFailed: number = 0;
  private running: boolean = false;

  constructor(configPath?: string) {
    this.scheduler = new Scheduler();
    this.startTime = new Date();

    // Load config or create default
    this.config = {
      jobs: [],
      dataDir: path.join(process.cwd(), '.cyber-claude'),
      logLevel: 'info',
      maxConcurrentJobs: 3,
      retryAttempts: 3,
      retryDelayMs: 5000,
    };
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Daemon is already running');
    }

    logger.info('Starting Cyber Claude Daemon...');
    this.running = true;

    // Ensure data directory exists
    await fs.mkdir(this.config.dataDir, { recursive: true });

    // Load jobs from config
    await this.loadJobs();

    // Schedule all enabled jobs
    for (const job of this.config.jobs) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }

    logger.info(`Daemon started with ${this.config.jobs.length} jobs`);
  }

  /**
   * Stop the daemon
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    logger.info('Stopping Cyber Claude Daemon...');
    this.scheduler.stopAll();
    this.running = false;
    logger.info('Daemon stopped');
  }

  /**
   * Add a new job
   */
  async addJob(job: Omit<ScanJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScanJob> {
    const newJob: ScanJob = {
      ...job,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.config.jobs.push(newJob);
    await this.saveJobs();

    if (newJob.enabled && this.running) {
      this.scheduleJob(newJob);
    }

    logger.info(`Added job: ${newJob.name} (${newJob.id})`);
    return newJob;
  }

  /**
   * Remove a job
   */
  async removeJob(jobId: string): Promise<void> {
    const index = this.config.jobs.findIndex(j => j.id === jobId);
    if (index === -1) {
      throw new Error(`Job not found: ${jobId}`);
    }

    this.scheduler.unschedule(jobId);
    this.config.jobs.splice(index, 1);
    await this.saveJobs();

    logger.info(`Removed job: ${jobId}`);
  }

  /**
   * Update a job
   */
  async updateJob(jobId: string, updates: Partial<Omit<ScanJob, 'id' | 'createdAt'>>): Promise<ScanJob> {
    const job = this.config.jobs.find(j => j.id === jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Update job
    Object.assign(job, updates, { updatedAt: new Date() });
    await this.saveJobs();

    // Reschedule if schedule changed
    if (updates.schedule || updates.enabled !== undefined) {
      this.scheduler.unschedule(jobId);
      if (job.enabled && this.running) {
        this.scheduleJob(job);
      }
    }

    logger.info(`Updated job: ${job.name} (${jobId})`);
    return job;
  }

  /**
   * Get all jobs
   */
  getJobs(): ScanJob[] {
    return this.config.jobs;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ScanJob | undefined {
    return this.config.jobs.find(j => j.id === jobId);
  }

  /**
   * Execute a job immediately
   */
  async executeJob(jobId: string): Promise<void> {
    const job = this.config.jobs.find(j => j.id === jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await this.scheduler.executeNow(job, this.createJobExecutor());
  }

  /**
   * Get daemon status
   */
  getStatus(): DaemonStatus {
    const runningJobs = this.scheduler.getRunningExecutions();

    // Find next scheduled job
    let nextScheduledJob;
    let earliestTime = Infinity;

    for (const job of this.config.jobs) {
      if (job.enabled && job.nextRun) {
        const time = job.nextRun.getTime();
        if (time < earliestTime) {
          earliestTime = time;
          nextScheduledJob = {
            jobId: job.id,
            jobName: job.name,
            scheduledTime: job.nextRun,
          };
        }
      }
    }

    return {
      running: this.running,
      uptime: Date.now() - this.startTime.getTime(),
      jobsExecuted: this.jobsExecuted,
      jobsFailed: this.jobsFailed,
      currentJobs: runningJobs,
      nextScheduledJob,
    };
  }

  /**
   * Schedule a job
   */
  private scheduleJob(job: ScanJob): void {
    this.scheduler.schedule(job, this.createJobExecutor());
  }

  /**
   * Create job executor function
   */
  private createJobExecutor(): (job: ScanJob) => Promise<void> {
    return async (job: ScanJob) => {
      const startTime = Date.now();

      try {
        let result;
        let findingsCount = 0;

        switch (job.type) {
          case 'webscan':
            result = await this.executeWebScan(job);
            findingsCount = result.findings?.length || 0;
            break;

          case 'portscan':
            throw new Error('Port scanning not yet implemented');

          case 'log-analysis':
            result = await this.executeLogAnalysis(job);
            findingsCount = result.anomalies?.length || 0;
            break;

          case 'cve-check':
            result = await this.executeCVECheck(job);
            findingsCount = result.length || 0;
            break;

          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        // Save result
        await this.saveResult(job, result);

        // Update job stats
        job.lastResult = {
          success: true,
          duration: Date.now() - startTime,
          findingsCount,
        };
        job.updatedAt = new Date();
        await this.saveJobs();

        this.jobsExecuted++;

        // TODO: Send notifications if configured

      } catch (error: any) {
        job.lastResult = {
          success: false,
          duration: Date.now() - startTime,
          findingsCount: 0,
          error: error.message,
        };
        job.updatedAt = new Date();
        await this.saveJobs();

        this.jobsFailed++;

        logger.error(`Job execution failed: ${job.name} - ${error.message}`);
        throw error;
      }
    };
  }

  /**
   * Execute web scan
   */
  private async executeWebScan(job: ScanJob): Promise<any> {
    const scanner = new WebScanner();
    const options = {
      ...job.options,
      onProgress: (msg: string) => logger.debug(`[${job.name}] ${msg}`),
    };

    if (job.options.aggressive) {
      return await scanner.aggressiveScan(job.target, options);
    } else if (job.options.full) {
      return await scanner.fullScan(job.target, options);
    } else {
      return await scanner.quickScan(job.target, options);
    }
  }

  /**
   * Execute log analysis
   */
  private async executeLogAnalysis(job: ScanJob): Promise<any> {
    const analyzer = new LogAnalyzer();
    return await analyzer.analyze(job.target, job.options);
  }

  /**
   * Execute CVE check
   */
  private async executeCVECheck(job: ScanJob): Promise<any> {
    const vulnDb = new VulnerabilityDB();
    const results = await vulnDb.searchCVEs({
      keyword: job.target,
      resultsPerPage: job.options.limit || 10,
    });
    return results.vulnerabilities;
  }

  /**
   * Save scan result
   */
  private async saveResult(job: ScanJob, result: any): Promise<void> {
    const resultsDir = path.join(this.config.dataDir, 'results', job.id);
    await fs.mkdir(resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    await fs.writeFile(
      filepath,
      JSON.stringify(
        {
          jobId: job.id,
          jobName: job.name,
          timestamp: new Date(),
          result,
        },
        null,
        2
      ),
      'utf-8'
    );

    logger.info(`Saved result: ${filepath}`);
  }

  /**
   * Load jobs from config file
   */
  private async loadJobs(): Promise<void> {
    const configPath = path.join(this.config.dataDir, 'jobs.json');

    try {
      const data = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.config.jobs = parsed.map((job: any) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
        lastRun: job.lastRun ? new Date(job.lastRun) : undefined,
        nextRun: job.nextRun ? new Date(job.nextRun) : undefined,
      }));
      logger.info(`Loaded ${this.config.jobs.length} jobs from ${configPath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info('No existing jobs config found, starting with empty job list');
      } else {
        logger.error(`Failed to load jobs: ${error.message}`);
      }
    }
  }

  /**
   * Save jobs to config file
   */
  private async saveJobs(): Promise<void> {
    const configPath = path.join(this.config.dataDir, 'jobs.json');
    await fs.writeFile(configPath, JSON.stringify(this.config.jobs, null, 2), 'utf-8');
    logger.debug(`Saved ${this.config.jobs.length} jobs to ${configPath}`);
  }
}
