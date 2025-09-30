import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';
export class ClaudeProvider {
    client;
    model;
    maxTokens;
    constructor(apiKey, model, maxTokens = 4096) {
        this.client = new Anthropic({ apiKey });
        this.model = model;
        this.maxTokens = maxTokens;
    }
    async chat(messages, systemPrompt) {
        try {
            // Convert to Anthropic message format
            const anthropicMessages = messages.map(msg => ({
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
                .map((block) => block.text)
                .join('\n');
            logger.info('Received response from Claude');
            return assistantMessage;
        }
        catch (error) {
            logger.error('Error communicating with Claude:', error);
            throw new Error(`Claude API error: ${error}`);
        }
    }
    getProviderName() {
        return 'Claude (Anthropic)';
    }
}
//# sourceMappingURL=claude.js.map