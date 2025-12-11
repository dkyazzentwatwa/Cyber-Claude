/**
 * Web3/Smart Contract Security Types
 * Based on Anthropic's SCONE-bench research findings
 */

import { SecurityFinding, ScanResult } from '../../types.js';

/**
 * Smart Contract Vulnerability Types
 * Mapped to SWC (Smart Contract Weakness Classification) registry
 */
export type Web3VulnType =
  | 'reentrancy'                    // SWC-107
  | 'access-control'                // SWC-115
  | 'integer-overflow'              // SWC-101
  | 'integer-underflow'             // SWC-101
  | 'unprotected-state-modification'
  | 'flash-loan-attack'
  | 'oracle-manipulation'
  | 'front-running'                 // SWC-114
  | 'unchecked-call'                // SWC-104
  | 'delegatecall-injection'        // SWC-112
  | 'tx-origin-auth'                // SWC-115
  | 'self-destruct'                 // SWC-106
  | 'uninitialized-storage'         // SWC-109
  | 'signature-replay'              // SWC-121
  | 'denial-of-service'             // SWC-128
  | 'timestamp-dependence'          // SWC-116
  | 'weak-randomness'               // SWC-120
  | 'gas-griefing'
  // DeFiHackLabs-derived vulnerability types
  | 'precision-loss'                // Rounding errors, division before multiplication
  | 'arbitrary-call'                // Unchecked .call() with user-controlled data
  | 'storage-collision';            // Proxy pattern slot collisions

/**
 * Supported blockchain networks
 */
export type NetworkType =
  | 'mainnet'
  | 'goerli'
  | 'sepolia'
  | 'holesky'
  | 'polygon'
  | 'polygon-mumbai'
  | 'arbitrum'
  | 'arbitrum-goerli'
  | 'optimism'
  | 'optimism-goerli'
  | 'bsc'
  | 'bsc-testnet'
  | 'avalanche'
  | 'avalanche-fuji'
  | 'base'
  | 'base-goerli';

/**
 * Default RPC endpoints for networks
 */
export const DEFAULT_RPC_URLS: Record<NetworkType, string> = {
  'mainnet': 'https://eth.llamarpc.com',
  'goerli': 'https://goerli.infura.io/v3/public',
  'sepolia': 'https://sepolia.infura.io/v3/public',
  'holesky': 'https://holesky.infura.io/v3/public',
  'polygon': 'https://polygon-rpc.com',
  'polygon-mumbai': 'https://rpc-mumbai.maticvigil.com',
  'arbitrum': 'https://arb1.arbitrum.io/rpc',
  'arbitrum-goerli': 'https://goerli-rollup.arbitrum.io/rpc',
  'optimism': 'https://mainnet.optimism.io',
  'optimism-goerli': 'https://goerli.optimism.io',
  'bsc': 'https://bsc-dataseed.binance.org',
  'bsc-testnet': 'https://data-seed-prebsc-1-s1.binance.org:8545',
  'avalanche': 'https://api.avax.network/ext/bc/C/rpc',
  'avalanche-fuji': 'https://api.avax-test.network/ext/bc/C/rpc',
  'base': 'https://mainnet.base.org',
  'base-goerli': 'https://goerli.base.org',
};

/**
 * Contract source input types
 */
export interface ContractSource {
  type: 'file' | 'address' | 'source';
  path?: string;           // For type: 'file'
  address?: string;        // For type: 'address'
  network?: NetworkType;   // For type: 'address'
  code?: string;           // For type: 'source'
  name?: string;           // Contract name
  compiler?: string;       // Solidity compiler version
}

/**
 * Scan options for smart contract analysis
 */
