// Available AI models from multiple providers
export const AVAILABLE_MODELS = {
    // Claude models (Anthropic)
    'opus-4.1': {
        id: 'claude-opus-4-1',
        name: 'Claude Opus 4.1',
        description: 'Most capable model - Best for complex security analysis',
        provider: 'claude',
        recommended: false,
    },
    'opus-4': {
        id: 'claude-opus-4-0',
        name: 'Claude Opus 4',
        description: 'Highly capable - Excellent for thorough analysis',
        provider: 'claude',
        recommended: false,
    },
    'sonnet-4.5': {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        description: 'Latest Sonnet - Balanced performance and speed',
        provider: 'claude',
        recommended: true,
    },
    'sonnet-4': {
        id: 'claude-sonnet-4-0',
        name: 'Claude Sonnet 4',
        description: 'Fast and capable - Great for most tasks',
        provider: 'claude',
        recommended: false,
    },
    'sonnet-3.7': {
        id: 'claude-3-7-sonnet-latest',
        name: 'Claude Sonnet 3.7',
        description: 'Previous generation - Proven and reliable',
        provider: 'claude',
        recommended: false,
    },
    'haiku-3.5': {
        id: 'claude-3-5-haiku-latest',
        name: 'Claude Haiku 3.5',
        description: 'Fastest Claude model - Quick responses',
        provider: 'claude',
        recommended: false,
    },
    // Gemini models (Google)
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Most balanced Gemini model - Fast and capable',
        provider: 'gemini',
        recommended: false,
    },
    'gemini-2.5-pro': {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Most powerful Gemini thinking model',
        provider: 'gemini',
        recommended: false,
    },
    'gemini-2.5-flash-lite': {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Fastest and most cost-efficient Gemini model',
        provider: 'gemini',
        recommended: false,
    },
};
export function getModelById(id) {
    for (const [key, model] of Object.entries(AVAILABLE_MODELS)) {
        if (model.id === id) {
            return { key: key, model };
        }
    }
    return null;
}
export function getModelByKey(key) {
    return AVAILABLE_MODELS[key] || null;
}
export function getDefaultModel() {
    return AVAILABLE_MODELS['sonnet-4.5'];
}
//# sourceMappingURL=models.js.map