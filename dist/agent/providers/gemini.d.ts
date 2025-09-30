import { AIProvider, ConversationMessage } from './base.js';
export declare class GeminiProvider implements AIProvider {
    private client;
    private model;
    constructor(apiKey: string, model: string);
    chat(messages: ConversationMessage[], systemPrompt: string): Promise<string>;
    getProviderName(): string;
}
//# sourceMappingURL=gemini.d.ts.map