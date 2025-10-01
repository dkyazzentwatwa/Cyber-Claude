export type AgentMode = 'base' | 'redteam' | 'blueteam' | 'desktopsecurity' | 'webpentest' | 'osint';

export interface AgentConfig {
  mode: AgentMode;
  apiKey?: string;  // Anthropic API key (for Claude)
  googleApiKey?: string;  // Google API key (for Gemini)
  model?: string;
  maxTokens?: number;
  safeMode?: boolean;
}

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  remediation?: string;
  references?: string[];
  category: string;
  timestamp: Date;
}

export type VulnType =
  | 'sqli'
  | 'xss'
  | 'csrf'
  | 'ssrf'
  | 'idor'
  | 'path-traversal'
  | 'command-injection'
  | 'xxe'
  | 'auth-bypass'
  | 'session-fixation'
  | 'security-misconfiguration'
  | 'sensitive-data-exposure'
  | 'missing-security-headers'
  | 'information-disclosure';

export interface VulnerabilityFinding extends SecurityFinding {
  vulnerabilityType: VulnType;
  endpoint: string;
  method: string;
  payload?: string;
  evidence: {
    request?: string;
    response?: string;
    timing?: number;
    statusCode?: number;
  };
  cwe?: string; // CWE identifier
  owasp?: string; // OWASP category
}

export interface WebScanResult extends ScanResult {
  url: string;
  target: {
    url: string;
    hostname: string;
    protocol: string;
    port: number;
  };
  technology?: {
    server?: string;
    framework?: string;
    cms?: string;
    languages?: string[];
  };
  endpoints?: string[];
  forms?: any[];
  cookies?: any[];
  headers?: Record<string, string>;
  vulnerabilities?: VulnerabilityFinding[];
}

export interface ScanResult {
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scanTime: Date;
  duration: number; // milliseconds
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}