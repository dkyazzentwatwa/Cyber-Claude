import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_MODELS,
  getModelById,
  getModelByKey,
  getDefaultModel
} from '../../src/utils/models.js';

describe('Models Utility', () => {
  describe('AVAILABLE_MODELS', () => {
    it('should contain all expected models', () => {
      const modelKeys = Object.keys(AVAILABLE_MODELS);

      expect(modelKeys).toContain('opus-4.1');
      expect(modelKeys).toContain('opus-4');
      expect(modelKeys).toContain('sonnet-4.5');
      expect(modelKeys).toContain('sonnet-4');
      expect(modelKeys).toContain('sonnet-3.7');
      expect(modelKeys).toContain('haiku-3.5');
      expect(modelKeys).toContain('gemini-2.5-flash');
      expect(modelKeys).toContain('gemini-2.5-pro');
      expect(modelKeys).toContain('gemini-2.5-flash-lite');
    });

    it('should have correct provider for Claude models', () => {
      expect(AVAILABLE_MODELS['opus-4.1'].provider).toBe('claude');
      expect(AVAILABLE_MODELS['opus-4'].provider).toBe('claude');
      expect(AVAILABLE_MODELS['sonnet-4.5'].provider).toBe('claude');
      expect(AVAILABLE_MODELS['sonnet-4'].provider).toBe('claude');
      expect(AVAILABLE_MODELS['sonnet-3.7'].provider).toBe('claude');
      expect(AVAILABLE_MODELS['haiku-3.5'].provider).toBe('claude');
    });

    it('should have correct provider for Gemini models', () => {
      expect(AVAILABLE_MODELS['gemini-2.5-flash'].provider).toBe('gemini');
      expect(AVAILABLE_MODELS['gemini-2.5-pro'].provider).toBe('gemini');
      expect(AVAILABLE_MODELS['gemini-2.5-flash-lite'].provider).toBe('gemini');
    });

    it('should have all required fields for each model', () => {
      Object.values(AVAILABLE_MODELS).forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.description).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(typeof model.recommended).toBe('boolean');
      });
    });

    it('should have unique model IDs', () => {
      const ids = Object.values(AVAILABLE_MODELS).map(m => m.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have at least one recommended model', () => {
      const recommended = Object.values(AVAILABLE_MODELS).filter(m => m.recommended);

      expect(recommended.length).toBeGreaterThan(0);
    });
  });

  describe('getModelById', () => {
    it('should return model by ID', () => {
      const result = getModelById('claude-sonnet-4-5');

      expect(result).not.toBeNull();
      expect(result?.key).toBe('sonnet-4.5');
      expect(result?.model.id).toBe('claude-sonnet-4-5');
      expect(result?.model.name).toBe('Claude Sonnet 4.5');
    });

    it('should work for Gemini models', () => {
      const result = getModelById('gemini-2.5-flash');

      expect(result).not.toBeNull();
      expect(result?.key).toBe('gemini-2.5-flash');
      expect(result?.model.provider).toBe('gemini');
    });

    it('should return null for invalid ID', () => {
      const result = getModelById('invalid-model-id');

      expect(result).toBeNull();
    });

    it('should be case-sensitive', () => {
      const result = getModelById('CLAUDE-SONNET-4-5');

      expect(result).toBeNull();
    });
  });

  describe('getModelByKey', () => {
    it('should return model by key', () => {
      const model = getModelByKey('sonnet-4.5');

      expect(model).not.toBeNull();
      expect(model?.id).toBe('claude-sonnet-4-5');
      expect(model?.name).toBe('Claude Sonnet 4.5');
    });

    it('should work for all valid keys', () => {
      Object.keys(AVAILABLE_MODELS).forEach(key => {
        const model = getModelByKey(key);
        expect(model).not.toBeNull();
      });
    });

    it('should return null for invalid key', () => {
      const model = getModelByKey('invalid-key');

      expect(model).toBeNull();
    });

    it('should work for Gemini models', () => {
      const model = getModelByKey('gemini-2.5-pro');

      expect(model).not.toBeNull();
      expect(model?.provider).toBe('gemini');
      expect(model?.id).toBe('gemini-2.5-pro');
    });
  });

  describe('getDefaultModel', () => {
    it('should return sonnet-4.5 as default', () => {
      const model = getDefaultModel();

      expect(model.id).toBe('claude-sonnet-4-5');
      expect(model.name).toBe('Claude Sonnet 4.5');
      expect(model.provider).toBe('claude');
    });

    it('should return a recommended model', () => {
      const model = getDefaultModel();

      expect(model.recommended).toBe(true);
    });
  });

  describe('Model Metadata Validation', () => {
    it('should have descriptive names', () => {
      Object.values(AVAILABLE_MODELS).forEach(model => {
        expect(model.name.length).toBeGreaterThan(5);
      });
    });

    it('should have meaningful descriptions', () => {
      Object.values(AVAILABLE_MODELS).forEach(model => {
        expect(model.description.length).toBeGreaterThan(10);
      });
    });

    it('should have valid provider values', () => {
      Object.values(AVAILABLE_MODELS).forEach(model => {
        expect(['claude', 'gemini']).toContain(model.provider);
      });
    });
  });

  describe('Claude Model Naming', () => {
    it('should have correct naming pattern for Claude models', () => {
      expect(AVAILABLE_MODELS['opus-4.1'].id).toBe('claude-opus-4-1');
      expect(AVAILABLE_MODELS['opus-4'].id).toBe('claude-opus-4-0');
      expect(AVAILABLE_MODELS['sonnet-4.5'].id).toBe('claude-sonnet-4-5');
      expect(AVAILABLE_MODELS['sonnet-4'].id).toBe('claude-sonnet-4-0');
    });
  });

  describe('Gemini Model Naming', () => {
    it('should have correct naming pattern for Gemini models', () => {
      expect(AVAILABLE_MODELS['gemini-2.5-flash'].id).toBe('gemini-2.5-flash');
      expect(AVAILABLE_MODELS['gemini-2.5-pro'].id).toBe('gemini-2.5-pro');
      expect(AVAILABLE_MODELS['gemini-2.5-flash-lite'].id).toBe('gemini-2.5-flash-lite');
    });
  });
});
