import { AgentConfig, AgentMode } from './types.js';
import { SYSTEM_PROMPTS } from './prompts/system.js';
import { logger } from '../utils/logger.js';
import { AIProvider, ConversationMessage } from './providers/base.js';
import { ClaudeProvider } from './providers/claude.js';
import { GeminiProvider } from './providers/gemini.js';
import { OllamaProvider } from './providers/ollama.js';
import { getModelById } from '../utils/models.js';

export class CyberAgent {
  private provider: AIProvider;
  private mode: AgentMode;
  private conversationHistory: ConversationMessage[] = [];
  private systemPrompt: string;
  private model: string;

  constructor(agentConfig: AgentConfig) {
    this.mode = agentConfig.mode;
    this.model = agentConfig.model || 'claude-sonnet-4-5'; // fallback
    this.systemPrompt = this.getSystemPrompt(agentConfig.mode);

    // Determine provider based on model
    const modelInfo = getModelById(agentConfig.model || 'claude-sonnet-4-5');
    const providerType = modelInfo?.model.provider || 'claude';

    // Initialize appropriate provider
    if (providerType === 'gemini') {
      if (!agentConfig.googleApiKey) {
        throw new Error('Google API key required for Gemini models');
      }
      this.provider = new GeminiProvider(agentConfig.googleApiKey, agentConfig.model || 'gemini-2.5-flash');
      logger.info(`CyberAgent initialized with Gemini (${agentConfig.model}) in ${agentConfig.mode} mode`);
    } else if (providerType === 'ollama') {
      // Ollama (local models)
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      this.provider = new OllamaProvider(ollamaBaseUrl, agentConfig.model || 'deepseek-r1:14b');
      logger.info(`CyberAgent initialized with Ollama (${agentConfig.model}) at ${ollamaBaseUrl} in ${agentConfig.mode} mode`);
    } else {
      // Default to Claude
      if (!agentConfig.apiKey) {
        throw new Error('Anthropic API key required for Claude models');
      }
      this.provider = new ClaudeProvider(
        agentConfig.apiKey,
        agentConfig.model || 'claude-sonnet-4-5',
        agentConfig.maxTokens || 4096
      );
      logger.info(`CyberAgent initialized with Claude (${agentConfig.model}) in ${agentConfig.mode} mode`);
    }
  }

  private getSystemPrompt(mode: AgentMode): string {
    const basePrompt = SYSTEM_PROMPTS.base;
    const modePrompt = SYSTEM_PROMPTS[mode] || '';
    return modePrompt ? `${basePrompt}\n\n${modePrompt}` : basePrompt;
  }

  /**
   * Send a message to the agent and get a response
   */
  async chat(userMessage: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      logger.info(`Sending message to ${this.provider.getProviderName()} (mode: ${this.mode})`);

      // Call provider's chat method
      const assistantMessage = await this.provider.chat(
        this.conversationHistory,
        this.systemPrompt
      );

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      logger.info(`Received response from ${this.provider.getProviderName()}`);
      return assistantMessage;
    } catch (error) {
      logger.error('Error in chat:', error);
      throw new Error(`Failed to communicate with agent: ${error}`);
    }
  }

  /**
   * Run a specific security analysis task
   */
  async analyze(task: string, context?: any): Promise<string> {
    const prompt = this.buildAnalysisPrompt(task, context);
    return this.chat(prompt);
  }

  private buildAnalysisPrompt(task: string, context?: any): string {
    let prompt = task;

    if (context) {
      prompt += '\n\nContext:\n' + JSON.stringify(context, null, 2);
    }

    return prompt;
  }

  /**
   * Change the agent's mode
   */
  setMode(mode: AgentMode): void {
    this.mode = mode;
    this.systemPrompt = this.getSystemPrompt(mode);
    logger.info(`Agent mode changed to ${mode}`);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    logger.info('Conversation history cleared');
  }

  /**
   * Get current mode
   */
  getMode(): AgentMode {
    return this.mode;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }
}