import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  logLevel: process.env.LOG_LEVEL || 'info',
  safeMode: process.env.SAFE_MODE !== 'false',
  maxTokens: parseInt(process.env.MAX_TOKENS || '4096', 10),
  model: process.env.MODEL || 'claude-sonnet-4-5',
  // Fallback options
  autoFallback: process.env.AUTO_FALLBACK !== 'false', // Default: true
  preferredProvider: process.env.PREFERRED_PROVIDER as 'claude' | 'gemini' | 'ollama' | undefined,
};

export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if any provider is available
  const hasClaudeKey = !!config.anthropicApiKey;
  const hasGeminiKey = !!config.googleApiKey;
  const hasOpenAIKey = !!config.openaiApiKey;

  // Note: Ollama doesn't need API key, just needs to be running
  // We can't check Ollama availability synchronously here

  if (!hasClaudeKey && !hasGeminiKey && !hasOpenAIKey) {
    // Not an error - user might be using Ollama
    warnings.push(
      'No cloud API keys configured (ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY).',
      'If using Ollama for local models, make sure it is running (ollama serve).',
      'Otherwise, set an API key in your .env file.'
    );
  }

  return {
    valid: true, // Config is valid as long as Ollama might be available
    errors,
    warnings,
  };
}

/**
 * Get provider-specific suggestions for setup
 */
export function getSetupSuggestions(): string[] {
  const suggestions: string[] = [];

  if (!config.anthropicApiKey) {
    suggestions.push('Claude: Set ANTHROPIC_API_KEY (https://console.anthropic.com/)');
  }
  if (!config.openaiApiKey) {
    suggestions.push('OpenAI: Set OPENAI_API_KEY (https://platform.openai.com/)');
  }
  if (!config.googleApiKey) {
    suggestions.push('Gemini: Set GOOGLE_API_KEY (https://aistudio.google.com/apikey)');
  }
  suggestions.push('Ollama: Free local models - https://ollama.com');

  return suggestions;
}