/**
 * Wayback Machine / Archive.org Tool
 * Access historical website snapshots
 * No API key required
 */

import axios from 'axios';
import { WaybackSnapshot, WaybackResult } from './types.js';
import { logger } from '../../../utils/logger.js';

export class Wayback {
  private cdxApiUrl = 'https://web.archive.org/cdx/search/cdx';
  private waybackUrl = 'https://web.archive.org/web';

  /**
   * Get all snapshots for a URL
   */
  async getSnapshots(
    url: string,
    options: {
      limit?: number;
      from?: string; // YYYYMMDD
      to?: string; // YYYYMMDD
      matchType?: 'exact' | 'prefix' | 'host' | 'domain';
    } = {}
  ): Promise<WaybackResult> {
    logger.info(`Fetching Wayback Machine snapshots for: ${url}`);

    const { limit = 100, from, to, matchType = 'exact' } = options;

    try {
      const params: any = {
        url,
        output: 'json',
        limit,
        matchType,
      };

      if (from) params.from = from;
      if (to) params.to = to;

      const response = await axios.get(this.cdxApiUrl, {
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'Cyber-Claude-OSINT/1.0',
        },
      });

      // CDX format: [urlkey, timestamp, original, mimetype, statuscode, digest, length]
      const data = response.data;

      if (!Array.isArray(data) || data.length === 0) {
        return {
          url,
          snapshots: [],
          totalSnapshots: 0,
        };
      }

      // First row is headers
      const headers = data[0];
      const rows = data.slice(1);

      const snapshots: WaybackSnapshot[] = rows.map((row: any[]) => ({
        timestamp: row[1],
        url: row[2],
        status: row[4],
        digest: row[5],
      }));

      const result: WaybackResult = {
        url,
        snapshots,
        totalSnapshots: snapshots.length,
        firstSnapshot: snapshots[0]?.timestamp,
        lastSnapshot: snapshots[snapshots.length - 1]?.timestamp,
      };

      logger.info(
        `Found ${result.totalSnapshots} Wayback Machine snapshots for ${url}`
      );
      return result;
    } catch (error) {
      logger.error(`Wayback Machine lookup failed for ${url}:`, error);

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          url,
          snapshots: [],
          totalSnapshots: 0,
        };
      }

      throw new Error(
        `Wayback Machine lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the most recent snapshot
   */
  async getLatestSnapshot(url: string): Promise<WaybackSnapshot | null> {
    const result = await this.getSnapshots(url, { limit: 1 });
    return result.snapshots[0] || null;
  }

  /**
   * Get the oldest snapshot
   */
  async getOldestSnapshot(url: string): Promise<WaybackSnapshot | null> {
    const result = await this.getSnapshots(url, { limit: 1 });

    if (result.snapshots.length === 0) return null;

    // Get the first snapshot by using from parameter
    const oldest = await this.getSnapshots(url, {
      limit: 1,
      to: result.snapshots[0].timestamp,
    });

    return oldest.snapshots[0] || null;
  }

  /**
   * Get URL to view a specific snapshot
   */
  getSnapshotUrl(snapshot: WaybackSnapshot): string {
    return `${this.waybackUrl}/${snapshot.timestamp}/${snapshot.url}`;
  }

  /**
   * Check if URL has been archived
   */
  async isArchived(url: string): Promise<boolean> {
    const result = await this.getSnapshots(url, { limit: 1 });
    return result.totalSnapshots > 0;
  }

  /**
   * Get snapshots from a specific year
   */
  async getSnapshotsFromYear(url: string, year: number): Promise<WaybackSnapshot[]> {
    const from = `${year}0101`;
    const to = `${year}1231`;

    const result = await this.getSnapshots(url, { from, to, limit: 1000 });
    return result.snapshots;
  }

  /**
   * Compare snapshots (find changes)
   */
  async compareSnapshots(
    url: string,
    timestamp1: string,
    timestamp2: string
  ): Promise<{
    snapshot1: WaybackSnapshot | null;
    snapshot2: WaybackSnapshot | null;
    changed: boolean;
  }> {
    const result = await this.getSnapshots(url, { limit: 1000 });

    const snapshot1 = result.snapshots.find((s) => s.timestamp === timestamp1);
    const snapshot2 = result.snapshots.find((s) => s.timestamp === timestamp2);

    // Different digest means content changed
    const changed =
      snapshot1 && snapshot2 ? snapshot1.digest !== snapshot2.digest : false;

    return {
      snapshot1: snapshot1 || null,
      snapshot2: snapshot2 || null,
      changed,
    };
  }

  /**
   * Get availability summary
   */
  async getAvailabilitySummary(url: string): Promise<{
    firstSeen: string | null;
    lastSeen: string | null;
    totalSnapshots: number;
    yearlyBreakdown: { [year: string]: number };
  }> {
    const result = await this.getSnapshots(url, { limit: 10000 });

    if (result.snapshots.length === 0) {
      return {
        firstSeen: null,
        lastSeen: null,
        totalSnapshots: 0,
        yearlyBreakdown: {},
      };
    }

    const yearlyBreakdown: { [year: string]: number } = {};

    result.snapshots.forEach((snapshot) => {
      const year = snapshot.timestamp.substring(0, 4);
      yearlyBreakdown[year] = (yearlyBreakdown[year] || 0) + 1;
    });

    return {
      firstSeen: result.firstSnapshot || null,
      lastSeen: result.lastSnapshot || null,
      totalSnapshots: result.totalSnapshots,
      yearlyBreakdown,
    };
  }

  /**
   * Format timestamp to human-readable date
   */
  formatTimestamp(timestamp: string): string {
    // Timestamp format: YYYYMMDDhhmmss
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  /**
   * Get historical changes (snapshots with different content)
   */
  async getHistoricalChanges(url: string): Promise<WaybackSnapshot[]> {
    const result = await this.getSnapshots(url, { limit: 10000 });

    const changes: WaybackSnapshot[] = [];
    let lastDigest: string | null = null;

    for (const snapshot of result.snapshots) {
      if (snapshot.digest !== lastDigest) {
        changes.push(snapshot);
        lastDigest = snapshot.digest;
      }
    }

    return changes;
  }

  /**
   * Search archived pages of a domain
   */
  async searchDomain(domain: string, limit: number = 1000): Promise<string[]> {
    const result = await this.getSnapshots(domain, {
      matchType: 'domain',
      limit,
    });

    // Get unique URLs
    const urls = new Set<string>();
    result.snapshots.forEach((snapshot) => urls.add(snapshot.url));

    return Array.from(urls);
  }

  /**
   * Get information about domain's archive presence
   */
  async analyzeDomainHistory(domain: string): Promise<{
    firstArchived: string | null;
    lastArchived: string | null;
    totalSnapshots: number;
    uniquePages: number;
    activeYears: number[];
    archiveHealth: 'excellent' | 'good' | 'poor' | 'none';
  }> {
    const summary = await this.getAvailabilitySummary(domain);
    const uniquePages = (await this.searchDomain(domain, 1000)).length;

    const activeYears = Object.keys(summary.yearlyBreakdown)
      .map((y) => parseInt(y))
      .sort();

    let archiveHealth: 'excellent' | 'good' | 'poor' | 'none' = 'none';

    if (summary.totalSnapshots === 0) {
      archiveHealth = 'none';
    } else if (summary.totalSnapshots > 100) {
      archiveHealth = 'excellent';
    } else if (summary.totalSnapshots > 20) {
      archiveHealth = 'good';
    } else {
      archiveHealth = 'poor';
    }

    return {
      firstArchived: summary.firstSeen,
      lastArchived: summary.lastSeen,
      totalSnapshots: summary.totalSnapshots,
      uniquePages,
      activeYears,
      archiveHealth,
    };
  }
}