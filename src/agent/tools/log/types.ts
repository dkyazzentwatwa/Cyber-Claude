/**
 * Log Analysis Types
 * Support for multiple log formats and security analysis
 */

/**
 * Supported log formats
 */
export type LogFormat =
  | 'syslog'       // Linux/Unix system logs
  | 'apache'       // Apache/Nginx access logs
  | 'auth'         // Authentication logs (auth.log, secure)
  | 'json'         // JSON-formatted logs
  | 'windows'      // Windows Event Logs (exported)
  | 'firewall'     // Firewall logs (iptables, pf, etc.)
  | 'auto';        // Auto-detect format

/**
 * Log entry severity level
 */
export type LogSeverity =
  | 'emergency'
  | 'alert'
  | 'critical'
  | 'error'
  | 'warning'
  | 'notice'
  | 'info'
  | 'debug';

/**
 * Parsed log entry
 */
export interface LogEntry {
  lineNumber: number;
  timestamp?: Date;
  severity?: LogSeverity;
  source?: string;      // Hostname, IP, or service name
  process?: string;     // Process/service name
  pid?: number;         // Process ID
  message: string;
  rawLine: string;

  // Format-specific fields
  user?: string;        // Username (auth logs)
  ip?: string;          // IP address
  method?: string;      // HTTP method (web logs)
  url?: string;         // URL/path
  statusCode?: number;  // HTTP status
  eventId?: number;     // Event ID (Windows)
  action?: string;      // Firewall action (ACCEPT, DROP, REJECT)

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Anomaly/suspicious pattern detected in logs
 */
export interface LogAnomaly {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: AnomalyType;
  title: string;
  description: string;
  evidence: LogEntry[];
  count: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  recommendation?: string;
  mitreAttack?: string[]; // MITRE ATT&CK techniques
}

/**
 * Types of anomalies we detect
 */
export type AnomalyType =
  | 'failed_login'          // Multiple failed login attempts
  | 'privilege_escalation'  // Sudo/privilege escalation attempts
  | 'suspicious_command'    // Dangerous/suspicious commands
  | 'port_scan'             // Port scanning activity
  | 'brute_force'           // Brute force attack
  | 'unusual_time'          // Activity at unusual hours
  | 'rate_anomaly'          // Unusual rate of requests
  | 'error_spike'           // Spike in error messages
  | 'account_enumeration'   // Username enumeration attempts
  | 'sql_injection'         // SQL injection attempts
  | 'path_traversal'        // Directory traversal attempts
  | 'malware_indicator'     // Malware-related activity
  | 'data_exfiltration'     // Potential data exfiltration
  | 'unauthorized_access'   // Unauthorized access attempts
  | 'configuration_change'; // Critical configuration changes

/**
 * Log analysis statistics
 */
export interface LogStatistics {
  totalLines: number;
  parsedLines: number;
  parseErrors: number;
  timeRange?: {
    start: Date;
    end: Date;
  };

  // Severity distribution
  severityDistribution: {
    emergency: number;
    alert: number;
    critical: number;
    error: number;
    warning: number;
    notice: number;
    info: number;
    debug: number;
  };

  // Top sources
  topSources: Array<{ source: string; count: number }>;

  // Top processes
  topProcesses: Array<{ process: string; count: number }>;

  // Top users (if applicable)
  topUsers?: Array<{ user: string; count: number }>;

  // Top IPs (if applicable)
  topIPs?: Array<{ ip: string; count: number }>;

  // Error rate
  errorRate: number; // Percentage
}

/**
 * Complete log analysis result
 */
export interface LogAnalysisResult {
  filePath: string;
  format: LogFormat;
  statistics: LogStatistics;
  anomalies: LogAnomaly[];
  entries: LogEntry[]; // Sample entries or filtered entries

  // IOC extraction
  extractedIOCs?: {
    ips: string[];
    domains: string[];
    emails: string[];
    hashes: string[];
  };

  // Timeline
  timeline?: Array<{
    timestamp: Date;
    eventType: string;
    count: number;
  }>;

  analyzedAt: Date;
  duration: number; // milliseconds
}

/**
 * Log analysis options
 */
export interface LogAnalysisOptions {
  format?: LogFormat;
  maxLines?: number;         // Maximum lines to analyze
  timeFilter?: {
    start?: Date;
    end?: Date;
  };
  severityFilter?: LogSeverity[];
  searchPattern?: string;    // Regex pattern to filter
  includeIOCs?: boolean;     // Extract IOCs
  detectAnomalies?: boolean; // Run anomaly detection

  // Anomaly detection thresholds
  failedLoginThreshold?: number;      // Default: 5
  rateLimitThreshold?: number;        // Requests per minute
  errorSpikeThreshold?: number;       // Errors per minute
  suspiciousCommandPatterns?: string[]; // Additional patterns
}

/**
 * Analysis mode
 */
export type AnalysisMode = 'quick' | 'full' | 'threat-hunt';
