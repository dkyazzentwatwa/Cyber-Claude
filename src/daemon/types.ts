/**
 * Daemon Types
 *
 * Types for scheduled scanning and daemon mode
 */

export interface ScanJob {
  id: string;
  name: string;
  type: 'webscan' | 'portscan' | 'log-analysis' | 'cve-check';
  target: string;
  schedule: string; // Cron expression
  options: Record<string, any>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: {
    success: boolean;
    duration: number;
    findingsCount: number;
    error?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DaemonConfig {
  jobs: ScanJob[];
  dataDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelayMs: number;
  notifications?: {
    email?: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      from: string;
      to: string[];
      onFailure: boolean;
      onSuccess: boolean;
      onNewFindings: boolean;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      onFailure: boolean;
      onSuccess: boolean;
      onNewFindings: boolean;
    };
  };
}

export interface JobExecution {
  jobId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration?: number;
}

export interface DaemonStatus {
  running: boolean;
  uptime: number;
  jobsExecuted: number;
  jobsFailed: number;
  currentJobs: JobExecution[];
  nextScheduledJob?: {
    jobId: string;
    jobName: string;
    scheduledTime: Date;
  };
}
