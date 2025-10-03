/**
 * Context Manager - Maintains state across agentic execution
 * Tracks progress, findings, and execution history
 */

import {
  Task,
  Plan,
  Step,
  StepResult,
  Reflection,
  AgenticContext,
  SecurityFinding,
  ProgressUpdate,
} from '../types.js';
import { logger } from '../../utils/logger.js';
import { EventEmitter } from 'events';

/**
 * ContextManager class with event emission
 */
export class ContextManager extends EventEmitter {
  private context: AgenticContext;

  constructor(task: Task, plan: Plan) {
    super();
    this.context = {
      task,
      plan,
      completedSteps: [],
      reflections: [],
      findings: [],
      errors: [],
      startTime: new Date(),
      status: 'planning',
    };
  }

  /**
   * Get current context
   */
  getContext(): AgenticContext {
    return { ...this.context };
  }

  /**
   * Get task
   */
  getTask(): Task {
    return this.context.task;
  }

  /**
   * Get plan
   */
  getPlan(): Plan {
    return this.context.plan;
  }

  /**
   * Update plan
   */
  updatePlan(newPlan: Plan): void {
    logger.info('Updating execution plan');
    this.context.plan = newPlan;
    this.emitProgress({
      type: 'plan',
      message: 'Execution plan updated',
      progress: this.getProgress(),
      timestamp: new Date(),
    });
  }

  /**
   * Set current step
   */
  setCurrentStep(step: Step): void {
    logger.debug(`Setting current step: ${step.stepNumber}`);
    this.context.currentStep = step;
    this.context.status = 'executing';

    this.emitProgress({
      type: 'step_start',
      message: `Starting step ${step.stepNumber}: ${step.description}`,
      step,
      progress: this.getProgress(),
      timestamp: new Date(),
    });
  }

  /**
   * Add completed step result
   */
  addStepResult(result: StepResult): void {
    logger.info(
      `Step completed: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration}ms)`
    );

    this.context.completedSteps.push(result);

    if (!result.success && result.error) {
      this.addError(result.stepId, result.error);
    }

    this.emitProgress({
      type: 'step_complete',
      message: result.success
        ? `Step ${this.context.currentStep?.stepNumber} completed successfully`
        : `Step ${this.context.currentStep?.stepNumber} failed: ${result.error}`,
      result,
      progress: this.getProgress(),
      timestamp: new Date(),
    });
  }

  /**
   * Add reflection
   */
  addReflection(reflection: Reflection): void {
    logger.debug(`Adding reflection: ${reflection.nextAction}`);
    this.context.reflections.push(reflection);
    this.context.status = 'reflecting';

    this.emitProgress({
      type: 'reflection',
      message: `Reflection: ${reflection.reasoning}`,
      reflection,
      progress: this.getProgress(),
      timestamp: new Date(),
    });
  }

  /**
   * Add security finding
   */
  addFinding(finding: SecurityFinding): void {
    logger.info(`New finding: [${finding.severity}] ${finding.title}`);
    this.context.findings.push(finding);
  }

  /**
   * Add multiple findings
   */
  addFindings(findings: SecurityFinding[]): void {
    findings.forEach((f) => this.addFinding(f));
  }

  /**
   * Add error
   */
  addError(step: string, error: string): void {
    logger.error(`Error in step ${step}: ${error}`);
    this.context.errors.push({
      step,
      error,
      timestamp: new Date(),
    });
  }

  /**
   * Mark task as completed
   */
  complete(): void {
    logger.info('Task marked as completed');
    this.context.status = 'completed';
    this.context.endTime = new Date();

    const duration = this.context.endTime.getTime() - this.context.startTime.getTime();

    this.emitProgress({
      type: 'complete',
      message: `Task completed in ${(duration / 1000).toFixed(1)}s`,
      progress: this.getProgress(),
      timestamp: new Date(),
    });
  }

  /**
   * Mark task as failed
   */
  fail(reason: string): void {
    logger.error(`Task failed: ${reason}`);
    this.context.status = 'failed';
    this.context.endTime = new Date();

    this.emitProgress({
      type: 'error',
      message: `Task failed: ${reason}`,
      progress: this.getProgress(),
      timestamp: new Date(),
    });
  }

  /**
   * Mark task as aborted
   */
  abort(reason: string): void {
    logger.warn(`Task aborted: ${reason}`);
    this.context.status = 'aborted';
    this.context.endTime = new Date();

    this.emitProgress({
      type: 'error',
      message: `Task aborted: ${reason}`,
      progress: this.getProgress(),
      timestamp: new Date(),
    });
  }

