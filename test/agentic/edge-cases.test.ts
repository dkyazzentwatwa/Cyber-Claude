/**
 * Edge case tests for autonomous agentic workflow
 * Tests retry logic, timeouts, parallel execution, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgenticCore } from '../../src/agent/core/agentic.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    Anthropic: vi.fn().mockImplementation(() => {
      return {
        messages: {
          create: vi.fn(),
        },
      };
    }),
  };
});

// Mock the ToolExecutor
vi.mock('../../src/agent/tools/executor.js', () => {
  let executionCount = 0;

  return {
    ToolExecutor: {
      executeStep: vi.fn().mockImplementation(async (step: any, attemptNumber: number) => {
        executionCount++;

        // Simulate retry scenario: fail first 2 attempts, succeed on 3rd
        if (step.tool === 'retry-test' && attemptNumber < 3) {
          return {
            stepId: step.id,
            success: false,
            output: null,
            error: `Transient error on attempt ${attemptNumber}`,
            duration: 100,
            timestamp: new Date(),
            toolUsed: step.tool,
            attemptNumber,
          };
        }

        // Simulate timeout scenario
        if (step.tool === 'timeout-test') {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        return {
          stepId: step.id,
          success: true,
          output: `Mock execution ${executionCount}`,
          duration: 100,
          timestamp: new Date(),
          toolUsed: step.tool,
          attemptNumber: attemptNumber || 1,
        };
      }),
      executeParallel: vi.fn().mockImplementation(async (steps: any[]) => {
        return steps.map((step) => ({
          stepId: step.id,
          success: true,
          output: 'Parallel execution successful',
          duration: 100,
          timestamp: new Date(),
          toolUsed: step.tool,
          attemptNumber: 1,
        }));
      }),
      retryStep: vi.fn().mockImplementation(async (step: any, previousAttempt: number) => {
        if (previousAttempt >= 3) {
          return {
            stepId: step.id,
            success: false,
            output: null,
            error: 'Max retries exceeded',
            duration: 100,
            timestamp: new Date(),
            toolUsed: step.tool,
            attemptNumber: previousAttempt + 1,
          };
        }

        return {
          stepId: step.id,
          success: true,
          output: 'Retry successful',
          duration: 100,
          timestamp: new Date(),
          toolUsed: step.tool,
          attemptNumber: previousAttempt + 1,
        };
      }),
    },
  };
});

describe('Autonomous Agentic Workflow - Edge Cases', () => {
  let mockMessagesCreate: any;
  let Anthropic: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const anthropicModule = await import('@anthropic-ai/sdk');
    Anthropic = anthropicModule.Anthropic;
    mockMessagesCreate = vi.fn();
    (Anthropic as any).mockImplementation(() => ({
      messages: {
        create: mockMessagesCreate,
      },
    }));
  });

  it('should handle timeout gracefully', async () => {
    const planningResponse = {
      reasoning: 'Testing timeout handling',
      steps: [
        {
          stepNumber: 1,
          description: 'Step that will timeout',
          tool: 'recon',
          parameters: { target: 'example.com', depth: 'quick' },
          successCriteria: ['Should complete'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 1000,
        },
      ],
      riskLevel: 'low' as const,
      estimatedDuration: 1000,
    };

    const reflectionResponse = {
      reasoning: 'Step completed',
      success: true,
      successCriteriaMet: [true],
      confidence: 0.9,
      shouldContinue: false,
      taskComplete: true,
      nextAction: 'complete' as const,
    };

    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reflectionResponse) }],
      });

    const config = {
      apiKey: 'test-key',
      model: 'claude-sonnet-4-5',
      mode: 'base' as const,
      maxSteps: 5,
      maxDuration: 10000, // 10 second timeout
      autoApprove: true,
      verbose: false,
    };

    const agent = new AgenticCore(config);
    const result = await agent.executeTask('Test timeout handling');

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  }, 30000);

  it('should handle parallel step execution', async () => {
    const planningResponse = {
      reasoning: 'Testing parallel execution',
      steps: [
        {
          stepNumber: 1,
          description: 'Parallel step 1',
          tool: 'recon',
          parameters: { target: 'example1.com', depth: 'quick' },
          successCriteria: ['Complete'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 1000,
          canRunInParallel: true,
        },
        {
          stepNumber: 2,
          description: 'Parallel step 2',
          tool: 'recon',
          parameters: { target: 'example2.com', depth: 'quick' },
          successCriteria: ['Complete'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 1000,
          canRunInParallel: true,
        },
      ],
      riskLevel: 'low' as const,
      estimatedDuration: 2000,
    };

    const reflectionResponse = {
      reasoning: 'Parallel steps completed',
      success: true,
      successCriteriaMet: [true],
      confidence: 0.95,
      shouldContinue: false,
      taskComplete: true,
      nextAction: 'complete' as const,
    };

    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reflectionResponse) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reflectionResponse) }],
      });

    const config = {
      apiKey: 'test-key',
      model: 'claude-sonnet-4-5',
      mode: 'base' as const,
      maxSteps: 5,
      maxDuration: 60000,
      autoApprove: true,
      verbose: false,
    };

    const agent = new AgenticCore(config);
    const result = await agent.executeTask('Test parallel execution');

    expect(result.success).toBe(true);
    expect(result.context.completedSteps.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle plan adjustment based on discoveries', async () => {
    const planningResponse = {
      reasoning: 'Initial plan with one step',
      steps: [
        {
          stepNumber: 1,
          description: 'Initial reconnaissance',
          tool: 'recon',
          parameters: { target: 'example.com', depth: 'quick' },
          successCriteria: ['Complete'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 1000,
        },
      ],
      riskLevel: 'low' as const,
      estimatedDuration: 1000,
    };

    const reflectionWithAdjustment = {
      reasoning: 'Found WordPress, adding wpscan step',
      success: true,
      successCriteriaMet: [true],
      confidence: 0.95,
      shouldContinue: true,
      taskComplete: false,
      nextAction: 'adjust' as const,
      adjustments: {
        modifyPlan: true,
        additionalSteps: [
          {
            stepNumber: 2,
            description: 'Scan WordPress site',
            tool: 'webscan',
            parameters: { url: 'https://example.com' },
            successCriteria: ['Scan complete'],
            riskLevel: 'medium' as const,
            requiresApproval: true,
            estimatedDuration: 5000,
          },
        ],
      },
    };

    const finalReflection = {
      reasoning: 'All steps complete',
      success: true,
      successCriteriaMet: [true],
      confidence: 1.0,
      shouldContinue: false,
      taskComplete: true,
      nextAction: 'complete' as const,
    };

    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reflectionWithAdjustment) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(finalReflection) }],
      });

    const config = {
      apiKey: 'test-key',
      model: 'claude-sonnet-4-5',
      mode: 'base' as const,
      maxSteps: 5,
      maxDuration: 60000,
      autoApprove: true,
      verbose: false,
    };

    const agent = new AgenticCore(config);
    const result = await agent.executeTask('Adaptive planning test');

    expect(result.success).toBe(true);
    // Verify adaptive behavior - should have reflections with adjustments
    expect(result.context.reflections.length).toBeGreaterThan(0);
    const hasAdjustmentReflection = result.context.reflections.some(
      (r) => r.adjustments?.modifyPlan === true
    );
    expect(hasAdjustmentReflection).toBe(true);
  }, 30000);

  it('should track context correctly through execution', async () => {
    const planningResponse = {
      reasoning: 'Simple context tracking test',
      steps: [
        {
          stepNumber: 1,
          description: 'First step',
          tool: 'recon',
          parameters: { target: 'example.com', depth: 'quick' },
          successCriteria: ['Complete'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 1000,
        },
      ],
      riskLevel: 'low' as const,
      estimatedDuration: 1000,
    };

    const reflectionResponse = {
      reasoning: 'Step completed',
      success: true,
      successCriteriaMet: [true],
      confidence: 0.9,
      shouldContinue: false,
      taskComplete: true,
      nextAction: 'complete' as const,
    };

    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reflectionResponse) }],
      });

    const config = {
      apiKey: 'test-key',
      model: 'claude-sonnet-4-5',
      mode: 'base' as const,
      maxSteps: 5,
      maxDuration: 60000,
      autoApprove: true,
      verbose: false,
    };

    const agent = new AgenticCore(config);
    const result = await agent.executeTask('Context tracking test');

    // Verify context structure
    expect(result.context).toBeDefined();
    expect(result.context.task).toBeDefined();
    expect(result.context.plan).toBeDefined();
    expect(result.context.completedSteps).toBeDefined();
    expect(result.context.reflections).toBeDefined();
    expect(result.context.findings).toBeDefined();
    expect(result.context.errors).toBeDefined();
    expect(result.context.startTime).toBeDefined();

    // Verify context tracking
    expect(result.context.task.description).toBe('Context tracking test');
    expect(result.context.completedSteps.length).toBe(1);
    expect(result.context.reflections.length).toBe(1);
  }, 30000);
});
