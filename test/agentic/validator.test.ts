/**
 * Safety Validator Tests
 */

import { describe, it, expect } from 'vitest';
import { SafetyValidator } from '../../src/agent/core/validator.js';
import { Task, Plan, Step } from '../../src/agent/types.js';
import { v4 as uuidv4 } from 'uuid';

describe('SafetyValidator', () => {
  describe('Task Validation', () => {
    it('should validate a safe task', () => {
      const validator = new SafetyValidator();
      const task: Task = {
        id: uuidv4(),
        description: 'Scan example.com for vulnerabilities',
        goal: 'Find security issues',
        createdAt: new Date(),
      };

      const result = validator.validateTask(task);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.riskScore).toBeLessThan(50);
    });

    it('should reject empty task description', () => {
      const validator = new SafetyValidator();
      const task: Task = {
        id: uuidv4(),
        description: '',
        goal: 'Empty task',
        createdAt: new Date(),
      };

      const result = validator.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task description is empty');
    });

    it('should flag dangerous keywords', () => {
      const validator = new SafetyValidator();
      const task: Task = {
        id: uuidv4(),
        description: 'Delete all files and wipe the system',
        goal: 'Dangerous task',
        createdAt: new Date(),
      };

      const result = validator.validateTask(task);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should enforce maxSteps limit', () => {
      const validator = new SafetyValidator({ maxSteps: 10 });
      const task: Task = {
        id: uuidv4(),
        description: 'Normal task',
        goal: 'Test',
        maxSteps: 20,
        createdAt: new Date(),
      };

      const result = validator.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('maxSteps'))).toBe(true);
    });

    it('should enforce maxDuration limit', () => {
      const validator = new SafetyValidator({ maxDuration: 60000 });
      const task: Task = {
        id: uuidv4(),
        description: 'Normal task',
        goal: 'Test',
        maxDuration: 120000,
        createdAt: new Date(),
      };

      const result = validator.validateTask(task);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('maxDuration'))).toBe(true);
    });
  });

  describe('Step Validation', () => {
    it('should validate a safe step', () => {
      const validator = new SafetyValidator();
      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Scan for SSL/TLS issues',
        tool: 'sslscan',
        parameters: { target: 'example.com' },
        successCriteria: ['SSL analysis complete'],
        riskLevel: 'low',
      };

      const result = validator.validateStep(step);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.riskScore).toBeLessThan(50);
    });

    it('should reject unknown tool', () => {
      const validator = new SafetyValidator();
      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Use fake tool',
        tool: 'nonexistent_tool_xyz',
        parameters: {},
        successCriteria: ['Success'],
        riskLevel: 'low',
      };

      const result = validator.validateStep(step);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
    });

    it('should enforce tool whitelist', () => {
      const validator = new SafetyValidator({
        allowedTools: ['nmap', 'nuclei'],
      });

      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Scan with sslscan',
        tool: 'sslscan',
        parameters: { host: 'example.com' },
        successCriteria: ['Scan complete'],
        riskLevel: 'low',
      };

      const result = validator.validateStep(step);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not in allowed tools'))).toBe(true);
    });

    it('should enforce tool blacklist', () => {
      const validator = new SafetyValidator({
        blockedTools: ['sqlmap'],
      });

      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'SQL injection test',
        tool: 'sqlmap',
        parameters: { url: 'https://example.com/page?id=1' },
        successCriteria: ['Scan complete'],
        riskLevel: 'high',
      };

      const result = validator.validateStep(step);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('blocked'))).toBe(true);
    });

    it('should block high-risk operations when configured', () => {
      const validator = new SafetyValidator({
        allowHighRiskOps: false,
      });

      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Aggressive scan',
        tool: 'sqlmap',
        parameters: { url: 'https://example.com/page?id=1' },
        successCriteria: ['Complete'],
        riskLevel: 'high',
      };

      const result = validator.validateStep(step);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('High-risk operation not allowed'))).toBe(true);
    });

    it('should validate required parameters', () => {
      const validator = new SafetyValidator();
      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Nmap scan without target',
        tool: 'nmap',
        parameters: {}, // Missing required 'target' parameter
        successCriteria: ['Complete'],
        riskLevel: 'medium',
      };

      const result = validator.validateStep(step);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing required parameter'))).toBe(true);
    });

    it('should warn about sensitive targets', () => {
      const validator = new SafetyValidator();
      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Scan localhost',
        tool: 'nmap',
        parameters: { target: 'localhost' },
        successCriteria: ['Complete'],
        riskLevel: 'low',
      };

      const result = validator.validateStep(step);

      expect(result.warnings.some((w) => w.includes('sensitive or internal'))).toBe(true);
    });
  });

  describe('Plan Validation', () => {
    it('should validate a safe plan', () => {
      const validator = new SafetyValidator();
      const plan: Plan = {
        taskId: uuidv4(),
        steps: [
          {
            id: uuidv4(),
            stepNumber: 1,
            description: 'Scan SSL/TLS configuration',
            tool: 'sslscan',
            parameters: { target: 'example.com' },
            successCriteria: ['SSL configuration retrieved'],
            riskLevel: 'low',
          },
          {
            id: uuidv4(),
            stepNumber: 2,
            description: 'Screenshot website',
            tool: 'gowitness',
            parameters: { url: 'https://example.com' },
            successCriteria: ['Screenshot captured'],
            riskLevel: 'low',
          },
        ],
        riskLevel: 'low',
        createdAt: new Date(),
      };

      const result = validator.validatePlan(plan);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty plan', () => {
      const validator = new SafetyValidator();
      const plan: Plan = {
        taskId: uuidv4(),
        steps: [],
        riskLevel: 'low',
        createdAt: new Date(),
      };

      const result = validator.validatePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plan has no steps');
    });

    it('should enforce step count limit', () => {
      const validator = new SafetyValidator({ maxSteps: 5 });

      const steps: Step[] = [];
      for (let i = 0; i < 10; i++) {
        steps.push({
          id: uuidv4(),
          stepNumber: i + 1,
          description: `Step ${i + 1}`,
          tool: 'httpx',
          parameters: { target: 'example.com' },
          successCriteria: ['Complete'],
          riskLevel: 'low',
        });
      }

      const plan: Plan = {
        taskId: uuidv4(),
        steps,
        riskLevel: 'low',
        createdAt: new Date(),
      };

      const result = validator.validatePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('too many steps'))).toBe(true);
    });

    it('should detect circular dependencies', () => {
      const validator = new SafetyValidator();

      const step1Id = uuidv4();
      const step2Id = uuidv4();

      const plan: Plan = {
        taskId: uuidv4(),
        steps: [
          {
            id: step1Id,
            stepNumber: 1,
            description: 'Step 1',
            tool: 'httpx',
            parameters: { target: 'example.com' },
            successCriteria: ['Complete'],
            dependencies: [step2Id], // Depends on step 2
            riskLevel: 'low',
          },
          {
            id: step2Id,
            stepNumber: 2,
            description: 'Step 2',
            tool: 'httpx',
            parameters: { target: 'example.com' },
            successCriteria: ['Complete'],
            dependencies: [step1Id], // Depends on step 1 - circular!
            riskLevel: 'low',
          },
        ],
        riskLevel: 'low',
        createdAt: new Date(),
      };

      const result = validator.validatePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Circular dependency'))).toBe(true);
    });

    it('should calculate risk score from steps', () => {
      const validator = new SafetyValidator();

      const plan: Plan = {
        taskId: uuidv4(),
        steps: [
          {
            id: uuidv4(),
            stepNumber: 1,
            description: 'Low risk step',
            tool: 'httpx',
            parameters: { target: 'example.com' },
            successCriteria: ['Complete'],
            riskLevel: 'low',
          },
          {
            id: uuidv4(),
            stepNumber: 2,
            description: 'High risk step',
            tool: 'sqlmap',
            parameters: { url: 'https://example.com/page?id=1' },
            successCriteria: ['Complete'],
            riskLevel: 'high',
            requiresApproval: true,
          },
        ],
        riskLevel: 'high',
        createdAt: new Date(),
      };

      const result = validator.validatePlan(plan);

      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('Target Validation', () => {
    it('should enforce allowed targets', () => {
      const validator = new SafetyValidator({
        allowedTargets: ['^example\\.com$', '^test\\..*'],
      });

      const step1: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Allowed target',
        tool: 'nmap',
        parameters: { target: 'example.com' },
        successCriteria: ['Complete'],
        riskLevel: 'low',
      };

      const step2: Step = {
        id: uuidv4(),
        stepNumber: 2,
        description: 'Blocked target',
        tool: 'nmap',
        parameters: { target: 'blocked.com' },
        successCriteria: ['Complete'],
        riskLevel: 'low',
      };

      const result1 = validator.validateStep(step1);
      const result2 = validator.validateStep(step2);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.includes('not in allowed targets'))).toBe(true);
    });

    it('should enforce blocked targets', () => {
      const validator = new SafetyValidator({
        blockedTargets: ['\\.gov$', '\\.mil$', 'localhost'],
      });

      const step: Step = {
        id: uuidv4(),
        stepNumber: 1,
        description: 'Scan government site',
        tool: 'nmap',
        parameters: { target: 'example.gov' },
        successCriteria: ['Complete'],
        riskLevel: 'low',
      };

      const result = validator.validateStep(step);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('blocked'))).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate readable report', () => {
      const validator = new SafetyValidator();
      const validation = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
        riskScore: 75,
        requiresApproval: true,
      };

      const report = validator.generateReport(validation);

      expect(report).toContain('INVALID');
      expect(report).toContain('75/100');
      expect(report).toContain('ERRORS:');
      expect(report).toContain('WARNINGS:');
      expect(report).toContain('Error 1');
      expect(report).toContain('Warning 1');
    });

    it('should show success message for valid result', () => {
      const validator = new SafetyValidator();
      const validation = {
        valid: true,
        errors: [],
        warnings: [],
        riskScore: 20,
        requiresApproval: false,
      };

      const report = validator.generateReport(validation);

      expect(report).toContain('VALID');
      expect(report).toContain('No issues found');
    });
  });
});
