/**
 * Agentic Core - Main autonomous execution engine
 * Orchestrates planning, execution, reflection, and adaptation
 */

import { Task, Plan, Step, StepResult, Reflection, AgenticContext, AgentMode } from '../types.js';
import { TaskPlanner, PlannerConfig } from './planner.js';
import { ReflectionEngine, ReflectionConfig } from './reflection.js';
import { ContextManager } from './context.js';
import { ToolExecutor, ExecutionOptions } from '../tools/executor.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agentic agent configuration
 */
export interface AgenticConfig {
  apiKey?: string;
  googleApiKey?: string;
  model?: string;
  mode?: AgentMode;
  maxSteps?: number;
  maxDuration?: number; // milliseconds
  useExtendedThinking?: boolean;
  autoApprove?: boolean; // Auto-approve high-risk operations (USE WITH CAUTION)
  requireApprovalCallback?: (step: Step) => Promise<boolean>;
  verbose?: boolean;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  context: AgenticContext;
  error?: string;
  duration: number;
}

/**
 * AgenticCore - The autonomous agent brain
 */
export class AgenticCore {
  private planner: TaskPlanner;
  private reflector: ReflectionEngine;
  private config: AgenticConfig;

  constructor(config: AgenticConfig) {
    this.config = {
      maxSteps: 20,
      maxDuration: 600000, // 10 minutes default
      autoApprove: false,
      verbose: false,
      ...config,
    };

    // Initialize planner
    const plannerConfig: PlannerConfig = {
      apiKey: config.apiKey,
      googleApiKey: config.googleApiKey,
      model: config.model,
      mode: config.mode,
      useExtendedThinking: config.useExtendedThinking,
      maxSteps: config.maxSteps,
    };
    this.planner = new TaskPlanner(plannerConfig);

    // Initialize reflector
    const reflectorConfig: ReflectionConfig = {
      apiKey: config.apiKey,
      googleApiKey: config.googleApiKey,
      model: config.model,
    };
    this.reflector = new ReflectionEngine(reflectorConfig);
  }

  /**
   * Execute a task autonomously
   */
  async executeTask(taskDescription: string, constraints?: string[]): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Create task
      const task: Task = {
        id: uuidv4(),
        description: taskDescription,
        goal: taskDescription,
        constraints,
        maxSteps: this.config.maxSteps,
        maxDuration: this.config.maxDuration,
        createdAt: new Date(),
      };

      logger.info(`🤖 Starting autonomous task: ${task.description}`);

      // Phase 1: Planning
      logger.info('📋 Phase 1: Planning');
      const plan = await this.planner.createPlan(task);

      // Create context manager
      const contextManager = new ContextManager(task, plan);

      // Set up progress monitoring
      this.setupProgressMonitoring(contextManager);

      // Phase 2: Execution Loop
      logger.info(`🔄 Phase 2: Execution (${plan.steps.length} steps planned)`);
      await this.executionLoop(contextManager);

      // Phase 3: Completion
      const duration = Date.now() - startTime;
      const summary = contextManager.getSummary();

