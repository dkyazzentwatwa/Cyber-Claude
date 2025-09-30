export type AgentMode = 'base' | 'redTeam' | 'blueTeam' | 'desktopSecurity';

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