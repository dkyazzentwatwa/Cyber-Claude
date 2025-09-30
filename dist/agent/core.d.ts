import { AgentConfig, AgentMode } from './types.js';
import { ConversationMessage } from './providers/base.js';
export declare class CyberAgent {
    private provider;
    private mode;
    private conversationHistory;
    private systemPrompt;
    private model;
    constructor(agentConfig: AgentConfig);
    private getSystemPrompt;
    /**
     * Send a message to the agent and get a response
     */
    chat(userMessage: string): Promise<string>;
    /**
     * Run a specific security analysis task
     */
    analyze(task: string, context?: any): Promise<string>;
    private buildAnalysisPrompt;
    /**
     * Change the agent's mode
     */
    setMode(mode: AgentMode): void;
    /**
     * Clear conversation history
     */
    clearHistory(): void;
    /**
     * Get current mode
     */
    getMode(): AgentMode;
    /**
     * Get conversation history
     */
    getHistory(): ConversationMessage[];
    /**
     * Get current model
     */
    getModel(): string;
    /**
     * Get provider name
     */
    getProviderName(): string;
}
//# sourceMappingURL=core.d.ts.map