import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger.js';
export class GeminiProvider {
    client;
    model;
    constructor(apiKey, model) {
        this.client = new GoogleGenerativeAI(apiKey);
        this.model = model;
    }
    async chat(messages, systemPrompt) {
        try {
            logger.info(`Sending message to Gemini (${this.model})`);
            const genModel = this.client.getGenerativeModel({
                model: this.model,
                systemInstruction: systemPrompt,
            });
            // Convert conversation history to Gemini format
            const history = messages.slice(0, -1).map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));
            // Get the last user message
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role !== 'user') {
                throw new Error('Last message must be from user');
            }
            // Create chat session with history
            const chat = genModel.startChat({
                history: history,
            });
            // Send the last message
            const result = await chat.sendMessage(lastMessage.content);
            const response = result.response;
            const text = response.text();
            logger.info('Received response from Gemini');
            return text;
        }
        catch (error) {
            logger.error('Error communicating with Gemini:', error);
            throw new Error(`Gemini API error: ${error}`);
        }
    }
    getProviderName() {
        return 'Gemini (Google)';
    }
}
//# sourceMappingURL=gemini.js.map