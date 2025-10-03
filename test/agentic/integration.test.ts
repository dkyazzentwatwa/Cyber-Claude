/**
 * Integration test for autonomous agentic workflow
 * Tests the full planning -> execution -> reflection cycle with mocked AI
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
  return {
    ToolExecutor: {
      executeStep: vi.fn().mockResolvedValue({
        success: true,
        output: 'Mock tool execution successful',
        data: { mockResult: true },
        duration: 100,
        attemptNumber: 1,
      }),
    },
  };
});

describe('Autonomous Agentic Workflow Integration', () => {
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

  it.skip('should complete full autonomous workflow with planning, execution, and reflection', async () => {
    // Mock planning response - AI creates a plan
    const planningResponse = {
      reasoning: 'Breaking down the task into executable steps',
      steps: [
        {
          stepNumber: 1,
          description: 'Analyze PCAP file for network traffic',
          tool: 'pcap',
          parameters: { file: '/path/to/test.pcap', mode: 'quick' },
          successCriteria: ['File analyzed successfully', 'Protocols identified'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 2000,
        },
        {
          stepNumber: 2,
          description: 'Perform reconnaissance on discovered domain',
          tool: 'recon',
          parameters: { target: 'example.com', depth: 'standard' },
          successCriteria: ['Domain information retrieved'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 3000,
        },
      ],
      riskLevel: 'low' as const,
      estimatedDuration: 5000,
    };

    // Mock reflection responses - one for each step
    const reflectionResponse1 = {
      reasoning: 'Step completed successfully',
      success: true,
      successCriteriaMet: [true, true],
      confidence: 0.9,
      shouldContinue: true,
      taskComplete: false,
      nextAction: 'continue' as const,
    };

    const reflectionResponse2 = {
      reasoning: 'All steps completed successfully',
      success: true,
      successCriteriaMet: [true],
      confidence: 0.95,
      shouldContinue: false,
      taskComplete: true,
      nextAction: 'complete' as const,
    };

    // Setup mock responses in order (Anthropic SDK format)
    // 1 planning + 2 reflections (one per step)
    mockMessagesCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reflectionResponse1) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(reflectionResponse2) }],
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
    const result = await agent.executeTask('Analyze a test PCAP file');

    // Verify execution completed
    expect(result.success).toBe(true);
    expect(result.context).toBeDefined();
    expect(result.context.plan).toBeDefined();
    expect(result.context.plan.steps).toHaveLength(2);
    expect(result.context.status).toBe('completed');

    // Verify planning was called
    expect(mockMessagesCreate).toHaveBeenCalled();
    expect(mockMessagesCreate.mock.calls.length).toBeGreaterThan(0);
  }, 30000);

  it.skip('should handle task failure gracefully', async () => {
    // Mock planning response that will fail
    const planningResponse = {
      reasoning: 'Creating a plan that will fail validation',
      steps: [
        {
          stepNumber: 1,
          description: 'Invalid operation',
          tool: 'nonexistent-tool',
          parameters: {},
          successCriteria: ['Should fail'],
          riskLevel: 'high' as const,
          requiresApproval: true,
          estimatedDuration: 1000,
        },
      ],
      riskLevel: 'high' as const,
      estimatedDuration: 1000,
    };

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
    });

    const config = {
      apiKey: 'test-key',
      model: 'claude-sonnet-4-5',
      mode: 'base' as const,
      maxSteps: 5,
      maxDuration: 60000,
      autoApprove: true, // Auto-approve to let it try executing
      verbose: false,
    };

    const agent = new AgenticCore(config);
    const result = await agent.executeTask('Try an invalid task');

    // Should have errors logged even if task "completes"
    expect(result.context.errors.length).toBeGreaterThan(0);
  }, 30000);

  it('should respect max steps constraint', async () => {
    // Mock planning response with too many steps
    const steps = Array.from({ length: 30 }, (_, i) => ({
      stepNumber: i + 1,
      description: `Step ${i + 1}`,
      tool: 'recon',
      parameters: { target: 'example.com', depth: 'quick' },
      successCriteria: ['Complete'],
      riskLevel: 'low' as const,
      requiresApproval: false,
      estimatedDuration: 1000,
    }));

    const planningResponse = {
      reasoning: 'Creating a plan with too many steps',
      steps,
      riskLevel: 'low' as const,
      estimatedDuration: 30000,
    };

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
    });

    const config = {
      apiKey: 'test-key',
      model: 'claude-sonnet-4-5',
      mode: 'base' as const,
      maxSteps: 5, // Only allow 5 steps
      maxDuration: 60000,
      autoApprove: true,
      verbose: false,
    };

    const agent = new AgenticCore(config);
    const result = await agent.executeTask('Task with many steps');

    // Should fail due to too many steps
    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds maximum steps');
  }, 30000);

  it.skip('should validate plan with SafetyValidator', async () => {
    // Mock planning response with invalid tool
    const planningResponse = {
      reasoning: 'Creating a plan with invalid tool',
      steps: [
        {
          stepNumber: 1,
          description: 'Use invalid tool',
          tool: 'this-tool-does-not-exist',
          parameters: {},
          successCriteria: ['Success'],
          riskLevel: 'low' as const,
          requiresApproval: false,
          estimatedDuration: 1000,
        },
      ],
      riskLevel: 'low' as const,
      estimatedDuration: 1000,
    };

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(planningResponse) }],
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
    const result = await agent.executeTask('Task with invalid tool');

    // Should have errors in the context even if it "completes"
    // because the tool doesn't exist, execution should fail
    expect(result.context.errors.length).toBeGreaterThan(0);
    expect(result.context.errors[0].error).toContain('not found in registry');
  }, 30000);
});
