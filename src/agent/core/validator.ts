/**
 * Safety Validator - Pre-execution validation and risk assessment
 * Ensures operations are safe and authorized
 */

import { Task, Plan, Step } from '../types.js';
import { getTool } from '../tools/registry.js';
import { logger } from '../../utils/logger.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number; // 0-100
  requiresApproval: boolean;
}

/**
 * Safety rules configuration
 */
export interface SafetyConfig {
  allowHighRiskOps?: boolean;
  maxSteps?: number;
  maxDuration?: number;
  allowedTools?: string[]; // Whitelist
  blockedTools?: string[]; // Blacklist
  allowedTargets?: string[]; // Regex patterns
  blockedTargets?: string[]; // Regex patterns
  requireApprovalAboveRisk?: number; // 0-100
}

/**
 * SafetyValidator class
 */
export class SafetyValidator {
  private config: SafetyConfig;

  constructor(config: SafetyConfig = {}) {
    this.config = {
      allowHighRiskOps: false,
      maxSteps: 50,
      maxDuration: 3600000, // 1 hour
      requireApprovalAboveRisk: 50,
      ...config,
    };
  }

  /**
   * Validate a task before planning
   */
  validateTask(task: Task): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Check task description
    if (!task.description || task.description.trim().length === 0) {
      errors.push('Task description is empty');
    }

    if (task.description.length > 1000) {
      warnings.push('Task description is very long, may be unclear');
    }

    // Check constraints
    if (task.maxSteps && task.maxSteps > (this.config.maxSteps || 50)) {
      errors.push(`Task maxSteps (${task.maxSteps}) exceeds limit (${this.config.maxSteps})`);
    }

    if (task.maxDuration && task.maxDuration > (this.config.maxDuration || 3600000)) {
      errors.push(`Task maxDuration (${task.maxDuration}ms) exceeds limit (${this.config.maxDuration}ms)`);
    }

    // Scan for dangerous keywords in task
    const dangerousKeywords = [
      'delete',
      'destroy',
      'wipe',
      'format',
      'ransomware',
      'ddos',
      'dos attack',
      'exploit kit',
      'malware',
    ];

    const lowerDesc = task.description.toLowerCase();
    dangerousKeywords.forEach((keyword) => {
      if (lowerDesc.includes(keyword)) {
        warnings.push(`Task contains potentially dangerous keyword: "${keyword}"`);
        riskScore += 20;
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(riskScore, 100),
      requiresApproval: riskScore >= (this.config.requireApprovalAboveRisk || 50),
    };
  }

  /**
   * Validate a plan before execution
   */
  validatePlan(plan: Plan): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Check step count
    if (plan.steps.length === 0) {
      errors.push('Plan has no steps');
    }

    if (plan.steps.length > (this.config.maxSteps || 50)) {
      errors.push(`Plan has too many steps: ${plan.steps.length} > ${this.config.maxSteps}`);
    }

    // Validate each step
    plan.steps.forEach((step, idx) => {
      const stepValidation = this.validateStep(step);

      if (!stepValidation.valid) {
        errors.push(`Step ${idx + 1} (${step.tool}): ${stepValidation.errors.join(', ')}`);
      }

      stepValidation.warnings.forEach((w) => {
        warnings.push(`Step ${idx + 1} (${step.tool}): ${w}`);
      });

      riskScore = Math.max(riskScore, stepValidation.riskScore);
    });

    // Check for circular dependencies
    try {
      this.checkCircularDependencies(plan.steps);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    // Check estimated duration
    if (plan.estimatedDuration && plan.estimatedDuration > (this.config.maxDuration || 3600000)) {
      warnings.push(
        `Plan estimated duration (${plan.estimatedDuration}ms) exceeds recommended limit`
      );
    }

    // Adjust risk based on plan-level risk
    const planRiskMap = { low: 20, medium: 50, high: 80 };
    riskScore = Math.max(riskScore, planRiskMap[plan.riskLevel]);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(riskScore, 100),
      requiresApproval: riskScore >= (this.config.requireApprovalAboveRisk || 50),
    };
  }

  /**
   * Validate a single step
   */
  validateStep(step: Step): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Check tool exists
    const toolDef = getTool(step.tool);
    if (!toolDef) {
      errors.push(`Tool '${step.tool}' not found in registry`);
      return {
        valid: false,
        errors,
        warnings,
        riskScore: 100,
        requiresApproval: true,
      };
    }

    // Check tool whitelist/blacklist
    if (this.config.allowedTools && !this.config.allowedTools.includes(step.tool)) {
      errors.push(`Tool '${step.tool}' not in allowed tools list`);
    }

    if (this.config.blockedTools && this.config.blockedTools.includes(step.tool)) {
      errors.push(`Tool '${step.tool}' is blocked`);
    }

