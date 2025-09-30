/**
 * Nmap MCP Adapter
 * Network scanning and service detection
 */

import { callMCPTool } from '../client.js';
import { getMCPServer } from '../config.js';
import { logger } from '../../utils/logger.js';

export interface NmapScanOptions {
  target: string;  // IP, hostname, or CIDR range
  ports?: string;  // e.g., "80,443" or "1-1000" or "top-100"
  scanType?: 'fast' | 'full' | 'stealth' | 'service' | 'os';
  scripts?: string[];  // NSE scripts to run
  aggressive?: boolean;  // -A flag
  timeout?: number;  // seconds
}

export interface NmapPort {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service: string;
  version?: string;
  product?: string;
  cpe?: string[];
}

export interface NmapHost {
  ip: string;
  hostname?: string;
  state: 'up' | 'down';
  os?: {
    name: string;
    accuracy: number;
    cpe?: string;
  };
  ports: NmapPort[];
  scripts?: Record<string, string>;
}

export interface NmapScanResult {
  success: boolean;
  hosts: NmapHost[];
  summary: {
    hostsUp: number;
    hostsDown: number;
    totalPorts: number;
    openPorts: number;
  };
  scanDuration: number;
  command?: string;
  error?: string;
}

/**
 * Nmap MCP Tool Adapter
 */
export class NmapMCP {
  /**
   * Run Nmap network scan
   */
  static async scan(options: NmapScanOptions): Promise<NmapScanResult> {
    const config = getMCPServer('nmap');
    if (!config || !config.enabled) {
      throw new Error('Nmap MCP server is not enabled. Set MCP_NMAP_ENABLED=true');
    }

    try {
      logger.info(`Running Nmap scan on ${options.target}`);

      const result = await callMCPTool(config, 'scan', {
        target: options.target,
        ports: options.ports || 'top-1000',
        'scan-type': options.scanType || 'fast',
        scripts: options.scripts,
        aggressive: options.aggressive || false,
        timeout: options.timeout || 300,
      });

      return this.parseNmapResult(result);
    } catch (error: any) {
      logger.error('Nmap scan failed:', error);
      return {
        success: false,
        hosts: [],
        summary: { hostsUp: 0, hostsDown: 0, totalPorts: 0, openPorts: 0 },
        scanDuration: 0,
        error: error.message,
      };
    }
  }

  /**
   * Parse Nmap MCP result
   */
  private static parseNmapResult(result: any): NmapScanResult {
    let data: any = {};

    if (result.content && result.content[0]?.text) {
      try {
        data = JSON.parse(result.content[0].text);
      } catch {
        // Failed to parse
      }
    }

    const hosts: NmapHost[] = (data.hosts || []).map((h: any) => ({
      ip: h.ip,
      hostname: h.hostname,
      state: h.state || 'up',
      os: h.os ? {
        name: h.os.name,
        accuracy: h.os.accuracy || 0,
        cpe: h.os.cpe,
      } : undefined,
      ports: (h.ports || []).map((p: any) => ({
        port: p.port,
        protocol: p.protocol || 'tcp',
        state: p.state,
        service: p.service || 'unknown',
        version: p.version,
        product: p.product,
        cpe: p.cpe,
      })),
      scripts: h.scripts,
    }));

    const hostsUp = hosts.filter(h => h.state === 'up').length;
    const hostsDown = hosts.filter(h => h.state === 'down').length;
    const totalPorts = hosts.reduce((sum, h) => sum + h.ports.length, 0);
    const openPorts = hosts.reduce((sum, h) => sum + h.ports.filter(p => p.state === 'open').length, 0);

    return {
      success: !result.isError,
      hosts,
      summary: {
        hostsUp,
        hostsDown,
        totalPorts,
        openPorts,
      },
      scanDuration: data.duration || 0,
      command: data.command,
    };
  }

  /**
   * Check if Nmap is available
   */
  static isAvailable(): boolean {
    const config = getMCPServer('nmap');
    return config !== undefined && config.enabled;
  }
}