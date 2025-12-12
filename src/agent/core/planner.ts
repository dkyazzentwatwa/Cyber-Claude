/**
 * Task Planner - AI-powered planning for autonomous execution
 * Uses LLM to break down tasks into executable steps
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Task, Plan, Step, AgentMode } from '../types.js';
import { generatePlanPrompt } from '../prompts/agentic.js';
import { generateToolRegistryPrompt } from '../tools/registry.js';
import { SYSTEM_PROMPTS } from '../prompts/system.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Planner configuration
 */
export interface PlannerConfig {
  apiKey?: string;
  googleApiKey?: string;
  openaiApiKey?: string;
  model?: string;
  mode?: AgentMode;
  useExtendedThinking?: boolean;
  maxSteps?: number;
}

/**
 * Parsed plan from AI response
 */
interface ParsedPlanResponse {
  reasoning: string;
  steps: Array<{
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
  estimatedDuration?: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * TaskPlanner class
 */
export class TaskPlanner {
  private anthropic?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private openai?: OpenAI;
  private config: PlannerConfig;

  constructor(config: PlannerConfig) {
    this.config = config;

    if (config.apiKey) {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
    }

    if (config.googleApiKey) {
      this.gemini = new GoogleGenerativeAI(config.googleApiKey);
    }

    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }

    if (!this.anthropic && !this.gemini && !this.openai) {
      throw new Error('At least one API key (Anthropic, Google, or OpenAI) must be provided');
    }
  }

  /**
   * Create an execution plan for a task
   */
  async createPlan(task: Task): Promise<Plan> {
    logger.info(`Creating execution plan for task: ${task.description}`);

    try {
      // Get mode-specific context
      const mode = this.config.mode || 'base';
      const modeContext = SYSTEM_PROMPTS[mode];

      // Generate planning prompt with tool registry and mode context
      const toolRegistry = generateToolRegistryPrompt();
      const planningPrompt = `${modeContext}\n\n${generatePlanPrompt(task.description, toolRegistry)}`;

      // Get AI response
      const aiResponse = await this.callAI(planningPrompt);

      // Parse the response
      const parsedPlan = this.parsePlanResponse(aiResponse);

      // Validate plan
      this.validatePlan(parsedPlan, task);

      // Convert to Plan object
      const plan: Plan = {
        taskId: task.id,
        steps: parsedPlan.steps.map((step) => ({
          id: uuidv4(),
          stepNumber: step.stepNumber,
          description: step.description,
          tool: step.tool,
          parameters: step.parameters,
          successCriteria: step.successCriteria,
          dependencies: step.dependencies || [],
          canRunInParallel: step.canRunInParallel || false,
          estimatedDuration: step.estimatedDuration || 30000,
          riskLevel: step.riskLevel,
          requiresApproval: step.requiresApproval || false,
        })),
        estimatedDuration: parsedPlan.estimatedDuration,
        riskLevel: parsedPlan.riskLevel,
        createdAt: new Date(),
      };

      logger.info(`Plan created with ${plan.steps.length} steps`);
      logger.debug(`Plan: ${JSON.stringify(plan, null, 2)}`);

      return plan;
    } catch (error) {
      logger.error(`Planning failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to create plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Adjust an existing plan based on new information
   */
  async adjustPlan(
    currentPlan: Plan,
    completedSteps: Step[],
    reason: string,
    additionalSteps?: Step[]
  ): Promise<Plan> {
    logger.info(`Adjusting plan: ${reason}`);

    // For now, simple implementation: add new steps or modify remaining
    const remainingSteps = currentPlan.steps.filter(
      (step) => !completedSteps.find((cs) => cs.id === step.id)
    );

    let newSteps = remainingSteps;

    if (additionalSteps && additionalSteps.length > 0) {
      // Insert additional steps
      newSteps = [...additionalSteps, ...remainingSteps];
      // Renumber
      newSteps = newSteps.map((step, idx) => ({
        ...step,
        stepNumber: idx + 1,
      }));
    }

    return {
      ...currentPlan,
      steps: newSteps,
      createdAt: new Date(), // Updated plan
    };
  }

  /**
   * Call AI for planning (supports Claude and Gemini)
   */
  private async callAI(prompt: string): Promise<string> {
    const model = this.config.model || 'claude-sonnet-4-5';

    // Use Claude if available and model starts with "claude"
    if (this.anthropic && model.includes('claude')) {
      return await this.callClaude(prompt, model);
    }

    // Use Gemini
    if (this.gemini) {
      return await this.callGemini(prompt, model);
    }

    throw new Error('No AI provider available');
  }

  /**
   * Call Claude API
   */
  private async callClaude(prompt: string, model: string): Promise<string> {
    logger.debug('Using Claude for planning');

    const response = await this.anthropic!.messages.create({
      model: model,
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('\n');

    return textContent;
  }

  /**
   * Call Gemini API
   */
  private async callGemini(prompt: string, modelName: string): Promise<string> {
    logger.debug('Using Gemini for planning');

    const model = this.gemini!.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  /**
   * Parse AI response into structured plan
   */
  private parsePlanResponse(response: string): ParsedPlanResponse {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    try {
      const parsed = JSON.parse(jsonStr);
      return parsed as ParsedPlanResponse;
    } catch (error) {
      logger.error(`Failed to parse plan response: ${response}`);
      throw new Error('AI response was not valid JSON. Plan parsing failed.');
    }
  }

  /**
   * Validate the generated plan
   */
  private validatePlan(plan: ParsedPlanResponse, task: Task): void {
    if (!plan.steps || plan.steps.length === 0) {
      throw new Error('Plan has no steps');
    }

    if (task.maxSteps && plan.steps.length > task.maxSteps) {
      throw new Error(`Plan exceeds maximum steps: ${plan.steps.length} > ${task.maxSteps}`);
    }

    // Validate each step has required fields
    for (const step of plan.steps) {
      if (!step.tool || !step.description || !step.parameters) {
        throw new Error(`Step ${step.stepNumber} missing required fields`);
      }

      if (!step.successCriteria || step.successCriteria.length === 0) {
        throw new Error(`Step ${step.stepNumber} has no success criteria`);
      }
    }

    // Check for circular dependencies
    this.checkCircularDependencies(plan.steps);
  }

  /**
   * Check for circular dependencies in plan
   */
  private checkCircularDependencies(
    steps: ParsedPlanResponse['steps']
  ): void {
    const stepIds = steps.map((s) => s.stepNumber.toString());

    for (const step of steps) {
      if (!step.dependencies) continue;

      const visited = new Set<string>();
      const queue = [...step.dependencies];

      while (queue.length > 0) {
        const dep = queue.shift()!;

        if (visited.has(dep)) continue;
        visited.add(dep);

        if (dep === step.stepNumber.toString()) {
          throw new Error(`Circular dependency detected for step ${step.stepNumber}`);
        }

        const depStep = steps.find((s) => s.stepNumber.toString() === dep);
        if (depStep && depStep.dependencies) {
          queue.push(...depStep.dependencies);
        }
      }
    }
  }
}