    // Validate parameters
    const paramValidation = this.validateParameters(step.parameters, toolDef.parameters);
    errors.push(...paramValidation.errors);
    warnings.push(...paramValidation.warnings);

    // Check target restrictions (if target/url parameter exists)
    const target = step.parameters.target || step.parameters.url || step.parameters.host;
    if (target && typeof target === 'string') {
      const targetValidation = this.validateTarget(target);
      errors.push(...targetValidation.errors);
      warnings.push(...targetValidation.warnings);
    }

    // Risk assessment
    const riskMap = { low: 20, medium: 50, high: 80 };
    riskScore = riskMap[step.riskLevel];

    if (step.requiresApproval || toolDef.requiresApproval) {
      riskScore = Math.max(riskScore, 60);
    }

    // High-risk operations
    if (!this.config.allowHighRiskOps && step.riskLevel === 'high') {
      errors.push(`High-risk operation not allowed: ${step.tool}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      riskScore,
      requiresApproval: riskScore >= (this.config.requireApprovalAboveRisk || 50),
    };
  }

  /**
   * Validate step parameters against tool definition
   */
  private validateParameters(
    params: Record<string, any>,
    expectedParams: Array<{
      name: string;
      type: string;
      required: boolean;
      default?: any;
    }>
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required parameters
    expectedParams.forEach((expected) => {
      if (expected.required && !(expected.name in params)) {
        errors.push(`Missing required parameter: ${expected.name}`);
      }
    });

    // Check parameter types (basic validation)
    Object.keys(params).forEach((paramName) => {
      const expected = expectedParams.find((p) => p.name === paramName);
      if (!expected) {
        warnings.push(`Unknown parameter: ${paramName}`);
        return;
      }

      const value = params[paramName];
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      // Basic type checking
      if (expected.type === 'string' && actualType !== 'string') {
        errors.push(`Parameter ${paramName} should be string, got ${actualType}`);
      } else if (expected.type === 'number' && actualType !== 'number') {
        errors.push(`Parameter ${paramName} should be number, got ${actualType}`);
      } else if (expected.type === 'boolean' && actualType !== 'boolean') {
        errors.push(`Parameter ${paramName} should be boolean, got ${actualType}`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate target (domain, IP, URL)
   */
  private validateTarget(target: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check against allowed targets
    if (this.config.allowedTargets) {
      const isAllowed = this.config.allowedTargets.some((pattern) => {
        const regex = new RegExp(pattern);
        return regex.test(target);
      });

      if (!isAllowed) {
        errors.push(`Target '${target}' not in allowed targets list`);
      }
    }

    // Check against blocked targets
    if (this.config.blockedTargets) {
      const isBlocked = this.config.blockedTargets.some((pattern) => {
        const regex = new RegExp(pattern);
        return regex.test(target);
      });

      if (isBlocked) {
        errors.push(`Target '${target}' is blocked`);
      }
    }

    // Warn about sensitive targets
    const sensitivePatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /192\.168\./,
      /10\./,
      /172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /\.gov$/,
      /\.mil$/,
      /\.edu$/,
    ];

    sensitivePatterns.forEach((pattern) => {
      if (pattern.test(target)) {
        warnings.push(`Target '${target}' may be sensitive or internal`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(steps: Step[]): void {
    const stepIds = steps.map((s) => s.id);

    for (const step of steps) {
      if (!step.dependencies || step.dependencies.length === 0) continue;

      const visited = new Set<string>();
      const queue = [...step.dependencies];

      while (queue.length > 0) {
        const dep = queue.shift()!;

        if (visited.has(dep)) continue;
        visited.add(dep);

        if (dep === step.id) {
          throw new Error(`Circular dependency detected for step ${step.stepNumber}`);
        }

        const depStep = steps.find((s) => s.id === dep);
        if (depStep && depStep.dependencies) {
          queue.push(...depStep.dependencies);
        }
      }
    }
  }

  /**
   * Generate safety report
   */
  generateReport(validation: ValidationResult): string {
    const lines: string[] = [];

    lines.push('=== SAFETY VALIDATION REPORT ===\n');
    lines.push(`Status: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
    lines.push(`Risk Score: ${validation.riskScore}/100`);
    lines.push(`Requires Approval: ${validation.requiresApproval ? 'YES' : 'NO'}\n`);

    if (validation.errors.length > 0) {
      lines.push('ERRORS:');
      validation.errors.forEach((err, idx) => {
        lines.push(`  ${idx + 1}. ${err}`);
      });
      lines.push('');
    }

    if (validation.warnings.length > 0) {
      lines.push('WARNINGS:');
      validation.warnings.forEach((warn, idx) => {
        lines.push(`  ${idx + 1}. ${warn}`);
      });
      lines.push('');
    }

    if (validation.valid && validation.warnings.length === 0) {
      lines.push('✅ No issues found. Safe to proceed.');
    }

    return lines.join('\n');
  }
}
