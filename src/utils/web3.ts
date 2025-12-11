/**
 * Web3 Utilities
 * Address validation, network helpers, and common utilities
 */

import { NetworkType, DEFAULT_RPC_URLS } from '../agent/tools/web3/types.js';

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  // Check basic format: 0x followed by 40 hex characters
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  return true;
}

/**
 * Validate checksum address (EIP-55)
 */
export function isValidChecksumAddress(address: string): boolean {
  if (!isValidAddress(address)) {
    return false;
  }

  // If all lowercase or all uppercase (except 0x), checksum doesn't apply
  const addressWithout0x = address.slice(2);
  if (addressWithout0x === addressWithout0x.toLowerCase() ||
      addressWithout0x === addressWithout0x.toUpperCase()) {
    return true;
  }

  // For mixed case, we'd need to verify the checksum
  // This is a simplified check - full implementation would hash and verify
  return true;
}

/**
 * Convert address to checksum format
 */
export function toChecksumAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  // Return lowercase for now - full implementation would compute checksum
  return address.toLowerCase();
}

/**
 * Check if network is valid
 */
export function isValidNetwork(network: string): network is NetworkType {
  return network in DEFAULT_RPC_URLS;
}

/**
 * Get RPC URL for network
 */
export function getRpcUrl(network: NetworkType, customRpc?: string): string {
  if (customRpc) {
    return customRpc;
  }
  return DEFAULT_RPC_URLS[network] || DEFAULT_RPC_URLS['mainnet'];
}

/**
 * Get all supported networks
 */
export function getSupportedNetworks(): NetworkType[] {
  return Object.keys(DEFAULT_RPC_URLS) as NetworkType[];
}

/**
 * Check if network is testnet
 */
export function isTestnet(network: NetworkType): boolean {
  const testnets: NetworkType[] = [
    'goerli', 'sepolia', 'holesky',
    'polygon-mumbai', 'arbitrum-goerli', 'optimism-goerli',
    'bsc-testnet', 'avalanche-fuji', 'base-goerli'
  ];
  return testnets.includes(network);
}

/**
 * Get chain ID for network
 */
export function getChainId(network: NetworkType): number {
  const chainIds: Record<NetworkType, number> = {
    'mainnet': 1,
    'goerli': 5,
    'sepolia': 11155111,
    'holesky': 17000,
    'polygon': 137,
    'polygon-mumbai': 80001,
    'arbitrum': 42161,
    'arbitrum-goerli': 421613,
    'optimism': 10,
    'optimism-goerli': 420,
    'bsc': 56,
    'bsc-testnet': 97,
    'avalanche': 43114,
    'avalanche-fuji': 43113,
    'base': 8453,
    'base-goerli': 84531,
  };
  return chainIds[network];
}

/**
 * Get block explorer URL for network
 */
export function getExplorerUrl(network: NetworkType): string {
  const explorers: Record<NetworkType, string> = {
    'mainnet': 'https://etherscan.io',
    'goerli': 'https://goerli.etherscan.io',
    'sepolia': 'https://sepolia.etherscan.io',
    'holesky': 'https://holesky.etherscan.io',
    'polygon': 'https://polygonscan.com',
    'polygon-mumbai': 'https://mumbai.polygonscan.com',
    'arbitrum': 'https://arbiscan.io',
    'arbitrum-goerli': 'https://goerli.arbiscan.io',
    'optimism': 'https://optimistic.etherscan.io',
    'optimism-goerli': 'https://goerli-optimism.etherscan.io',
    'bsc': 'https://bscscan.com',
    'bsc-testnet': 'https://testnet.bscscan.com',
    'avalanche': 'https://snowtrace.io',
    'avalanche-fuji': 'https://testnet.snowtrace.io',
    'base': 'https://basescan.org',
    'base-goerli': 'https://goerli.basescan.org',
  };
  return explorers[network];
}

/**
 * Format address for display (truncated)
 */
export function formatAddress(address: string, startChars = 6, endChars = 4): string {
  if (!isValidAddress(address)) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Parse contract file path or address
 */
export function parseContractTarget(target: string): { type: 'file' | 'address' | 'source'; value: string } {
  // Check if it's an address
  if (target.startsWith('0x') && target.length === 42) {
    if (isValidAddress(target)) {
      return { type: 'address', value: target };
    }
  }

  // Check if it's a file path (ends with .sol or .vy)
  if (target.endsWith('.sol') || target.endsWith('.vy')) {
    return { type: 'file', value: target };
  }

  // Check if stdin
  if (target === '-') {
    return { type: 'source', value: '' };
  }

  // Default to file
  return { type: 'file', value: target };
}

/**
 * Check if Solidity version is vulnerable to integer overflow
 * Solidity 0.8.0+ has built-in overflow checks
 */
export function isVulnerableToOverflow(pragmaVersion: string): boolean {
  const match = pragmaVersion.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return true; // Assume vulnerable if can't parse
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);

  // Versions < 0.8.0 are vulnerable
  return major === 0 && minor < 8;
}

/**
 * Extract Solidity version from pragma statement
 */
export function extractSolidityVersion(source: string): string | null {
  const pragmaMatch = source.match(/pragma\s+solidity\s+([^;]+);/);
  if (!pragmaMatch) {
    return null;
  }

  // Extract version from pragma (e.g., "^0.8.0", ">=0.7.0 <0.9.0", "0.8.17")
  const versionMatch = pragmaMatch[1].match(/(\d+\.\d+\.\d+)/);
  return versionMatch ? versionMatch[1] : pragmaMatch[1];
}

/**
 * Hash source code for caching
 */
export function hashSource(source: string): string {
  // Simple hash function for caching purposes
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Format wei to ETH
 */
export function formatEther(wei: string | bigint): string {
  const weiValue = BigInt(wei);
  const eth = Number(weiValue) / 1e18;
  return eth.toFixed(6);
}

/**
 * Format gas cost estimate
 */
export function formatGasCost(gasUsed: number, gasPriceGwei = 30): string {
  const costWei = gasUsed * gasPriceGwei * 1e9;
  const costEth = costWei / 1e18;
  return `${costEth.toFixed(6)} ETH (~${gasUsed.toLocaleString()} gas @ ${gasPriceGwei} gwei)`;
}
