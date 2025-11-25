/**
 * Vulnerability Detection Engine
 *
 * Analyzes HTTP responses to detect vulnerabilities based on:
 * - Error messages
 * - Response content changes
 * - Response timing
 * - Status codes
 */

export interface DetectionResult {
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  evidence?: string;
  matchedPattern?: string;
}

export class VulnDetector {
  // SQL Error patterns for various databases
  private sqlErrorPatterns: RegExp[] = [
    // MySQL
    /SQL syntax.*?error/i,
    /mysql_fetch_array\(\)/i,
    /Warning.*?mysql_/i,
    /valid MySQL result/i,
    /MySqlClient\./i,
    /MySQL server version/i,
    /mysqli?_/i,
    // PostgreSQL
    /PostgreSQL.*?ERROR/i,
    /pg_query\(\)/i,
    /pg_exec\(\)/i,
    /ERROR:.*?syntax error/i,
    // Microsoft SQL Server
    /Microsoft SQL Server/i,
    /ODBC SQL Server Driver/i,
    /SQLServer JDBC Driver/i,
    /macromedia\.jdbc\.sqlserver/i,
    /Unclosed quotation mark/i,
    // Oracle
    /ORA-\d{5}/i,
    /Oracle.*?Driver/i,
    /oracle\.jdbc/i,
    // SQLite
    /SQLite.*?error/i,
    /sqlite3?_/i,
    /SQLITE_ERROR/i,
    // Generic
    /syntax error/i,
    /SQL query/i,
    /SQL command/i,
  ];

  // XSS detection (check if payload is reflected)
  private xssReflectionPatterns: RegExp[] = [
    /<script[^>]*>.*?<\/script>/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /onfocus\s*=/gi,
    /javascript:/gi,
  ];

  // Command injection success patterns
  private cmdSuccessPatterns: RegExp[] = [
    // Unix
    /uid=\d+\(.*?\)\s*gid=\d+/i, // id command output
    /root:.*?:\d+:\d+:/i, // /etc/passwd content
    /total\s+\d+/, // ls output
    /drwx/, // directory permissions
    // Windows
    /Directory of/i,
    /Volume in drive/i,
    /\<DIR\>/i,
    /Windows IP Configuration/i,
  ];

  // Path traversal success patterns
  private pathTraversalPatterns: RegExp[] = [
    /root:x?:0:0:/i, // Unix /etc/passwd
    /\[fonts\]/i, // Windows win.ini
    /\[extensions\]/i,
    /daemon:.*?:/i,
    /nobody:.*?:/i,
    /bin\/bash/i,
    /sbin\/nologin/i,
  ];

  // SSRF success patterns (cloud metadata)
  private ssrfMetadataPatterns: RegExp[] = [
    /ami-id/i,
    /instance-id/i,
    /AccessKeyId/i,
    /SecretAccessKey/i,
    /security-credentials/i,
    /computeMetadata/i,
    /project-id/i,
    /zone/i,
    /hostname/i,
  ];

  /**
   * Detect SQL injection based on error messages
   */
  detectSQLError(response: string): DetectionResult {
    for (const pattern of this.sqlErrorPatterns) {
      const match = response.match(pattern);
      if (match) {
        return {
          detected: true,
          confidence: 'high',
          evidence: match[0].substring(0, 200),
          matchedPattern: pattern.source,
        };
      }
    }
    return { detected: false, confidence: 'low' };
  }

  /**
   * Detect XSS by checking if payload is reflected in response
   */
  detectXSS(response: string, payload: string): DetectionResult {
    // Check if exact payload is reflected
    if (response.includes(payload)) {
      return {
        detected: true,
        confidence: 'high',
        evidence: `Payload reflected in response: ${payload.substring(0, 100)}`,
        matchedPattern: 'exact-match',
      };
    }

    // Check for common XSS patterns
    for (const pattern of this.xssReflectionPatterns) {
      const match = response.match(pattern);
      if (match) {
        return {
          detected: true,
          confidence: 'medium',
          evidence: match[0].substring(0, 100),
          matchedPattern: pattern.source,
        };
      }
    }

    return { detected: false, confidence: 'low' };
  }

