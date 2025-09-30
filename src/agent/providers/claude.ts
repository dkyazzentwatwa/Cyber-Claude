import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ConversationMessage } from './base.js';
import { logger } from '../../utils/logger.js';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model: string, maxTokens: number = 4096) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async chat(messages: ConversationMessage[], systemPrompt: string): Promise<string> {
    try {
      // Convert to Anthropic message format
      const anthropicMessages: Anthropic.MessageParam[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      logger.info(`Sending message to Claude (${this.model})`);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      // Extract text from response
      const assistantMessage = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as Anthropic.TextBlock).text)
        .join('\n');

      logger.info('Received response from Claude');
      return assistantMessage;
    } catch (error) {
      logger.error('Error communicating with Claude:', error);
      throw new Error(`Claude API error: ${error}`);
    }
  }

  getProviderName(): string {
    return 'Claude (Anthropic)';
  }
}