      logger.info(`✅ Task completed: ${summary.stepsCompleted}/${summary.stepsTotal} steps`);
      logger.info(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
      logger.info(`🔍 Findings: ${summary.findingsCount}`);

      return {
        success: true,
        context: contextManager.getContext(),
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`❌ Task failed: ${errorMessage}`);

      return {
        success: false,
        context: {} as AgenticContext, // Minimal context on failure
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Main execution loop
   */
  private async executionLoop(contextManager: ContextManager): Promise<void> {
    const maxIterations = this.config.maxSteps || 20;
    let iterations = 0;

    while (!contextManager.isComplete() && iterations < maxIterations) {
      iterations++;

      // Check if should abort
      if (contextManager.shouldAbort()) {
        contextManager.abort('Execution aborted by reflection');
        break;
      }

      // Check timeout
      const elapsed = Date.now() - contextManager.getContext().startTime.getTime();
      if (this.config.maxDuration && elapsed > this.config.maxDuration) {
        contextManager.fail(`Timeout: exceeded ${this.config.maxDuration}ms`);
        break;
      }

      // Get next step(s)
      const parallelSteps = contextManager.getParallelSteps();
      const nextStep = parallelSteps.length > 0 ? null : contextManager.getNextStep();

      if (!nextStep && parallelSteps.length === 0) {
        // No more steps
        contextManager.complete();
        break;
      }

      // Execute parallel steps or single step
      if (parallelSteps.length > 0) {
        await this.executeParallelSteps(parallelSteps, contextManager);
      } else if (nextStep) {
        await this.executeSingleStep(nextStep, contextManager);
      }
    }

    if (iterations >= maxIterations) {
      contextManager.fail(`Max iterations reached: ${maxIterations}`);
    }
  }

  /**
   * Execute a single step
   */
  private async executeSingleStep(step: Step, contextManager: ContextManager): Promise<void> {
    contextManager.setCurrentStep(step);

    try {
      // Check if approval needed
      if (step.requiresApproval && !this.config.autoApprove) {
        const approved = await this.requestApproval(step);
        if (!approved) {
          logger.warn(`Step ${step.stepNumber} not approved, skipping`);
          return;
        }
      }

      // Execute step
      const executionOptions: ExecutionOptions = {
        timeout: step.estimatedDuration || 60000,
        verbose: this.config.verbose,
      };

      let result = await ToolExecutor.executeStep(step, 1, executionOptions);
      contextManager.addStepResult(result);

      // Reflect on result
      const reflection = await this.reflector.reflect(step, result);
      contextManager.addReflection(reflection);

      // Handle reflection decisions
      await this.handleReflection(reflection, step, result, contextManager);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Step execution failed: ${errorMessage}`);
      contextManager.addError(step.id, errorMessage);
    }
  }

  /**
   * Execute multiple steps in parallel
   */
  private async executeParallelSteps(
    steps: Step[],
    contextManager: ContextManager
  ): Promise<void> {
    logger.info(`Executing ${steps.length} steps in parallel`);

    const executionOptions: ExecutionOptions = {
      verbose: this.config.verbose,
    };

    try {
      const results = await ToolExecutor.executeParallel(steps, executionOptions);

      // Add all results
      results.forEach((result) => contextManager.addStepResult(result));

      // Reflect on each result
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const result = results[i];

        const reflection = await this.reflector.reflect(step, result);
        contextManager.addReflection(reflection);

        await this.handleReflection(reflection, step, result, contextManager);
      }
    } catch (error) {
      logger.error(`Parallel execution failed: ${error}`);
      contextManager.addError('parallel', String(error));
    }
  }

  /**
   * Handle reflection and adapt plan if needed
   */
  private async handleReflection(
    reflection: Reflection,
    step: Step,
    result: StepResult,
    contextManager: ContextManager
  ): Promise<void> {
    switch (reflection.nextAction) {
      case 'continue':
        logger.info(`✓ Step ${step.stepNumber} successful, continuing`);
        break;

      case 'retry':
        logger.warn(`⟳ Retrying step ${step.stepNumber}`);
        if (reflection.adjustments?.retryStep) {
          const retryResult = await ToolExecutor.retryStep(step, result.attemptNumber);
          contextManager.addStepResult(retryResult);
        }
        break;

      case 'adjust':
        logger.info(`🔧 Adjusting plan based on findings`);
        if (reflection.adjustments?.modifyPlan) {
          await this.adjustPlan(reflection, contextManager);
        }
        break;

      case 'complete':
        logger.info(`✅ Task completed by reflection`);
        contextManager.complete();
        break;

      case 'abort':
        logger.error(`🛑 Aborting: ${reflection.reasoning}`);
        contextManager.abort(reflection.reasoning);
        break;
    }
  }

  /**
   * Adjust plan based on reflection
   */
  private async adjustPlan(
    reflection: Reflection,
    contextManager: ContextManager
  ): Promise<void> {
    const currentPlan = contextManager.getPlan();
    const completedSteps = contextManager.getContext().completedSteps.map((r) => {
      const step = currentPlan.steps.find((s) => s.id === r.stepId);
      return step!;
    });

    // Convert additional steps if provided
    const additionalSteps: Step[] | undefined = reflection.adjustments?.additionalSteps?.map(
      (stepDef) => ({
        id: uuidv4(),
        stepNumber: stepDef.stepNumber,
        description: stepDef.description,
        tool: stepDef.tool,
        parameters: stepDef.parameters,
        successCriteria: stepDef.successCriteria,
        dependencies: stepDef.dependencies || [],
        canRunInParallel: stepDef.canRunInParallel || false,
        estimatedDuration: stepDef.estimatedDuration || 30000,
        riskLevel: stepDef.riskLevel,
        requiresApproval: stepDef.requiresApproval || false,
      })
    );

    const adjustedPlan = await this.planner.adjustPlan(
      currentPlan,
      completedSteps,
      reflection.reasoning,
      additionalSteps
    );

    contextManager.updatePlan(adjustedPlan);
  }

  /**
   * Request approval for high-risk step
   */
  private async requestApproval(step: Step): Promise<boolean> {
    if (this.config.requireApprovalCallback) {
      return await this.config.requireApprovalCallback(step);
    }

    // Default: deny if no callback provided
    logger.warn(`No approval callback configured, denying step ${step.stepNumber}`);
    return false;
  }

  /**
   * Setup progress monitoring
   */
  private setupProgressMonitoring(contextManager: ContextManager): void {
    if (!this.config.verbose) return;

    contextManager.on('progress', (update) => {
      const { type, message, progress } = update;
      const progressBar = this.generateProgressBar(progress.percentage);

      switch (type) {
        case 'step_start':
          logger.info(`[${progressBar}] ${message}`);
          break;
        case 'step_complete':
          logger.info(`[${progressBar}] ${message}`);
          break;
        case 'reflection':
          logger.debug(`💭 ${message}`);
          break;
        case 'complete':
          logger.info(`[${progressBar}] ${message}`);
          break;
        case 'error':
          logger.error(`[${progressBar}] ${message}`);
          break;
      }
    });
  }

  /**
   * Generate progress bar
   */
  private generateProgressBar(percentage: number): string {
    const width = 20;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const filled = Math.round((clampedPercentage / 100) * width);
    const empty = Math.max(0, width - filled);
    return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${clampedPercentage.toFixed(0)}%`;
  }
}
