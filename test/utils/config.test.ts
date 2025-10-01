import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { config, validateConfig } from '../../src/utils/config.js';

describe('Config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('config object', () => {
    it('should have all required configuration fields', () => {
      expect(config).toHaveProperty('anthropicApiKey');
      expect(config).toHaveProperty('googleApiKey');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('safeMode');
      expect(config).toHaveProperty('maxTokens');
      expect(config).toHaveProperty('model');
    });

    it('should use environment variables when available', () => {
      // Config is loaded once at module import, so we test the structure
      expect(typeof config.anthropicApiKey).toBe('string');
      expect(typeof config.googleApiKey).toBe('string');
      expect(typeof config.logLevel).toBe('string');
      expect(typeof config.safeMode).toBe('boolean');
      expect(typeof config.maxTokens).toBe('number');
      expect(typeof config.model).toBe('string');
    });

    it('should have default values', () => {
      // These are the defaults unless environment overrides them
      expect(['info', 'debug', 'warn', 'error']).toContain(config.logLevel);
      expect(typeof config.safeMode).toBe('boolean');
      expect(config.maxTokens).toBeGreaterThan(0);
      expect(config.model).toBeTruthy();
    });
  });

  describe('validateConfig', () => {
    it('should validate when at least Anthropic API key is present', () => {
      // Save current values
      const currentAnthropic = config.anthropicApiKey;
      const currentGoogle = config.googleApiKey;

      // Simulate having Anthropic key
      (config as any).anthropicApiKey = 'sk-ant-test123';
      (config as any).googleApiKey = '';

      const result = validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Restore
      (config as any).anthropicApiKey = currentAnthropic;
      (config as any).googleApiKey = currentGoogle;
    });

    it('should validate when at least Google API key is present', () => {
      const currentAnthropic = config.anthropicApiKey;
      const currentGoogle = config.googleApiKey;

      (config as any).anthropicApiKey = '';
      (config as any).googleApiKey = 'AIzaTest123';

      const result = validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      (config as any).anthropicApiKey = currentAnthropic;
      (config as any).googleApiKey = currentGoogle;
    });

    it('should validate when both API keys are present', () => {
      const currentAnthropic = config.anthropicApiKey;
      const currentGoogle = config.googleApiKey;

      (config as any).anthropicApiKey = 'sk-ant-test123';
      (config as any).googleApiKey = 'AIzaTest123';

      const result = validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      (config as any).anthropicApiKey = currentAnthropic;
      (config as any).googleApiKey = currentGoogle;
    });

    it('should fail validation when no API keys are present', () => {
      const currentAnthropic = config.anthropicApiKey;
      const currentGoogle = config.googleApiKey;

      (config as any).anthropicApiKey = '';
      (config as any).googleApiKey = '';

      const result = validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('At least one API key is required');

      (config as any).anthropicApiKey = currentAnthropic;
      (config as any).googleApiKey = currentGoogle;
    });

    it('should provide helpful error message', () => {
      const currentAnthropic = config.anthropicApiKey;
      const currentGoogle = config.googleApiKey;

      (config as any).anthropicApiKey = '';
      (config as any).googleApiKey = '';

      const result = validateConfig();

      expect(result.errors[0]).toContain('ANTHROPIC_API_KEY');
      expect(result.errors[0]).toContain('GOOGLE_API_KEY');
      expect(result.errors[0]).toContain('.env');

      (config as any).anthropicApiKey = currentAnthropic;
      (config as any).googleApiKey = currentGoogle;
    });
  });

  describe('maxTokens parsing', () => {
    it('should parse maxTokens as integer', () => {
      expect(Number.isInteger(config.maxTokens)).toBe(true);
    });

    it('should have reasonable default for maxTokens', () => {
      expect(config.maxTokens).toBeGreaterThan(0);
      expect(config.maxTokens).toBeLessThanOrEqual(100000);
    });
  });

  describe('safeMode flag', () => {
    it('should be boolean', () => {
      expect(typeof config.safeMode).toBe('boolean');
    });
  });

  describe('default model', () => {
    it('should have a default model', () => {
      expect(config.model).toBeTruthy();
      expect(config.model.length).toBeGreaterThan(0);
    });
  });
});
