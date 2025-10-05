export declare const AVAILABLE_MODELS: {
    readonly 'opus-4.1': {
        readonly id: "claude-opus-4-1";
        readonly name: "Claude Opus 4.1";
        readonly description: "Most capable model - Best for complex security analysis";
        readonly provider: "claude";
        readonly recommended: false;
    };
    readonly 'opus-4': {
        readonly id: "claude-opus-4-0";
        readonly name: "Claude Opus 4";
        readonly description: "Highly capable - Excellent for thorough analysis";
        readonly provider: "claude";
        readonly recommended: false;
    };
    readonly 'sonnet-4.5': {
        readonly id: "claude-sonnet-4-5";
        readonly name: "Claude Sonnet 4.5";
        readonly description: "Latest Sonnet - Balanced performance and speed";
        readonly provider: "claude";
        readonly recommended: true;
    };
    readonly 'sonnet-4': {
        readonly id: "claude-sonnet-4-0";
        readonly name: "Claude Sonnet 4";
        readonly description: "Fast and capable - Great for most tasks";
        readonly provider: "claude";
        readonly recommended: false;
    };
    readonly 'sonnet-3.7': {
        readonly id: "claude-3-7-sonnet-latest";
        readonly name: "Claude Sonnet 3.7";
        readonly description: "Previous generation - Proven and reliable";
        readonly provider: "claude";
        readonly recommended: false;
    };
    readonly 'haiku-3.5': {
        readonly id: "claude-3-5-haiku-latest";
        readonly name: "Claude Haiku 3.5";
        readonly description: "Fastest Claude model - Quick responses";
        readonly provider: "claude";
        readonly recommended: false;
    };
    readonly 'gemini-2.5-flash': {
        readonly id: "gemini-2.5-flash";
        readonly name: "Gemini 2.5 Flash";
        readonly description: "Most balanced Gemini model - Fast and capable";
        readonly provider: "gemini";
        readonly recommended: false;
    };
    readonly 'gemini-2.5-pro': {
        readonly id: "gemini-2.5-pro";
        readonly name: "Gemini 2.5 Pro";
        readonly description: "Most powerful Gemini thinking model";
        readonly provider: "gemini";
        readonly recommended: false;
    };
    readonly 'gemini-2.5-flash-lite': {
        readonly id: "gemini-2.5-flash-lite";
        readonly name: "Gemini 2.5 Flash Lite";
        readonly description: "Fastest and most cost-efficient Gemini model";
        readonly provider: "gemini";
        readonly recommended: false;
    };
    readonly 'deepseek-r1-14b': {
        readonly id: "deepseek-r1:14b";
        readonly name: "DeepSeek R1 14B (Local)";
        readonly description: "Local reasoning model - Best for complex security analysis (14B)";
        readonly provider: "ollama";
        readonly recommended: true;
    };
    readonly 'deepseek-r1-8b': {
        readonly id: "deepseek-r1:8b";
        readonly name: "DeepSeek R1 8B (Local)";
        readonly description: "Local reasoning model - Balanced performance (8B)";
        readonly provider: "ollama";
        readonly recommended: false;
    };
    readonly 'gemma3-4b': {
        readonly id: "gemma3:4b";
        readonly name: "Gemma 3 4B (Local)";
        readonly description: "Local Google model - Fast for quick scans (4B)";
        readonly provider: "ollama";
        readonly recommended: false;
    };
};
export type Provider = 'claude' | 'gemini' | 'ollama';
export type ModelKey = keyof typeof AVAILABLE_MODELS;
export declare function getModelById(id: string): {
    key: ModelKey;
    model: typeof AVAILABLE_MODELS[ModelKey];
} | null;
export declare function getModelByKey(key: string): typeof AVAILABLE_MODELS[ModelKey] | null;
export declare function getDefaultModel(): typeof AVAILABLE_MODELS[ModelKey];
//# sourceMappingURL=models.d.ts.map