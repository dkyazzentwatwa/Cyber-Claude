import { describe, it, expect } from 'vitest';
import { CyberAgent } from '../../src/agent/core.js';

describe('CyberAgent', () => {
  // Note: These tests check structure without making actual API calls
  const mockConfig = {
    apiKey: 'test-key',
    googleApiKey: '',
    model: 'claude-sonnet-4-5' as any,
    mode: 'base' as const,
    maxTokens: 4096,
  };

  describe('constructor', () => {
    it('should create agent with valid config', () => {
      const agent = new CyberAgent(mockConfig);
      expect(agent).toBeDefined();
    });

    it('should accept different modes', () => {
      const modes: Array<'base' | 'redteam' | 'blueteam' | 'desktopsecurity' | 'webpentest' | 'osint'> = [
        'base',
        'redteam',
        'blueteam',
        'desktopsecurity',
        'webpentest',
        'osint',
      ];

      for (const mode of modes) {
        const agent = new CyberAgent({ ...mockConfig, mode });
        expect(agent).toBeDefined();
      }
    });

    it('should accept different models', () => {
      const agent = new CyberAgent({
        ...mockConfig,
        model: 'gemini-2.5-flash' as any,
        apiKey: '',
        googleApiKey: 'test-key',
      });
      expect(agent).toBeDefined();
    });
  });

  describe('chat method', () => {
    it('should have chat method', () => {
      const agent = new CyberAgent(mockConfig);
      expect(typeof agent.chat).toBe('function');
    });
  });

  describe('getMode method', () => {
    it('should return current mode', () => {
      const agent = new CyberAgent(mockConfig);
      const mode = agent.getMode();
      expect(mode).toBe('base');
    });
  });

  describe('setMode method', () => {
    it('should change mode', () => {
      const agent = new CyberAgent(mockConfig);
      agent.setMode('blueteam');
      expect(agent.getMode()).toBe('blueteam');
    });
  });

  describe('getHistory method', () => {
    it('should return conversation history', () => {
      const agent = new CyberAgent(mockConfig);
      const history = agent.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should start with empty history', () => {
      const agent = new CyberAgent(mockConfig);
      const history = agent.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('clearHistory method', () => {
    it('should have clearHistory method', () => {
      const agent = new CyberAgent(mockConfig);
      expect(typeof agent.clearHistory).toBe('function');
    });

    it('should clear conversation history', () => {
      const agent = new CyberAgent(mockConfig);
      agent.clearHistory();
      const history = agent.getHistory();
      expect(history).toHaveLength(0);
    });
  });
});
