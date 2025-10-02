/**
 * MCP Server Configuration
 * Defines available MCP security tool servers
 */

import { MCPServerConfig } from './client.js';

/**
 * Available MCP Security Tool Servers
 */
export const MCP_SERVERS: Record<string, MCPServerConfig> = {
  nuclei: {
    name: 'nuclei',
    enabled: process.env.MCP_NUCLEI_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-nuclei'],
    description: 'Vulnerability scanning with 5000+ templates',
  },

  sslscan: {
    name: 'sslscan',
    enabled: process.env.MCP_SSLSCAN_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-sslscan'],
    description: 'SSL/TLS configuration and vulnerability analysis',
  },

  'http-headers': {
    name: 'http-headers',
    enabled: process.env.MCP_HTTP_HEADERS_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-http-headers-security'],
    description: 'HTTP security headers analysis (OWASP)',
  },

  sqlmap: {
    name: 'sqlmap',
    enabled: process.env.MCP_SQLMAP_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-sqlmap'],
    description: 'SQL injection detection and testing',
  },

  nmap: {
    name: 'nmap',
    enabled: process.env.MCP_NMAP_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-nmap'],
    description: 'Network scanning and service detection',
  },

  httpx: {
    name: 'httpx',
    enabled: process.env.MCP_HTTPX_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-httpx'],
    description: 'HTTP probing and technology detection',
  },

  katana: {
    name: 'katana',
    enabled: process.env.MCP_KATANA_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-katana'],
    description: 'Web crawler with JavaScript parsing',
  },

  amass: {
    name: 'amass',
    enabled: process.env.MCP_AMASS_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-amass'],
    description: 'Subdomain enumeration and reconnaissance',
  },

  masscan: {
    name: 'masscan',
    enabled: process.env.MCP_MASSCAN_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-masscan'],
    description: 'Ultra-fast port scanning',
  },

  ffuf: {
    name: 'ffuf',
    enabled: process.env.MCP_FFUF_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-ffuf'],
    description: 'Fast web fuzzer for content discovery',
  },

  mobsf: {
    name: 'mobsf',
    enabled: process.env.MCP_MOBSF_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-mobsf'],
    description: 'Mobile Security Framework for Android/iOS analysis',
  },

  gowitness: {
    name: 'gowitness',
    enabled: process.env.MCP_GOWITNESS_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-gowitness'],
    description: 'Web screenshot and visual reconnaissance',
  },

  wpscan: {
    name: 'wpscan',
    enabled: process.env.MCP_WPSCAN_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-wpscan'],
    description: 'WordPress vulnerability scanner',
  },

  cero: {
    name: 'cero',
    enabled: process.env.MCP_CERO_ENABLED === 'true',
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-cero'],
    description: 'Certificate transparency domain enumeration',
  },
};

/**
 * Get MCP server configuration by name
 */
export function getMCPServer(name: string): MCPServerConfig | undefined {
  return MCP_SERVERS[name];
}

/**
 * Get all enabled MCP servers
 */
export function getEnabledMCPServers(): MCPServerConfig[] {
  return Object.values(MCP_SERVERS).filter(s => s.enabled);
}

/**
 * Check if an MCP server is enabled
 */
export function isMCPServerEnabled(name: string): boolean {
  const server = MCP_SERVERS[name];
  return server ? server.enabled : false;
}

/**
 * Get MCP server capabilities
 */
export interface MCPCapabilities {
  webSecurity: string[];  // Web application security tools
  networkSecurity: string[];  // Network scanning tools
  reconnaissance: string[];  // OSINT and recon tools
  vulnerability: string[];  // Vulnerability scanning tools
}

export const MCP_CAPABILITIES: MCPCapabilities = {
  webSecurity: ['nuclei', 'sslscan', 'http-headers', 'sqlmap', 'httpx', 'katana', 'ffuf', 'wpscan'],
  networkSecurity: ['nmap', 'masscan'],
  reconnaissance: ['amass', 'katana', 'httpx', 'gowitness', 'cero'],
  vulnerability: ['nuclei', 'sqlmap', 'sslscan', 'wpscan', 'mobsf'],
};

/**
 * Get recommended MCP servers for a specific use case
 */
export function getRecommendedMCPServers(useCase: keyof MCPCapabilities): MCPServerConfig[] {
  const serverNames = MCP_CAPABILITIES[useCase] || [];
  return serverNames
    .map(name => MCP_SERVERS[name])
    .filter(s => s && s.enabled);
}