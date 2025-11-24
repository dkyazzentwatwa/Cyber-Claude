/**
 * Vulnerability Cache
 * Local file-based cache for CVE data with 24-hour TTL
 */

import { promises as fs } from 'fs';
import path from 'path';
import { CVEData, CachedVulnerability } from './types.js';
import { logger } from '../../../utils/logger.js';
import os from 'os';

export class VulnCache {
  private cacheDir: string;
  private cacheTTL: number; // milliseconds

  constructor(cacheTTL: number = 24 * 60 * 60 * 1000) { // Default 24 hours
    // Store cache in user's home directory
    this.cacheDir = path.join(os.homedir(), '.cyber-claude', 'vuln-cache');
    this.cacheTTL = cacheTTL;
  }

  /**
   * Initialize cache directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      logger.info(`Vulnerability cache initialized at ${this.cacheDir}`);
    } catch (error: any) {
      logger.error(`Failed to initialize cache directory: ${error.message}`);
    }
  }

  /**
   * Get cache file path for a CVE ID
   */
  private getCacheFilePath(cveId: string): string {
    // Sanitize CVE ID for filename
    const safeCveId = cveId.replace(/[^a-zA-Z0-9-]/g, '_');
    return path.join(this.cacheDir, `${safeCveId}.json`);
  }

  /**
   * Get cached CVE data
   */
  async get(cveId: string): Promise<CVEData | null> {
    try {
      const filePath = this.getCacheFilePath(cveId);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null; // File doesn't exist
      }

      // Read cached data
      const content = await fs.readFile(filePath, 'utf-8');
      const cached: CachedVulnerability = JSON.parse(content);

      // Check if expired
      const expiresAt = new Date(cached.expiresAt);
      if (new Date() > expiresAt) {
        logger.debug(`Cache expired for ${cveId}`);
        // Delete expired cache
        await this.delete(cveId);
        return null;
      }

      // Parse dates back to Date objects
      cached.data.published = new Date(cached.data.published);
      cached.data.lastModified = new Date(cached.data.lastModified);

      logger.debug(`Cache hit for ${cveId}`);
      return cached.data;

    } catch (error: any) {
      logger.error(`Failed to read cache for ${cveId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Store CVE data in cache
   */
  async set(cveId: string, data: CVEData): Promise<void> {
    try {
      await this.initialize(); // Ensure directory exists

      const filePath = this.getCacheFilePath(cveId);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.cacheTTL);

      const cached: CachedVulnerability = {
        cveId,
        data,
        cachedAt: now,
        expiresAt,
      };

      await fs.writeFile(filePath, JSON.stringify(cached, null, 2), 'utf-8');
      logger.debug(`Cached ${cveId} until ${expiresAt.toISOString()}`);

    } catch (error: any) {
      logger.error(`Failed to cache ${cveId}: ${error.message}`);
    }
  }

  /**
   * Delete cached CVE data
   */
  async delete(cveId: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(cveId);
      await fs.unlink(filePath);
      logger.debug(`Deleted cache for ${cveId}`);
    } catch (error: any) {
      // Ignore errors if file doesn't exist
      if (error.code !== 'ENOENT') {
        logger.error(`Failed to delete cache for ${cveId}: ${error.message}`);
      }
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<number> {
    let deletedCount = 0;

    try {
      await this.initialize();

      const files = await fs.readdir(this.cacheDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
          deletedCount++;
        }
      }

      logger.info(`Cleared ${deletedCount} cached entries`);
      return deletedCount;

    } catch (error: any) {
      logger.error(`Failed to clear cache: ${error.message}`);
      return deletedCount;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<number> {
    let deletedCount = 0;

    try {
      await this.initialize();

      const files = await fs.readdir(this.cacheDir);
      const now = new Date();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cacheDir, file);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const cached: CachedVulnerability = JSON.parse(content);
          const expiresAt = new Date(cached.expiresAt);

          if (now > expiresAt) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          // If we can't read the file, delete it
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleared ${deletedCount} expired cache entries`);
      }

      return deletedCount;

    } catch (error: any) {
      logger.error(`Failed to clear expired cache: ${error.message}`);
      return deletedCount;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    cacheSize: number; // in bytes
  }> {
    try {
      await this.initialize();

      const files = await fs.readdir(this.cacheDir);
      let totalEntries = 0;
      let expiredEntries = 0;
      let cacheSize = 0;
      const now = new Date();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        cacheSize += stats.size;
        totalEntries++;

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const cached: CachedVulnerability = JSON.parse(content);
          const expiresAt = new Date(cached.expiresAt);

          if (now > expiresAt) {
            expiredEntries++;
          }
        } catch {
          expiredEntries++;
        }
      }

      return {
        totalEntries,
        expiredEntries,
        cacheSize,
      };

    } catch (error: any) {
      logger.error(`Failed to get cache stats: ${error.message}`);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        cacheSize: 0,
      };
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDirectory(): string {
    return this.cacheDir;
  }
}
