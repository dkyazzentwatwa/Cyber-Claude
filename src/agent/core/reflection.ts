/**
 * Reflection Engine - Analyzes step results and determines next actions
 * Provides adaptive behavior and self-correction
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Step, StepResult, Reflection } from '../types.js';
import { generateReflectionPrompt } from '../prompts/agentic.js';
import { logger } from '../../utils/logger.js';

/**
 * Reflection engine configuration
 */
export interface ReflectionConfig {
  apiKey?: string;
  googleApiKey?: string;
  model?: string;
  maxRetries?: number;
  confidenceThreshold?: number;
}

/**
 * Parsed reflection response from AI
 */
interface ParsedReflectionResponse {
  reasoning: string;
  success: boolean;
  successCriteriaMet: boolean[];
  confidence: number;
  shouldContinue: boolean;
  taskComplete: boolean;
  nextAction: 'continue' | 'retry' | 'adjust' | 'complete' | 'abort';
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
}

/**
 * ReflectionEngine class
 */
export class ReflectionEngine {
  private anthropic?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private config: ReflectionConfig;

  constructor(config: ReflectionConfig) {
    this.config = {
      maxRetries: 3,
      confidenceThreshold: 0.7,
      ...config,
    };

    if (config.apiKey) {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
    }

    if (config.googleApiKey) {
      this.gemini = new GoogleGenerativeAI(config.googleApiKey);
    }

    if (!this.anthropic && !this.gemini) {
      throw new Error('At least one API key (Anthropic or Google) must be provided');
    }
  }

  /**
   * Reflect on a step result and determine next action
   */
  async reflect(step: Step, result: StepResult): Promise<Reflection> {
    logger.info(`Reflecting on step ${step.stepNumber}: ${step.description}`);

    try {
      // Generate reflection prompt
      const stepInfo = JSON.stringify(
        {
          stepNumber: step.stepNumber,
          description: step.description,
          tool: step.tool,
          parameters: step.parameters,
        },
        null,
        2
      );

      const resultInfo = JSON.stringify(
        {
          success: result.success,
          output: result.output,
          error: result.error,
          duration: result.duration,
        },
        null,
        2
      );

      const reflectionPrompt = generateReflectionPrompt(
        stepInfo,
        resultInfo,
        step.successCriteria
      );

      // Get AI response
      const aiResponse = await this.callAI(reflectionPrompt);

      // Parse response
      const parsedReflection = this.parseReflectionResponse(aiResponse);

      // Validate reflection
      this.validateReflection(parsedReflection, step);

      // Create Reflection object
      const reflection: Reflection = {
        stepId: step.id,
        success: parsedReflection.success,
        reasoning: parsedReflection.reasoning,
        successCriteriaMet: parsedReflection.successCriteriaMet,
        shouldContinue: parsedReflection.shouldContinue,
        confidence: parsedReflection.confidence,
        taskComplete: parsedReflection.taskComplete,
        nextAction: parsedReflection.nextAction,
        adjustments: parsedReflection.adjustments,
      };

      logger.info(`Reflection complete: ${reflection.nextAction} (confidence: ${reflection.confidence})`);
      logger.debug(`Reflection: ${JSON.stringify(reflection, null, 2)}`);

      return reflection;
    } catch (error) {
      logger.error(`Reflection failed: ${error instanceof Error ? error.message : String(error)}`);

      // Fallback reflection on error
      return this.createFallbackReflection(step, result);
    }
  }

  /**
   * Quick reflection without AI (rule-based)
   */
  quickReflect(step: Step, result: StepResult): Reflection {
    logger.debug(`Quick reflection (rule-based) on step ${step.stepNumber}`);

    const success = result.success;
    const shouldRetry = !success && result.attemptNumber < (this.config.maxRetries || 3);
    const shouldContinue = success || !shouldRetry;

    return {
      stepId: step.id,
      success,
      reasoning: success
        ? `Step completed successfully`
        : `Step failed: ${result.error}`,
      successCriteriaMet: [success],
      shouldContinue,
      confidence: success ? 1.0 : 0.5,
      taskComplete: false,
      nextAction: success ? 'continue' : shouldRetry ? 'retry' : 'abort',
      adjustments: shouldRetry ? { retryStep: true } : undefined,
    };
  }

