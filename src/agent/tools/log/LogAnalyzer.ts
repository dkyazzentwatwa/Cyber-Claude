/**
 * Log Analyzer
 * Performs security analysis and anomaly detection on log entries
 */

import { promises as fs } from 'fs';
import { LogParser } from './LogParser.js';
import {
  LogEntry,
  LogFormat,
  LogAnalysisResult,
  LogAnalysisOptions,
  LogAnomaly,
  LogStatistics,
  AnomalyType,
} from './types.js';
import { logger } from '../../../utils/logger.js';
import { IOCExtractor } from '../../../utils/ioc.js';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export class LogAnalyzer {
  /**
   * Analyze a log file
   */
  async analyze(
    filePath: string,
    options: LogAnalysisOptions = {}
  ): Promise<LogAnalysisResult> {
    const startTime = Date.now();

    logger.info(`Analyzing log file: ${filePath}`);

    const entries = await this.parseLogFile(filePath, options);
    const statistics = this.calculateStatistics(entries);
    const anomalies = options.detectAnomalies !== false
      ? await this.detectAnomalies(entries, options)
      : [];

    let extractedIOCs;
    if (options.includeIOCs) {
      extractedIOCs = this.extractIOCs(entries);
    }

    const result: LogAnalysisResult = {
      filePath,
      format: options.format || 'auto',
      statistics,
      anomalies,
      entries: entries.slice(0, 100), // Return first 100 entries for display
      extractedIOCs,
      analyzedAt: new Date(),
      duration: Date.now() - startTime,
    };

    logger.info(`Analysis complete: ${entries.length} entries, ${anomalies.length} anomalies`);

    return result;
  }

  /**
   * Parse log file and return entries
   */
  private async parseLogFile(
    filePath: string,
    options: LogAnalysisOptions
  ): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];
    let lineNumber = 0;
    const maxLines = options.maxLines || 100000; // Default 100k lines

    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      lineNumber++;

      if (lineNumber > maxLines) break;
      if (!line.trim()) continue;

      const entry = LogParser.parseLine(line, lineNumber, options.format);
      if (!entry) continue;

      // Apply filters
      if (options.timeFilter) {
        if (entry.timestamp) {
          if (options.timeFilter.start && entry.timestamp < options.timeFilter.start) continue;
          if (options.timeFilter.end && entry.timestamp > options.timeFilter.end) continue;
        }
      }

      if (options.severityFilter && entry.severity) {
        if (!options.severityFilter.includes(entry.severity)) continue;
      }

      if (options.searchPattern) {
        const regex = new RegExp(options.searchPattern, 'i');
        if (!regex.test(entry.message)) continue;
      }

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Calculate statistics from log entries
   */
  private calculateStatistics(entries: LogEntry[]): LogStatistics {
    const stats: LogStatistics = {
      totalLines: entries.length,
      parsedLines: entries.length,
      parseErrors: 0,
      severityDistribution: {
        emergency: 0,
        alert: 0,
        critical: 0,
        error: 0,
        warning: 0,
        notice: 0,
        info: 0,
        debug: 0,
      },
      topSources: [],
      topProcesses: [],
      errorRate: 0,
    };

    const sourceCounts = new Map<string, number>();
    const processCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const ipCounts = new Map<string, number>();

    let timestamps: Date[] = [];
    let errorCount = 0;

    for (const entry of entries) {
      // Severity distribution
      if (entry.severity) {
        stats.severityDistribution[entry.severity]++;
        if (['emergency', 'alert', 'critical', 'error'].includes(entry.severity)) {
          errorCount++;
        }
      }

      // Count sources
      if (entry.source) {
        sourceCounts.set(entry.source, (sourceCounts.get(entry.source) || 0) + 1);
      }

      // Count processes
      if (entry.process) {
        processCounts.set(entry.process, (processCounts.get(entry.process) || 0) + 1);
      }

      // Count users
      if (entry.user) {
        userCounts.set(entry.user, (userCounts.get(entry.user) || 0) + 1);
      }

      // Count IPs
      if (entry.ip) {
        ipCounts.set(entry.ip, (ipCounts.get(entry.ip) || 0) + 1);
      }

      // Collect timestamps
      if (entry.timestamp) {
        timestamps.push(entry.timestamp);
      }
    }

    // Calculate time range
    if (timestamps.length > 0) {
      timestamps.sort((a, b) => a.getTime() - b.getTime());
      stats.timeRange = {
        start: timestamps[0],
        end: timestamps[timestamps.length - 1],
      };
    }

    // Calculate error rate
    stats.errorRate = entries.length > 0 ? (errorCount / entries.length) * 100 : 0;

    // Top sources
    stats.topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top processes
    stats.topProcesses = Array.from(processCounts.entries())
      .map(([process, count]) => ({ process, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top users
    if (userCounts.size > 0) {
      stats.topUsers = Array.from(userCounts.entries())
        .map(([user, count]) => ({ user, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    // Top IPs
    if (ipCounts.size > 0) {
      stats.topIPs = Array.from(ipCounts.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    return stats;
  }

  /**
   * Detect anomalies and suspicious patterns
   */
  private async detectAnomalies(
    entries: LogEntry[],
    options: LogAnalysisOptions
  ): Promise<LogAnomaly[]> {
    const anomalies: LogAnomaly[] = [];

    // Failed login detection
    anomalies.push(...this.detectFailedLogins(entries, options));

    // Privilege escalation
    anomalies.push(...this.detectPrivilegeEscalation(entries));

    // Suspicious commands
    anomalies.push(...this.detectSuspiciousCommands(entries));

    // Brute force attacks
    anomalies.push(...this.detectBruteForce(entries));

    // SQL injection attempts
    anomalies.push(...this.detectSQLInjection(entries));

    // Path traversal attempts
    anomalies.push(...this.detectPathTraversal(entries));

    // Error spikes
    anomalies.push(...this.detectErrorSpikes(entries, options));

    // Port scanning
    anomalies.push(...this.detectPortScanning(entries));

    return anomalies;
  }

  /**
   * Detect failed login attempts
   */
  private detectFailedLogins(entries: LogEntry[], options: LogAnalysisOptions): LogAnomaly[] {
    const threshold = options.failedLoginThreshold || 5;
    const failedByIP = new Map<string, LogEntry[]>();
    const failedByUser = new Map<string, LogEntry[]>();

    for (const entry of entries) {
      const isFailed = /failed|failure|invalid|denied|authentication failure/i.test(entry.message);

      if (isFailed) {
        if (entry.ip) {
          const list = failedByIP.get(entry.ip) || [];
          list.push(entry);
          failedByIP.set(entry.ip, list);
        }
        if (entry.user) {
          const list = failedByUser.get(entry.user) || [];
          list.push(entry);
          failedByUser.set(entry.user, list);
        }
      }
    }

    const anomalies: LogAnomaly[] = [];

    // Check IP-based failures
    for (const [ip, failedEntries] of failedByIP.entries()) {
      if (failedEntries.length >= threshold) {
        anomalies.push({
          id: uuidv4(),
          severity: failedEntries.length > 20 ? 'critical' : 'high',
          type: 'failed_login',
          title: `Multiple Failed Login Attempts from ${ip}`,
          description: `${failedEntries.length} failed login attempts detected from IP ${ip}`,
          evidence: failedEntries.slice(0, 5),
          count: failedEntries.length,
          recommendation: `Investigate IP ${ip}. Consider blocking if malicious.`,
          mitreAttack: ['T1110.001', 'T1110.003'], // Brute Force: Password Guessing/Spraying
        });
      }
    }

    // Check user-based failures
    for (const [user, failedEntries] of failedByUser.entries()) {
      if (failedEntries.length >= threshold) {
        anomalies.push({
          id: uuidv4(),
          severity: 'medium',
          type: 'failed_login',
          title: `Multiple Failed Logins for User ${user}`,
          description: `${failedEntries.length} failed login attempts for user ${user}`,
          evidence: failedEntries.slice(0, 5),
          count: failedEntries.length,
          recommendation: `Check if user ${user} is experiencing credential issues or under attack.`,
          mitreAttack: ['T1110'],
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect privilege escalation attempts
   */
  private detectPrivilegeEscalation(entries: LogEntry[]): LogAnomaly[] {
    const anomalies: LogAnomaly[] = [];
    const sudoAttempts: LogEntry[] = [];

    for (const entry of entries) {
      if (/sudo|su\s|privilege|elevated|administrator/i.test(entry.message)) {
        sudoAttempts.push(entry);
      }
    }

    if (sudoAttempts.length > 10) {
      anomalies.push({
        id: uuidv4(),
        severity: 'medium',
        type: 'privilege_escalation',
        title: 'Elevated Privilege Usage Detected',
        description: `${sudoAttempts.length} privilege escalation attempts or sudo commands executed`,
        evidence: sudoAttempts.slice(0, 5),
        count: sudoAttempts.length,
        recommendation: 'Review sudo/privilege usage for unauthorized access attempts.',
        mitreAttack: ['T1548.003'], // Abuse Elevation Control Mechanism: Sudo
      });
    }

    return anomalies;
  }

  /**
   * Detect suspicious commands
   */
  private detectSuspiciousCommands(entries: LogEntry[]): LogAnomaly[] {
    const suspiciousPatterns = [
      /nc\s+-[el]/i,           // netcat
      /\/bin\/sh/i,            // shell spawning
      /\/bin\/bash/i,
      /wget|curl.*http/i,      // downloading
      /chmod\s+777/i,          // dangerous permissions
      /rm\s+-rf\s+\//i,        // dangerous deletion
      /iptables.*flush/i,      // firewall manipulation
      /passwd.*root/i,         // password changes
      /useradd|adduser/i,      // user creation
      /crontab/i,              // scheduled tasks
    ];

    const suspicious: LogEntry[] = [];

    for (const entry of entries) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(entry.message)) {
          suspicious.push(entry);
          break;
        }
      }
    }

    if (suspicious.length === 0) return [];

    return [{
      id: uuidv4(),
      severity: 'high',
      type: 'suspicious_command',
      title: 'Suspicious Command Execution Detected',
      description: `${suspicious.length} potentially dangerous commands executed`,
      evidence: suspicious.slice(0, 10),
      count: suspicious.length,
      recommendation: 'Investigate command execution. May indicate compromise or malicious activity.',
      mitreAttack: ['T1059'], // Command and Scripting Interpreter
    }];
  }

  /**
   * Detect brute force attacks
   */
  private detectBruteForce(entries: LogEntry[]): LogAnomaly[] {
    const attemptsByIP = new Map<string, { entries: LogEntry[]; timestamps: number[] }>();

    for (const entry of entries) {
      if (!/failed|invalid|denied/i.test(entry.message)) continue;
      if (!entry.ip || !entry.timestamp) continue;

      const data = attemptsByIP.get(entry.ip) || { entries: [], timestamps: [] };
      data.entries.push(entry);
      data.timestamps.push(entry.timestamp.getTime());
      attemptsByIP.set(entry.ip, data);
    }

    const anomalies: LogAnomaly[] = [];

    for (const [ip, data] of attemptsByIP.entries()) {
      if (data.entries.length < 10) continue;

      // Check if attempts are within a short time window (5 minutes)
      const sorted = [...data.timestamps].sort();
      const timeWindow = 5 * 60 * 1000; // 5 minutes

      for (let i = 0; i < sorted.length - 9; i++) {
        if (sorted[i + 9] - sorted[i] < timeWindow) {
          anomalies.push({
            id: uuidv4(),
            severity: 'critical',
            type: 'brute_force',
            title: `Brute Force Attack from ${ip}`,
            description: `Rapid-fire authentication attempts detected from ${ip}`,
            evidence: data.entries.slice(0, 5),
            count: data.entries.length,
            recommendation: `Block IP ${ip} immediately. This is likely an automated attack.`,
            mitreAttack: ['T1110.001'],
          });
          break;
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect SQL injection attempts
   */
  private detectSQLInjection(entries: LogEntry[]): LogAnomaly[] {
    const sqlPatterns = [
      /union.*select/i,
      /select.*from.*where/i,
      /'.*or.*'.*=/i,
      /--.*$/,
      /\/\*.*\*\//,
      /\bexec\b.*\(/i,
    ];

    const sqlAttempts: LogEntry[] = [];

    for (const entry of entries) {
      if (!entry.url && !entry.message.includes('?')) continue;

      for (const pattern of sqlPatterns) {
        if (pattern.test(entry.message) || (entry.url && pattern.test(entry.url))) {
          sqlAttempts.push(entry);
          break;
        }
      }
    }

    if (sqlAttempts.length === 0) return [];

    return [{
      id: uuidv4(),
      severity: 'high',
      type: 'sql_injection',
      title: 'SQL Injection Attempts Detected',
      description: `${sqlAttempts.length} potential SQL injection attempts in logs`,
      evidence: sqlAttempts.slice(0, 5),
      count: sqlAttempts.length,
      recommendation: 'Review application input validation. Ensure parameterized queries are used.',
      mitreAttack: ['T1190'], // Exploit Public-Facing Application
    }];
  }

  /**
   * Detect path traversal attempts
   */
  private detectPathTraversal(entries: LogEntry[]): LogAnomaly[] {
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e\//i,
      /%252e%252e/i,
    ];

    const traversal: LogEntry[] = [];

    for (const entry of entries) {
      for (const pattern of traversalPatterns) {
        if (pattern.test(entry.message) || (entry.url && pattern.test(entry.url))) {
          traversal.push(entry);
          break;
        }
      }
    }

    if (traversal.length === 0) return [];

    return [{
      id: uuidv4(),
      severity: 'high',
      type: 'path_traversal',
      title: 'Path Traversal Attempts Detected',
      description: `${traversal.length} directory traversal attempts in logs`,
      evidence: traversal.slice(0, 5),
      count: traversal.length,
      recommendation: 'Review file access controls and input validation.',
      mitreAttack: ['T1083'], // File and Directory Discovery
    }];
  }

  /**
   * Detect error spikes
   */
  private detectErrorSpikes(entries: LogEntry[], options: LogAnalysisOptions): LogAnomaly[] {
    const errorThreshold = options.errorSpikeThreshold || 50; // errors per minute
    const errorsByMinute = new Map<number, LogEntry[]>();

    for (const entry of entries) {
      if (!entry.timestamp) continue;
      if (!['error', 'critical', 'alert', 'emergency'].includes(entry.severity || '')) continue;

      const minute = Math.floor(entry.timestamp.getTime() / 60000);
      const list = errorsByMinute.get(minute) || [];
      list.push(entry);
      errorsByMinute.set(minute, list);
    }

    const anomalies: LogAnomaly[] = [];

    for (const [minute, errors] of errorsByMinute.entries()) {
      if (errors.length >= errorThreshold) {
        const timestamp = new Date(minute * 60000);
        anomalies.push({
          id: uuidv4(),
          severity: 'medium',
          type: 'error_spike',
          title: 'Error Spike Detected',
          description: `${errors.length} errors occurred within 1 minute at ${timestamp.toLocaleString()}`,
          evidence: errors.slice(0, 5),
          count: errors.length,
          timeRange: {
            start: new Date(minute * 60000),
            end: new Date((minute + 1) * 60000),
          },
          recommendation: 'Investigate application or system issues causing high error rate.',
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect port scanning activity
   */
  private detectPortScanning(entries: LogEntry[]): LogAnomaly[] {
    const connectionsByIP = new Map<string, Set<number>>();

    for (const entry of entries) {
      if (!entry.ip || !entry.metadata?.dstPort) continue;

      const ports = connectionsByIP.get(entry.ip) || new Set<number>();
      ports.add(entry.metadata.dstPort);
      connectionsByIP.set(entry.ip, ports);
    }

    const anomalies: LogAnomaly[] = [];

    for (const [ip, ports] of connectionsByIP.entries()) {
      if (ports.size >= 20) { // Accessed 20+ different ports
        anomalies.push({
          id: uuidv4(),
          severity: 'high',
          type: 'port_scan',
          title: `Port Scanning from ${ip}`,
          description: `IP ${ip} attempted to connect to ${ports.size} different ports`,
          evidence: [],
          count: ports.size,
          recommendation: `Block IP ${ip}. This is characteristic of port scanning/reconnaissance.`,
          mitreAttack: ['T1046'], // Network Service Discovery
        });
      }
    }

    return anomalies;
  }

  /**
   * Extract IOCs from log entries
   */
  private extractIOCs(entries: LogEntry[]): {
    ips: string[];
    domains: string[];
    emails: string[];
    hashes: string[];
  } {
    const extractor = new IOCExtractor();

    for (const entry of entries) {
      extractor.extractFromText(entry.message, 'Log Entry');
      if (entry.url) {
        extractor.extractFromText(entry.url, 'URL');
      }
    }

    const report = extractor.getReport();

    return {
      ips: report.ips.map(ioc => ioc.value),
      domains: report.domains.map(ioc => ioc.value),
      emails: report.emails.map(ioc => ioc.value),
      hashes: report.hashes.map(ioc => ioc.value),
    };
  }
}
