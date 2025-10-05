import { AIProvider, ConversationMessage } from './base.js';
import { logger } from '../../utils/logger.js';

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages: ConversationMessage[], systemPrompt: string): Promise<string> {
    try {
      logger.info(`Sending message to Ollama (${this.model})`);

      // Build messages array with system prompt first
      const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Set a long timeout for DeepSeek-R1 and other reasoning models
      // DeepSeek-R1 can take 10+ minutes for complex reasoning
      const controller = new AbortController();
      const timeoutMs = 900000; // 15 minutes
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            messages: ollamaMessages,
            stream: false,
            options: {
              temperature: 0.7,
              num_ctx: 8192, // Context window
            }
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama API returned status ${response.status}: ${await response.text()}`);
        }

        const data = await response.json() as {
          message?: {
            content?: string;
          };
        };

        if (!data.message || !data.message.content) {
          throw new Error('Invalid response from Ollama API');
        }

        logger.info('Received response from Ollama');
        return data.message.content;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      logger.error('Error communicating with Ollama:', error);

      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `Request to Ollama timed out after 15 minutes. ` +
            `This can happen with DeepSeek-R1 on complex questions. Try:\n` +
            `  1. Ask a simpler question\n` +
            `  2. Use a smaller model (deepseek-r1:8b or gemma3:4b)\n` +
            `  3. Ensure your system has enough RAM`
          );
        }
        if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Failed to connect to Ollama at ${this.baseUrl}. ` +
            `Make sure Ollama is running (ollama serve) and the model is pulled (ollama pull ${this.model})`
          );
        }
      }

      throw new Error(`Ollama API error: ${error}`);
    }
  }

  getProviderName(): string {
    return `Ollama (${this.model})`;
  }
}
