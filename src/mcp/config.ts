/**
 * MCP Server Configuration
 * Defines available MCP security tool servers
 */

import { MCPServerConfig } from './client.js';

/**
 * Available MCP Security Tool Servers
 * NOTE: MCP servers will be added as we discover working implementations
 */
export const MCP_SERVERS: Record<string, MCPServerConfig> = {
  // MCP servers will be populated with actual working packages
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
  webSecurity: [],
  networkSecurity: [],
  reconnaissance: [],
  vulnerability: [],
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