export interface Web3ScanOptions {
  timeout?: number;
  network?: NetworkType;
  rpcUrl?: string;
  onProgress?: (message: string) => void;
  // Scan depth control
  quickScan?: boolean;      // Static patterns only
  fullScan?: boolean;       // Static + external tools
  aggressiveScan?: boolean; // Dynamic testing with Foundry
  // External tool toggles
  useSlither?: boolean;
  useMythril?: boolean;
  useSolhint?: boolean;
  // Foundry options
  forkBlock?: number;
  gasLimit?: number;
  // Analysis options
  maxFindings?: number;
  minSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

/**
 * Parsed contract representation
 */
export interface ParsedContract {
  name: string;
  source: string;
  pragma?: string;
  imports: string[];
  contracts: ContractDefinition[];
  errors: ParseError[];
}

export interface ContractDefinition {
  name: string;
  type: 'contract' | 'interface' | 'library' | 'abstract';
  inherits: string[];
  functions: FunctionDefinition[];
  stateVariables: StateVariable[];
  events: EventDefinition[];
  modifiers: ModifierDefinition[];
  lineStart: number;
  lineEnd: number;
}

export interface FunctionDefinition {
  name: string;
  visibility: 'public' | 'private' | 'internal' | 'external';
  stateMutability: 'pure' | 'view' | 'payable' | 'nonpayable';
  modifiers: string[];
  parameters: Parameter[];
  returnParameters: Parameter[];
  body?: string;
  lineStart: number;
  lineEnd: number;
}

export interface StateVariable {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'internal';
  constant: boolean;
  immutable: boolean;
  lineNumber: number;
}

export interface EventDefinition {
  name: string;
  parameters: Parameter[];
  lineNumber: number;
}

export interface ModifierDefinition {
  name: string;
  parameters: Parameter[];
  lineStart: number;
  lineEnd: number;
}

export interface Parameter {
  name: string;
  type: string;
  indexed?: boolean;
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * DeFiHackLabs exploit reference for real-world context
 */
export interface ExploitReference {
  protocol: string;
  date: string;
  chain: string;
  lossAmount?: string;
  rootCause: string;
  defiHackLabsUrl: string;
  txHash?: string;
}

/**
 * Smart contract security finding
 */
export interface Web3Finding extends SecurityFinding {
  vulnerabilityType: Web3VulnType;
  contractName: string;
  functionName?: string;
  lineNumber?: number;
  lineEnd?: number;
  sourceCode?: string;
  swcId?: string;
  exploitScenario?: string;
  exploitComplexity?: 'low' | 'medium' | 'high';
  gasImpact?: 'low' | 'medium' | 'high';
  // Dynamic testing evidence
  foundryEvidence?: {
    testName: string;
    exploitPOC?: string;
    gasUsed?: number;
    traceOutput?: string;
  };
  // Additional context
  affectedFunctions?: string[];
  relatedVariables?: string[];
  // DeFiHackLabs real-world exploit references
  realWorldExploits?: ExploitReference[];
}

/**
 * External tool analysis result
 */
export interface ExternalToolResult {
  tool: string;
  version: string;
  available: boolean;
  findings: Web3Finding[];
  rawOutput?: string;
  duration: number;
  error?: string;
}

/**
 * Foundry test result
 */
export interface FoundryTestResult {
  testName: string;
  passed: boolean;
  gasUsed?: number;
  exploitSuccessful?: boolean;
  output?: string;
  traces?: string;
  logs?: string[];
}

/**
 * Smart contract scan result
 */
export interface Web3ScanResult extends ScanResult {
  contract: {
    name: string;
    path?: string;
    address?: string;
    network?: NetworkType;
    compiler?: string;
    optimizer?: boolean;
    sourceHash?: string;
    bytecodeHash?: string;
  };
  findings: Web3Finding[];
  // Code metrics
  metrics?: {
    totalLines: number;
    codeLines: number;
    commentLines: number;
    contractCount: number;
    functionCount: number;
    publicFunctions: number;
    externalCalls: number;
    stateVariables: number;
  };
  // Static analysis results
  staticAnalysis?: {
    slither?: ExternalToolResult;
    mythril?: ExternalToolResult;
    solhint?: ExternalToolResult;
  };
  // Dynamic analysis results
  dynamicAnalysis?: {
    foundryTests?: FoundryTestResult[];
    exploitsAttempted: number;
    exploitsSuccessful: number;
    anvilForkBlock?: number;
  };
  // Gas analysis
  gasAnalysis?: {
    totalFunctions: number;
    highGasFunctions: string[];
    estimatedDeployCost?: string;
    optimizationSuggestions?: string[];
  };
}

/**
 * SWC Registry mapping
 */
export const SWC_REGISTRY: Record<string, { title: string; description: string; vulnType: Web3VulnType }> = {
  'SWC-100': { title: 'Function Default Visibility', description: 'Functions without explicit visibility can lead to vulnerabilities', vulnType: 'access-control' },
  'SWC-101': { title: 'Integer Overflow and Underflow', description: 'An overflow/underflow happens when an arithmetic operation reaches bounds', vulnType: 'integer-overflow' },
  'SWC-104': { title: 'Unchecked Call Return Value', description: 'The return value of external calls is not checked', vulnType: 'unchecked-call' },
  'SWC-105': { title: 'Unprotected Ether Withdrawal', description: 'Ether can be withdrawn by unauthorized parties', vulnType: 'access-control' },
  'SWC-106': { title: 'Unprotected SELFDESTRUCT', description: 'Contract can be destroyed by unauthorized parties', vulnType: 'self-destruct' },
  'SWC-107': { title: 'Reentrancy', description: 'External calls can lead to reentrancy attacks', vulnType: 'reentrancy' },
  'SWC-109': { title: 'Uninitialized Storage Pointer', description: 'Storage pointers can point to unexpected locations', vulnType: 'uninitialized-storage' },
  'SWC-112': { title: 'Delegatecall to Untrusted Callee', description: 'Delegatecall can execute arbitrary code', vulnType: 'delegatecall-injection' },
  'SWC-114': { title: 'Transaction Order Dependence', description: 'Contract behavior depends on transaction ordering', vulnType: 'front-running' },
  'SWC-115': { title: 'Authorization through tx.origin', description: 'tx.origin should not be used for authorization', vulnType: 'tx-origin-auth' },
  'SWC-116': { title: 'Block values as Time Proxy', description: 'Block timestamps can be manipulated by miners', vulnType: 'timestamp-dependence' },
  'SWC-120': { title: 'Weak Sources of Randomness', description: 'On-chain randomness can be predicted', vulnType: 'weak-randomness' },
  'SWC-121': { title: 'Missing Protection against Signature Replay', description: 'Signatures can be replayed', vulnType: 'signature-replay' },
  'SWC-128': { title: 'DoS With Block Gas Limit', description: 'Operations may exceed block gas limit', vulnType: 'denial-of-service' },
};

/**
 * Vulnerability detector interface
 */
export interface VulnDetector {
  name: string;
  description: string;
  vulnType: Web3VulnType;
  swcId?: string;
  analyze(parsed: ParsedContract): Promise<Web3Finding[]>;
}
