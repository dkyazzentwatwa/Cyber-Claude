import { AIProvider, ConversationMessage } from './base.js';
export declare class ClaudeProvider implements AIProvider {
    private client;
    private model;
    private maxTokens;
    constructor(apiKey: string, model: string, maxTokens?: number);
    chat(messages: ConversationMessage[], systemPrompt: string): Promise<string>;
    getProviderName(): string;
}
//# sourceMappingURL=claude.d.ts.map