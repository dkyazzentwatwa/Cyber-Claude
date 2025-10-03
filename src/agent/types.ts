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

// ============================================
// AGENTIC TYPES - For Autonomous Execution
// ============================================

/**
 * User's high-level task description
 */
export interface Task {
  id: string;
  description: string;
  goal: string;
  constraints?: string[];
  maxSteps?: number;
  maxDuration?: number; // milliseconds
  requiresApproval?: boolean;
  createdAt: Date;
}

/**
 * AI-generated execution plan
 */
export interface Plan {
  taskId: string;
  steps: Step[];
  estimatedDuration?: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
}

/**
 * Single step in execution plan
 */
export interface Step {
  id: string;
  stepNumber: number;
  description: string;
  tool: string;
  parameters: Record<string, any>;
  successCriteria: string[];
  dependencies?: string[]; // IDs of steps that must complete first
  canRunInParallel?: boolean;
  estimatedDuration?: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
}

/**
 * Result of executing a single step
 */
export interface StepResult {
  stepId: string;
  success: boolean;
  output: any;
  error?: string;
  duration: number;
  timestamp: Date;
  toolUsed: string;
  attemptNumber: number;
}

/**
 * AI's reflection on step result
 */
export interface Reflection {
  stepId: string;
  success: boolean;
  reasoning: string;
  successCriteriaMet: boolean[];
  shouldContinue: boolean;
  adjustments?: {
    modifyPlan?: boolean;
    retryStep?: boolean;
    skipToStep?: string;
    additionalSteps?: Array<{
      stepNumber: number;
      description: string;
      tool: string;
      parameters: Record<string, any>;
      successCriteria: string[];
      dependencies?: string[];
      canRunInParallel?: boolean;
      estimatedDuration?: number;
      riskLevel: 'low' | 'medium' | 'high';
      requiresApproval?: boolean;
    }>;
  };
  confidence: number; // 0-1
  taskComplete: boolean;
  nextAction: 'continue' | 'retry' | 'adjust' | 'complete' | 'abort';
}

/**
 * Context maintained across agentic execution
 */
export interface AgenticContext {
  task: Task;
  plan: Plan;
  completedSteps: StepResult[];
  currentStep?: Step;
  reflections: Reflection[];
  findings: SecurityFinding[];
  errors: Array<{ step: string; error: string; timestamp: Date }>;
  startTime: Date;
  endTime?: Date;
  status: 'planning' | 'executing' | 'reflecting' | 'completed' | 'failed' | 'aborted';
}

/**
 * Tool definition in registry
 */
export interface ToolDefinition {
  name: string;
  description: string;
  category: 'scanning' | 'reconnaissance' | 'analysis' | 'reporting' | 'utility';
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }[];
  capabilities: string[];
  requiresApproval: boolean;
  estimatedDuration: number; // milliseconds
  riskLevel: 'low' | 'medium' | 'high';
  examples: {
    description: string;
    parameters: Record<string, any>;
  }[];
}

/**
 * Progress update during agentic execution
 */
export interface ProgressUpdate {
  type: 'plan' | 'step_start' | 'step_complete' | 'reflection' | 'complete' | 'error';
  message: string;
  step?: Step;
  result?: StepResult;
  reflection?: Reflection;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  timestamp: Date;
}