  /**
   * Detect command injection by checking for command output
   */
  detectCommandInjection(response: string): DetectionResult {
    for (const pattern of this.cmdSuccessPatterns) {
      const match = response.match(pattern);
      if (match) {
        return {
          detected: true,
          confidence: 'high',
          evidence: match[0].substring(0, 200),
          matchedPattern: pattern.source,
        };
      }
    }
    return { detected: false, confidence: 'low' };
  }

  /**
   * Detect path traversal by checking for file content
   */
  detectPathTraversal(response: string): DetectionResult {
    for (const pattern of this.pathTraversalPatterns) {
      const match = response.match(pattern);
      if (match) {
        return {
          detected: true,
          confidence: 'high',
          evidence: match[0].substring(0, 200),
          matchedPattern: pattern.source,
        };
      }
    }
    return { detected: false, confidence: 'low' };
  }

  /**
   * Detect SSRF by checking for metadata service responses
   */
  detectSSRF(response: string): DetectionResult {
    for (const pattern of this.ssrfMetadataPatterns) {
      const match = response.match(pattern);
      if (match) {
        return {
          detected: true,
          confidence: 'high',
          evidence: `Cloud metadata detected: ${match[0]}`,
          matchedPattern: pattern.source,
        };
      }
    }
    return { detected: false, confidence: 'low' };
  }

  /**
   * Detect time-based blind injection by response time
   */
  detectTimeBasedInjection(responseTimeMs: number, expectedDelayMs: number): DetectionResult {
    const tolerance = 1000; // 1 second tolerance
    if (responseTimeMs >= expectedDelayMs - tolerance) {
      return {
        detected: true,
        confidence: responseTimeMs >= expectedDelayMs ? 'high' : 'medium',
        evidence: `Response time: ${responseTimeMs}ms (expected delay: ${expectedDelayMs}ms)`,
        matchedPattern: 'time-based',
      };
    }
    return { detected: false, confidence: 'low' };
  }

  /**
   * Detect boolean-based blind injection by comparing responses
   */
  detectBooleanBasedInjection(
    trueResponse: string,
    falseResponse: string,
    normalResponse: string
  ): DetectionResult {
    // If true condition matches normal and false doesn't, likely vulnerable
    const trueMatchesNormal = this.compareResponses(trueResponse, normalResponse);
    const falseMatchesNormal = this.compareResponses(falseResponse, normalResponse);

    if (trueMatchesNormal > 0.9 && falseMatchesNormal < 0.5) {
      return {
        detected: true,
        confidence: 'high',
        evidence: `True condition matches normal (${(trueMatchesNormal * 100).toFixed(1)}%), False differs (${(falseMatchesNormal * 100).toFixed(1)}%)`,
        matchedPattern: 'boolean-based',
      };
    }

    return { detected: false, confidence: 'low' };
  }

  /**
   * Compare two responses for similarity (0-1)
   */
  private compareResponses(response1: string, response2: string): number {
    if (response1 === response2) return 1;
    if (!response1 || !response2) return 0;

    // Simple length-based comparison
    const lengthDiff = Math.abs(response1.length - response2.length);
    const avgLength = (response1.length + response2.length) / 2;

    if (avgLength === 0) return 0;

    const lengthSimilarity = 1 - lengthDiff / avgLength;

    // Simple content comparison (can be improved with better algorithms)
    let matchingChars = 0;
    const minLength = Math.min(response1.length, response2.length);

    for (let i = 0; i < minLength; i++) {
      if (response1[i] === response2[i]) {
        matchingChars++;
      }
    }

    const contentSimilarity = matchingChars / minLength;

    return (lengthSimilarity + contentSimilarity) / 2;
  }

  /**
   * Extract evidence snippet from response
   */
  extractEvidence(response: string, pattern: RegExp, maxLength: number = 200): string {
    const match = response.match(pattern);
    if (match) {
      const start = Math.max(0, (match.index || 0) - 50);
      const end = Math.min(response.length, (match.index || 0) + match[0].length + 50);
      let evidence = response.substring(start, end);
      if (start > 0) evidence = '...' + evidence;
      if (end < response.length) evidence = evidence + '...';
      return evidence.substring(0, maxLength);
    }
    return '';
  }
}
