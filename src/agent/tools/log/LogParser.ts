/**
 * Log Parser
 * Parses multiple log formats into structured entries
 */

import { LogEntry, LogFormat, LogSeverity } from './types.js';
import { logger } from '../../../utils/logger.js';

export class LogParser {
  /**
   * Parse a log line based on detected or specified format
   */
  static parseLine(line: string, lineNumber: number, format: LogFormat = 'auto'): LogEntry | null {
    // Auto-detect format if needed
    if (format === 'auto') {
      format = this.detectFormat(line);
    }

    try {
      switch (format) {
        case 'syslog':
          return this.parseSyslog(line, lineNumber);
        case 'apache':
          return this.parseApache(line, lineNumber);
        case 'auth':
          return this.parseAuth(line, lineNumber);
        case 'json':
          return this.parseJSON(line, lineNumber);
        case 'windows':
          return this.parseWindows(line, lineNumber);
        case 'firewall':
          return this.parseFirewall(line, lineNumber);
        default:
          return this.parseGeneric(line, lineNumber);
      }
    } catch (error) {
      logger.debug(`Failed to parse line ${lineNumber}: ${error}`);
      return this.parseGeneric(line, lineNumber);
    }
  }

  /**
   * Detect log format from a line
   */
  static detectFormat(line: string): LogFormat {
    // JSON log
    if (line.trim().startsWith('{')) {
      return 'json';
    }

    // Apache/Nginx combined log format
    if (/^\d+\.\d+\.\d+\.\d+ - - \[/.test(line)) {
      return 'apache';
    }

    // Syslog format (RFC 3164)
    if (/^[A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+/.test(line)) {
      return 'syslog';
    }

    // Auth log (similar to syslog but with auth keywords)
    if (/sudo|authentication|login|session|pam/i.test(line)) {
      return 'auth';
    }

    // Firewall log (iptables, pf, etc.)
    if (/\b(ACCEPT|DROP|REJECT|DENY|ALLOW)\b/i.test(line) &&
        /SRC=|DST=|PROTO=|DPT=|SPT=/i.test(line)) {
      return 'firewall';
    }

    // Windows Event Log (exported format)
    if (/EventID|SourceName|Type:|ComputerName/.test(line)) {
      return 'windows';
    }

    return 'syslog'; // Default fallback
  }

  /**
   * Parse syslog format (RFC 3164)
   * Example: Dec 10 12:34:56 hostname service[1234]: message
   */
  static parseSyslog(line: string, lineNumber: number): LogEntry {
    const entry: LogEntry = {
      lineNumber,
      rawLine: line,
      message: line,
    };

    // RFC 3164 pattern
    const pattern = /^([A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+([^[\s]+)(?:\[(\d+)\])?\s*:\s*(.+)$/;
    const match = line.match(pattern);

    if (match) {
      // Parse timestamp (add current year)
      const year = new Date().getFullYear();
      entry.timestamp = new Date(`${match[1]} ${year}`);
      entry.source = match[2];
      entry.process = match[3];
      if (match[4]) entry.pid = parseInt(match[4]);
      entry.message = match[5];

      // Extract severity from message keywords
      entry.severity = this.extractSeverity(match[5]);
    }

    return entry;
  }

  /**
   * Parse Apache/Nginx combined log format
   * Example: 192.168.1.1 - - [10/Dec/2024:12:34:56 +0000] "GET /path HTTP/1.1" 200 1234 "referer" "user-agent"
   */
  static parseApache(line: string, lineNumber: number): LogEntry {
    const entry: LogEntry = {
      lineNumber,
      rawLine: line,
      message: line,
      severity: 'info',
    };

    const pattern = /^(\S+)\s+-\s+(\S+)\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+([^"]+)"\s+(\d+)\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"/;
    const match = line.match(pattern);

    if (match) {
      entry.ip = match[1];
      entry.user = match[2] !== '-' ? match[2] : undefined;

      // Parse timestamp
      const dateStr = match[3];
      entry.timestamp = this.parseApacheDate(dateStr);

      entry.method = match[4];
      entry.url = match[5];
      entry.statusCode = parseInt(match[7]);

      // Determine severity from status code
      if (entry.statusCode >= 500) {
        entry.severity = 'error';
      } else if (entry.statusCode >= 400) {
        entry.severity = 'warning';
      }

      entry.message = `${match[4]} ${match[5]} - ${match[7]}`;
    }

    return entry;
  }

  /**
   * Parse authentication log
   * Similar to syslog but with auth-specific parsing
   */
  static parseAuth(line: string, lineNumber: number): LogEntry {
    const entry = this.parseSyslog(line, lineNumber);

    // Extract user from auth messages
    const userMatch = line.match(/user[= ](\S+)/i) || line.match(/for (\S+) from/);
    if (userMatch) {
      entry.user = userMatch[1];
    }

    // Extract IP
    const ipMatch = line.match(/from (\d+\.\d+\.\d+\.\d+)/);
    if (ipMatch) {
      entry.ip = ipMatch[1];
    }

    // Detect failed auth attempts
    if (/failed|failure|invalid|denied/i.test(line)) {
      entry.severity = 'warning';
    }

    // Detect successful auth
    if (/accepted|success|opened/i.test(line)) {
      entry.severity = 'notice';
    }

    return entry;
  }

  /**
   * Parse JSON log format
   */
  static parseJSON(line: string, lineNumber: number): LogEntry {
    try {
      const json = JSON.parse(line);

      const entry: LogEntry = {
        lineNumber,
        rawLine: line,
        message: json.message || json.msg || line,
      };

      // Common JSON log fields
      if (json.timestamp || json.time || json['@timestamp']) {
        entry.timestamp = new Date(json.timestamp || json.time || json['@timestamp']);
      }

      if (json.level || json.severity) {
        entry.severity = this.normalizeSeverity(json.level || json.severity);
      }

      if (json.hostname || json.host) {
        entry.source = json.hostname || json.host;
      }

      if (json.process || json.service) {
        entry.process = json.process || json.service;
      }

      if (json.pid) {
        entry.pid = json.pid;
      }

      if (json.user || json.username) {
        entry.user = json.user || json.username;
      }

      if (json.ip || json.remote_addr) {
        entry.ip = json.ip || json.remote_addr;
      }

      // Store entire JSON as metadata
      entry.metadata = json;

      return entry;
    } catch (error) {
      return {
        lineNumber,
        rawLine: line,
        message: line,
        severity: 'error',
      };
    }
  }

  /**
   * Parse Windows Event Log (exported text format)
   */
  static parseWindows(line: string, lineNumber: number): LogEntry {
    const entry: LogEntry = {
      lineNumber,
      rawLine: line,
      message: line,
      severity: 'info',
    };

    // Parse EventID
    const eventIdMatch = line.match(/EventID[:\s]+(\d+)/i);
    if (eventIdMatch) {
      entry.eventId = parseInt(eventIdMatch[1]);
    }

    // Parse Type/Level
    const typeMatch = line.match(/Type[:\s]+(\w+)/i);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase();
      if (type.includes('error')) entry.severity = 'error';
      else if (type.includes('warning')) entry.severity = 'warning';
      else if (type.includes('information')) entry.severity = 'info';
    }

    // Parse Source
    const sourceMatch = line.match(/SourceName[:\s]+(.+?)(?:\s|$)/);
    if (sourceMatch) {
      entry.source = sourceMatch[1].trim();
    }

    // Parse Computer
    const computerMatch = line.match(/ComputerName[:\s]+(.+?)(?:\s|$)/);
    if (computerMatch) {
      entry.source = computerMatch[1].trim();
    }

    // Parse User
    const userMatch = line.match(/User[:\s]+(.+?)(?:\s|$)/);
    if (userMatch) {
      entry.user = userMatch[1].trim();
    }

    return entry;
  }

  /**
   * Parse firewall log (iptables, pf, etc.)
   */
  static parseFirewall(line: string, lineNumber: number): LogEntry {
    const entry: LogEntry = {
      lineNumber,
      rawLine: line,
      message: line,
      severity: 'notice',
    };

    // Extract action
    const actionMatch = line.match(/\b(ACCEPT|DROP|REJECT|DENY|ALLOW)\b/i);
    if (actionMatch) {
      entry.action = actionMatch[1].toUpperCase();

      // DROP/REJECT are warnings
      if (entry.action === 'DROP' || entry.action === 'REJECT' || entry.action === 'DENY') {
        entry.severity = 'warning';
      }
    }

    // Extract IPs (iptables format)
    const srcMatch = line.match(/SRC=(\d+\.\d+\.\d+\.\d+)/);
    if (srcMatch) {
      entry.ip = srcMatch[1];
    }

    const dstMatch = line.match(/DST=(\d+\.\d+\.\d+\.\d+)/);
    if (dstMatch) {
      entry.metadata = { ...entry.metadata, dstIp: dstMatch[1] };
    }

    // Extract ports
    const dptMatch = line.match(/DPT=(\d+)/);
    if (dptMatch) {
      entry.metadata = { ...entry.metadata, dstPort: parseInt(dptMatch[1]) };
    }

    const sptMatch = line.match(/SPT=(\d+)/);
    if (sptMatch) {
      entry.metadata = { ...entry.metadata, srcPort: parseInt(sptMatch[1]) };
    }

    // Extract protocol
    const protoMatch = line.match(/PROTO=(\w+)/);
    if (protoMatch) {
      entry.metadata = { ...entry.metadata, protocol: protoMatch[1] };
    }

    return entry;
  }

  /**
   * Generic parser for unknown formats
   */
  static parseGeneric(line: string, lineNumber: number): LogEntry {
    const entry: LogEntry = {
      lineNumber,
      rawLine: line,
      message: line,
    };

    // Try to extract timestamp
    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
    if (timestampMatch) {
      entry.timestamp = new Date(timestampMatch[1]);
    }

    // Extract severity from keywords
    entry.severity = this.extractSeverity(line);

    return entry;
  }

  /**
   * Extract severity from message content
   */
  static extractSeverity(message: string): LogSeverity {
    const lower = message.toLowerCase();

    if (/\b(emergency|emerg|panic)\b/.test(lower)) return 'emergency';
    if (/\b(alert)\b/.test(lower)) return 'alert';
    if (/\b(critical|crit|fatal)\b/.test(lower)) return 'critical';
    if (/\b(error|err|failed|failure)\b/.test(lower)) return 'error';
    if (/\b(warning|warn)\b/.test(lower)) return 'warning';
    if (/\b(notice)\b/.test(lower)) return 'notice';
    if (/\b(debug)\b/.test(lower)) return 'debug';

    return 'info';
  }

  /**
   * Normalize severity string to LogSeverity
   */
  static normalizeSeverity(severity: string): LogSeverity {
    const lower = severity.toLowerCase();

    if (lower.includes('emerg') || lower === '0') return 'emergency';
    if (lower.includes('alert') || lower === '1') return 'alert';
    if (lower.includes('crit') || lower === '2') return 'critical';
    if (lower.includes('err') || lower === '3' || lower === 'error') return 'error';
    if (lower.includes('warn') || lower === '4' || lower === 'warning') return 'warning';
    if (lower.includes('notice') || lower === '5') return 'notice';
    if (lower.includes('info') || lower === '6') return 'info';
    if (lower.includes('debug') || lower === '7') return 'debug';

    return 'info';
  }

  /**
   * Parse Apache date format
   */
  static parseApacheDate(dateStr: string): Date {
    // Format: 10/Dec/2024:12:34:56 +0000
    const parts = dateStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)\s+([\+\-]\d+)/);
    if (!parts) return new Date();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.indexOf(parts[2]);

    return new Date(
      parseInt(parts[3]),  // year
      month,               // month (0-indexed)
      parseInt(parts[1]),  // day
      parseInt(parts[4]),  // hour
      parseInt(parts[5]),  // minute
      parseInt(parts[6])   // second
    );
  }
}