  /**
   * Get next step to execute
   */
  getNextStep(): Step | null {
    const completedStepIds = this.context.completedSteps.map((r) => r.stepId);
    const remainingSteps = this.context.plan.steps.filter(
      (step) => !completedStepIds.includes(step.id)
    );

    if (remainingSteps.length === 0) {
      return null;
    }

    // Find steps with no uncompleted dependencies
    for (const step of remainingSteps) {
      const dependencies = step.dependencies || [];
      const allDepsCompleted = dependencies.every((depId) =>
        completedStepIds.includes(depId)
      );

      if (allDepsCompleted) {
        return step;
      }
    }

    // If all remaining steps have dependencies, something is wrong
    logger.warn('No executable steps found - possible dependency issue');
    return remainingSteps[0]; // Return first remaining step as fallback
  }

  /**
   * Get steps that can run in parallel
   */
  getParallelSteps(): Step[] {
    const completedStepIds = this.context.completedSteps.map((r) => r.stepId);
    const remainingSteps = this.context.plan.steps.filter(
      (step) => !completedStepIds.includes(step.id)
    );

    const parallelSteps: Step[] = [];

    for (const step of remainingSteps) {
      if (!step.canRunInParallel) continue;

      const dependencies = step.dependencies || [];
      const allDepsCompleted = dependencies.every((depId) =>
        completedStepIds.includes(depId)
      );

      if (allDepsCompleted) {
        parallelSteps.push(step);
      }
    }

    return parallelSteps;
  }

  /**
   * Check if task is complete
   */
  isComplete(): boolean {
    return (
      this.context.status === 'completed' ||
      this.context.completedSteps.length === this.context.plan.steps.length
    );
  }

  /**
   * Check if task should abort
   */
  shouldAbort(): boolean {
    const lastReflection = this.context.reflections[this.context.reflections.length - 1];
    return lastReflection?.nextAction === 'abort' || this.context.status === 'aborted';
  }

  /**
   * Get progress information
   */
  getProgress(): { current: number; total: number; percentage: number } {
    const current = this.context.completedSteps.length;
    const total = this.context.plan.steps.length;
    const percentage = total > 0 ? (current / total) * 100 : 0;

    return { current, total, percentage };
  }

  /**
   * Get execution summary
   */
  getSummary(): {
    taskDescription: string;
    status: string;
    stepsCompleted: number;
    stepsTotal: number;
    findingsCount: number;
    errorsCount: number;
    duration: number;
    successRate: number;
  } {
    const progress = this.getProgress();
    const successfulSteps = this.context.completedSteps.filter((s) => s.success).length;
    const totalSteps = this.context.completedSteps.length;
    const successRate = totalSteps > 0 ? (successfulSteps / totalSteps) * 100 : 0;

    const duration = this.context.endTime
      ? this.context.endTime.getTime() - this.context.startTime.getTime()
      : Date.now() - this.context.startTime.getTime();

    return {
      taskDescription: this.context.task.description,
      status: this.context.status,
      stepsCompleted: progress.current,
      stepsTotal: progress.total,
      findingsCount: this.context.findings.length,
      errorsCount: this.context.errors.length,
      duration,
      successRate,
    };
  }

  /**
   * Get findings by severity
   */
  getFindingsBySeverity(): {
    critical: SecurityFinding[];
    high: SecurityFinding[];
    medium: SecurityFinding[];
    low: SecurityFinding[];
    info: SecurityFinding[];
  } {
    return {
      critical: this.context.findings.filter((f) => f.severity === 'critical'),
      high: this.context.findings.filter((f) => f.severity === 'high'),
      medium: this.context.findings.filter((f) => f.severity === 'medium'),
      low: this.context.findings.filter((f) => f.severity === 'low'),
      info: this.context.findings.filter((f) => f.severity === 'info'),
    };
  }

  /**
   * Emit progress update
   */
  private emitProgress(update: ProgressUpdate): void {
    this.emit('progress', update);
  }

  /**
   * Export context for persistence
   */
  export(): string {
    return JSON.stringify(this.context, null, 2);
  }

  /**
   * Import context from saved state
   */
  static import(contextJson: string): ContextManager {
    const context = JSON.parse(contextJson) as AgenticContext;

    // Create new manager with task and plan
    const manager = new ContextManager(context.task, context.plan);

    // Restore state
    manager.context = {
      ...context,
      startTime: new Date(context.startTime),
      endTime: context.endTime ? new Date(context.endTime) : undefined,
    };

    return manager;
  }
}