  /**
   * Call AI for reflection
   */
  private async callAI(prompt: string): Promise<string> {
    const model = this.config.model || 'claude-sonnet-4-5';

    if (this.anthropic && model.includes('claude')) {
      return await this.callClaude(prompt, model);
    }

    if (this.gemini) {
      return await this.callGemini(prompt, model);
    }

    throw new Error('No AI provider available');
  }

  /**
   * Call Claude API
   */
  private async callClaude(prompt: string, model: string): Promise<string> {
    logger.debug('Using Claude for reflection');

    const response = await this.anthropic!.messages.create({
      model: model,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

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
    logger.debug('Using Gemini for reflection');

    const model = this.gemini!.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  /**
   * Parse AI reflection response
   */
  private parseReflectionResponse(response: string): ParsedReflectionResponse {
    // Extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    try {
      const parsed = JSON.parse(jsonStr);
      return parsed as ParsedReflectionResponse;
    } catch (error) {
      logger.error(`Failed to parse reflection response: ${response}`);
      throw new Error('AI response was not valid JSON. Reflection parsing failed.');
    }
  }

  /**
   * Validate parsed reflection
   */
  private validateReflection(
    reflection: ParsedReflectionResponse,
    step: Step
  ): void {
    if (typeof reflection.success !== 'boolean') {
      throw new Error('Reflection missing success field');
    }

    if (!Array.isArray(reflection.successCriteriaMet)) {
      throw new Error('Reflection missing successCriteriaMet array');
    }

    if (reflection.successCriteriaMet.length !== step.successCriteria.length) {
      throw new Error(
        `Reflection has ${reflection.successCriteriaMet.length} criteria evaluations, expected ${step.successCriteria.length}`
      );
    }

    if (
      typeof reflection.confidence !== 'number' ||
      reflection.confidence < 0 ||
      reflection.confidence > 1
    ) {
      throw new Error('Reflection confidence must be between 0 and 1');
    }

    if (!['continue', 'retry', 'adjust', 'complete', 'abort'].includes(reflection.nextAction)) {
      throw new Error(`Invalid nextAction: ${reflection.nextAction}`);
    }
  }

  /**
   * Create fallback reflection when AI fails
   */
  private createFallbackReflection(step: Step, result: StepResult): Reflection {
    logger.warn('Creating fallback reflection due to AI failure');

    return {
      stepId: step.id,
      success: result.success,
      reasoning: result.success
        ? 'Step completed successfully (fallback reflection)'
        : `Step failed: ${result.error} (fallback reflection)`,
      successCriteriaMet: step.successCriteria.map(() => result.success),
      shouldContinue: result.success,
      confidence: 0.5, // Low confidence for fallback
      taskComplete: false,
      nextAction: result.success ? 'continue' : 'abort',
    };
  }

  /**
   * Analyze multiple reflections to determine overall status
   */
  analyzeReflections(reflections: Reflection[]): {
    overallSuccess: boolean;
    averageConfidence: number;
    shouldContinue: boolean;
    criticalIssues: string[];
  } {
    const successCount = reflections.filter((r) => r.success).length;
    const totalCount = reflections.length;
    const overallSuccess = successCount === totalCount;

    const averageConfidence =
      reflections.reduce((sum, r) => sum + r.confidence, 0) / totalCount;

    const shouldContinue = reflections.every((r) => r.shouldContinue);

    const criticalIssues = reflections
      .filter((r) => !r.success && r.nextAction === 'abort')
      .map((r) => r.reasoning);

    return {
      overallSuccess,
      averageConfidence,
      shouldContinue,
      criticalIssues,
    };
  }
}
