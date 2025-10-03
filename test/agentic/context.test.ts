/**
 * Context Manager Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextManager } from '../../src/agent/core/context.js';
import { Task, Plan, Step, StepResult, Reflection } from '../../src/agent/types.js';
import { v4 as uuidv4 } from 'uuid';

describe('ContextManager', () => {
  let task: Task;
  let plan: Plan;
  let contextManager: ContextManager;

  beforeEach(() => {
    task = {
      id: uuidv4(),
      description: 'Test task',
      goal: 'Test goal',
      createdAt: new Date(),
    };

    plan = {
      taskId: task.id,
      steps: [
        {
          id: uuidv4(),
          stepNumber: 1,
          description: 'Step 1',
          tool: 'httpx',
          parameters: { target: 'example.com' },
          successCriteria: ['Complete'],
          riskLevel: 'low',
        },
        {
          id: uuidv4(),
          stepNumber: 2,
          description: 'Step 2',
          tool: 'nuclei',
          parameters: { target: 'https://example.com' },
          successCriteria: ['Scan complete'],
          dependencies: [plan?.steps?.[0]?.id || ''],
          riskLevel: 'medium',
        },
      ],
      riskLevel: 'medium',
      createdAt: new Date(),
    };

    // Fix dependencies after plan is created
    plan.steps[1].dependencies = [plan.steps[0].id];

    contextManager = new ContextManager(task, plan);
  });

  describe('Initialization', () => {
    it('should initialize with task and plan', () => {
      const context = contextManager.getContext();

      expect(context.task).toEqual(task);
      expect(context.plan).toEqual(plan);
      expect(context.status).toBe('planning');
      expect(context.completedSteps).toHaveLength(0);
      expect(context.reflections).toHaveLength(0);
      expect(context.findings).toHaveLength(0);
      expect(context.errors).toHaveLength(0);
    });

    it('should have start time', () => {
      const context = contextManager.getContext();
      expect(context.startTime).toBeInstanceOf(Date);
      expect(context.endTime).toBeUndefined();
    });
  });

  describe('Step Management', () => {
    it('should set current step', () => {
      const step = plan.steps[0];
      contextManager.setCurrentStep(step);

      const context = contextManager.getContext();
      expect(context.currentStep).toEqual(step);
      expect(context.status).toBe('executing');
    });

    it('should add step result', () => {
      const step = plan.steps[0];
      const result: StepResult = {
        stepId: step.id,
        success: true,
        output: { message: 'Success' },
        duration: 1000,
        timestamp: new Date(),
        toolUsed: 'httpx',
        attemptNumber: 1,
      };

      contextManager.addStepResult(result);

      const context = contextManager.getContext();
      expect(context.completedSteps).toHaveLength(1);
      expect(context.completedSteps[0]).toEqual(result);
    });

    it('should track errors from failed steps', () => {
      const step = plan.steps[0];
      const result: StepResult = {
        stepId: step.id,
        success: false,
        output: null,
        error: 'Connection timeout',
        duration: 5000,
        timestamp: new Date(),
        toolUsed: 'httpx',
        attemptNumber: 1,
      };

      contextManager.addStepResult(result);

      const context = contextManager.getContext();
      expect(context.errors).toHaveLength(1);
      expect(context.errors[0].error).toBe('Connection timeout');
    });
  });

  describe('Reflection Management', () => {
    it('should add reflection', () => {
      const reflection: Reflection = {
        stepId: plan.steps[0].id,
        success: true,
        reasoning: 'Step completed successfully',
        successCriteriaMet: [true],
        shouldContinue: true,
        confidence: 0.95,
        taskComplete: false,
        nextAction: 'continue',
      };

      contextManager.addReflection(reflection);

      const context = contextManager.getContext();
      expect(context.reflections).toHaveLength(1);
      expect(context.reflections[0]).toEqual(reflection);
      expect(context.status).toBe('reflecting');
    });
  });

  describe('Findings Management', () => {
    it('should add security finding', () => {
      const finding = {
        id: uuidv4(),
        severity: 'high' as const,
        title: 'SQL Injection',
        description: 'Found SQL injection vulnerability',
        category: 'injection',
        timestamp: new Date(),
      };

      contextManager.addFinding(finding);

      const context = contextManager.getContext();
      expect(context.findings).toHaveLength(1);
      expect(context.findings[0]).toEqual(finding);
    });

    it('should add multiple findings', () => {
      const findings = [
        {
          id: uuidv4(),
          severity: 'high' as const,
          title: 'Finding 1',
          description: 'Description 1',
          category: 'test',
          timestamp: new Date(),
        },
        {
          id: uuidv4(),
          severity: 'medium' as const,
          title: 'Finding 2',
          description: 'Description 2',
          category: 'test',
          timestamp: new Date(),
        },
      ];

      contextManager.addFindings(findings);

      const context = contextManager.getContext();
      expect(context.findings).toHaveLength(2);
    });

    it('should get findings by severity', () => {
      const findings = [
        {
          id: uuidv4(),
          severity: 'critical' as const,
          title: 'Critical',
          description: 'Critical issue',
          category: 'test',
          timestamp: new Date(),
        },
        {
          id: uuidv4(),
          severity: 'high' as const,
          title: 'High',
          description: 'High issue',
          category: 'test',
          timestamp: new Date(),
        },
        {
          id: uuidv4(),
          severity: 'medium' as const,
          title: 'Medium',
          description: 'Medium issue',
          category: 'test',
          timestamp: new Date(),
        },
      ];

      contextManager.addFindings(findings);

      const bySeverity = contextManager.getFindingsBySeverity();
      expect(bySeverity.critical).toHaveLength(1);
      expect(bySeverity.high).toHaveLength(1);
      expect(bySeverity.medium).toHaveLength(1);
      expect(bySeverity.low).toHaveLength(0);
      expect(bySeverity.info).toHaveLength(0);
    });
  });

  describe('Plan Updates', () => {
    it('should update plan', () => {
      const newPlan: Plan = {
        ...plan,
        steps: [
          ...plan.steps,
          {
            id: uuidv4(),
            stepNumber: 3,
            description: 'New step',
            tool: 'sslscan',
            parameters: { host: 'example.com' },
            successCriteria: ['Complete'],
            riskLevel: 'low',
          },
        ],
      };

      contextManager.updatePlan(newPlan);

      const context = contextManager.getContext();
      expect(context.plan.steps).toHaveLength(3);
    });
  });

  describe('Next Step Selection', () => {
    it('should get next step with no dependencies', () => {
      const nextStep = contextManager.getNextStep();

      expect(nextStep).toBeDefined();
      expect(nextStep?.stepNumber).toBe(1);
      expect(nextStep?.dependencies).toBeUndefined();
    });

    it('should respect dependencies', () => {
      // Complete step 1
      const result1: StepResult = {
        stepId: plan.steps[0].id,
        success: true,
        output: {},
        duration: 1000,
        timestamp: new Date(),
        toolUsed: 'httpx',
        attemptNumber: 1,
      };
      contextManager.addStepResult(result1);

      // Now step 2 should be next
      const nextStep = contextManager.getNextStep();
      expect(nextStep).toBeDefined();
      expect(nextStep?.stepNumber).toBe(2);
    });

    it('should return null when all steps complete', () => {
      // Complete all steps
      plan.steps.forEach((step) => {
        const result: StepResult = {
          stepId: step.id,
          success: true,
          output: {},
          duration: 1000,
          timestamp: new Date(),
          toolUsed: step.tool,
          attemptNumber: 1,
        };
        contextManager.addStepResult(result);
      });

      const nextStep = contextManager.getNextStep();
      expect(nextStep).toBeNull();
    });
  });

  describe('Parallel Steps', () => {
    it('should identify parallel steps', () => {
      const parallelPlan: Plan = {
        taskId: task.id,
        steps: [
          {
            id: uuidv4(),
            stepNumber: 1,
            description: 'Parallel 1',
            tool: 'httpx',
            parameters: { target: 'example.com' },
            successCriteria: ['Complete'],
            canRunInParallel: true,
            riskLevel: 'low',
          },
          {
            id: uuidv4(),
            stepNumber: 2,
            description: 'Parallel 2',
            tool: 'sslscan',
            parameters: { host: 'example.com' },
            successCriteria: ['Complete'],
            canRunInParallel: true,
            riskLevel: 'low',
          },
        ],
        riskLevel: 'low',
        createdAt: new Date(),
      };

      const manager = new ContextManager(task, parallelPlan);
      const parallelSteps = manager.getParallelSteps();

      expect(parallelSteps).toHaveLength(2);
    });
  });

  describe('Completion Status', () => {
    it('should detect when task is complete', () => {
      expect(contextManager.isComplete()).toBe(false);

      // Complete all steps
      plan.steps.forEach((step) => {
        const result: StepResult = {
          stepId: step.id,
          success: true,
          output: {},
          duration: 1000,
          timestamp: new Date(),
          toolUsed: step.tool,
          attemptNumber: 1,
        };
        contextManager.addStepResult(result);
      });

      expect(contextManager.isComplete()).toBe(true);
    });

    it('should detect abort condition', () => {
      expect(contextManager.shouldAbort()).toBe(false);

      const abortReflection: Reflection = {
        stepId: plan.steps[0].id,
        success: false,
        reasoning: 'Critical failure',
        successCriteriaMet: [false],
        shouldContinue: false,
        confidence: 1.0,
        taskComplete: false,
        nextAction: 'abort',
      };

      contextManager.addReflection(abortReflection);

      expect(contextManager.shouldAbort()).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress percentage', () => {
      let progress = contextManager.getProgress();
      expect(progress.current).toBe(0);
      expect(progress.total).toBe(2);
      expect(progress.percentage).toBe(0);

      // Complete first step
      const result: StepResult = {
        stepId: plan.steps[0].id,
        success: true,
        output: {},
        duration: 1000,
        timestamp: new Date(),
        toolUsed: 'httpx',
        attemptNumber: 1,
      };
      contextManager.addStepResult(result);

      progress = contextManager.getProgress();
      expect(progress.current).toBe(1);
      expect(progress.percentage).toBe(50);
    });

    it('should generate summary', () => {
      const summary = contextManager.getSummary();

      expect(summary.taskDescription).toBe(task.description);
      expect(summary.status).toBe('planning');
      expect(summary.stepsCompleted).toBe(0);
      expect(summary.stepsTotal).toBe(2);
      expect(summary.findingsCount).toBe(0);
      expect(summary.errorsCount).toBe(0);
      expect(summary.duration).toBeGreaterThanOrEqual(0);
      expect(summary.successRate).toBe(0);
    });
  });

  describe('Status Management', () => {
    it('should complete task', () => {
      contextManager.complete();

      const context = contextManager.getContext();
      expect(context.status).toBe('completed');
      expect(context.endTime).toBeInstanceOf(Date);
    });

    it('should fail task', () => {
      contextManager.fail('Test failure');

      const context = contextManager.getContext();
      expect(context.status).toBe('failed');
      expect(context.endTime).toBeInstanceOf(Date);
    });

    it('should abort task', () => {
      contextManager.abort('User aborted');

      const context = contextManager.getContext();
      expect(context.status).toBe('aborted');
      expect(context.endTime).toBeInstanceOf(Date);
    });
  });

  describe('Event Emission', () => {
    it('should emit progress events', () => {
      return new Promise<void>((resolve) => {
        const listener = vi.fn((update) => {
          expect(update.type).toBeDefined();
          expect(update.message).toBeDefined();
          expect(update.progress).toBeDefined();
          resolve();
        });

        contextManager.on('progress', listener);
        contextManager.setCurrentStep(plan.steps[0]);
      });
    });
  });

  describe('Context Export/Import', () => {
    it('should export context as JSON', () => {
      const exported = contextManager.export();

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.task).toBeDefined();
      expect(parsed.plan).toBeDefined();
      expect(parsed.status).toBe('planning');
    });

    it('should import context from JSON', () => {
      // Add some data
      const finding = {
        id: uuidv4(),
        severity: 'high' as const,
        title: 'Test',
        description: 'Test finding',
        category: 'test',
        timestamp: new Date(),
      };
      contextManager.addFinding(finding);

      // Export
      const exported = contextManager.export();

      // Import
      const imported = ContextManager.import(exported);
      const importedContext = imported.getContext();

      expect(importedContext.task.id).toBe(task.id);
      expect(importedContext.findings).toHaveLength(1);
    });
  });
});
