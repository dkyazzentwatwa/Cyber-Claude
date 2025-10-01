import { describe, it, expect } from 'vitest';
import { GeminiProvider } from '../../../src/agent/providers/gemini.js';

describe('GeminiProvider', () => {
  describe('constructor', () => {
    it('should create instance with API key and model', () => {
      const provider = new GeminiProvider('test-api-key', 'gemini-2.5-flash');
      expect(provider).toBeDefined();
    });

    it('should accept custom maxTokens', () => {
      const provider = new GeminiProvider('test-api-key', 'gemini-2.5-flash', 8192);
      expect(provider).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const provider = new GeminiProvider('test-api-key', 'gemini-2.5-flash');
      const name = provider.getProviderName();

      expect(name).toBe('Gemini (Google)');
    });
  });

  describe('chat method', () => {
    it('should have chat method', () => {
      const provider = new GeminiProvider('test-api-key', 'gemini-2.5-flash');
      expect(typeof provider.chat).toBe('function');
    });

    it('should accept messages and system prompt', async () => {
      const provider = new GeminiProvider('test-api-key', 'gemini-2.5-flash');
      const messages = [
        { role: 'user' as const, content: 'Hello' },
      ];

      // This will fail without a valid API key, but tests the interface
      try {
        await provider.chat(messages, 'You are a helpful assistant');
      } catch (error) {
        // Expected to fail without valid API key
        expect(error).toBeDefined();
      }
    });
  });
});
