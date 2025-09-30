import dotenv from 'dotenv';
dotenv.config();
export const config = {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    safeMode: process.env.SAFE_MODE !== 'false',
    maxTokens: parseInt(process.env.MAX_TOKENS || '4096', 10),
    model: process.env.MODEL || 'claude-sonnet-4-5',
};
export function validateConfig() {
    const errors = [];
    // At least one API key must be provided
    if (!config.anthropicApiKey && !config.googleApiKey) {
        errors.push('At least one API key is required (ANTHROPIC_API_KEY or GOOGLE_API_KEY). Set it in .env file.');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=config.js.map