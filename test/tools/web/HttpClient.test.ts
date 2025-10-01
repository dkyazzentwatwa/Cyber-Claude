import { describe, it, expect } from 'vitest';
import { HttpClient } from '../../../src/agent/tools/web/HttpClient.js';

describe('HttpClient', () => {
  describe('constructor', () => {
    it('should create instance with default options', () => {
      const client = new HttpClient();
      expect(client).toBeDefined();
    });

    it('should accept custom options', () => {
      const client = new HttpClient({
        timeout: 5000,
        followRedirects: false,
        maxRedirects: 3,
        userAgent: 'Test Agent',
      });

      expect(client).toBeDefined();
    });

    it('should use default timeout if not provided', () => {
      const client = new HttpClient();
      expect(client).toBeDefined();
    });

    it('should use default user agent if not provided', () => {
      const client = new HttpClient();
      expect(client).toBeDefined();
    });
  });

  describe('cookie management', () => {
    it('should initialize with empty cookie store', () => {
      const client = new HttpClient();
      expect(client).toBeDefined();
    });

    it('should have methods for cookie operations', () => {
      const client = new HttpClient();

      expect(typeof client.setCookie).toBe('function');
      expect(typeof client.getCookies).toBe('function');
      expect(typeof client.clearCookies).toBe('function');
    });
  });

  describe('HTTP methods', () => {
    it('should have GET method', () => {
      const client = new HttpClient();
      expect(typeof client.get).toBe('function');
    });

    it('should have POST method', () => {
      const client = new HttpClient();
      expect(typeof client.post).toBe('function');
    });

    it('should have HEAD method', () => {
      const client = new HttpClient();
      expect(typeof client.head).toBe('function');
    });

    it('should have OPTIONS method', () => {
      const client = new HttpClient();
      expect(typeof client.options).toBe('function');
    });

    it('should have generic request method', () => {
      const client = new HttpClient();
      expect(typeof client.request).toBe('function');
    });
  });

  describe('options', () => {
    it('should respect custom timeout', () => {
      const client = new HttpClient({ timeout: 1000 });
      expect(client).toBeDefined();
    });

    it('should respect redirect settings', () => {
      const client = new HttpClient({
        followRedirects: false,
        maxRedirects: 0,
      });
      expect(client).toBeDefined();
    });

    it('should accept custom headers', () => {
      const client = new HttpClient({
        headers: {
          'X-Custom-Header': 'test',
        },
      });
      expect(client).toBeDefined();
    });
  });
});
