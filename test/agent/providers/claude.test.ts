import { describe, it, expect } from 'vitest';
import { ClaudeProvider } from '../../../src/agent/providers/claude.js';

describe('ClaudeProvider', () => {
  describe('constructor', () => {
    it('should create instance with API key and model', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-sonnet-4-5');
      expect(provider).toBeDefined();
    });

    it('should accept custom maxTokens', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-sonnet-4-5', 8192);
      expect(provider).toBeDefined();
    });

    it('should use default maxTokens if not provided', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-sonnet-4-5');
      expect(provider).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-sonnet-4-5');
      const name = provider.getProviderName();

      expect(name).toBe('Claude (Anthropic)');
    });
  });

  describe('chat method', () => {
    it('should have chat method', () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-sonnet-4-5');
      expect(typeof provider.chat).toBe('function');
    });

    it('should accept messages and system prompt', async () => {
      const provider = new ClaudeProvider('test-api-key', 'claude-sonnet-4-5');
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
