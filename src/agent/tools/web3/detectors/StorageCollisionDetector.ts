/**
 * Storage Collision Detector
 *
 * Detects storage collision vulnerabilities in proxy patterns:
 * - Missing __gap in upgradeable contracts
 * - Non-EIP-1967 compliant storage slots
 * - Inherited contract storage ordering issues
 * - Proxy without proper slot separation
 *
 * Based on DeFiHackLabs exploit patterns (Audius, Furucombo)
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';
import { getExploitReferences } from '../exploits/index.js';

export class StorageCollisionDetector implements VulnDetector {
  name = 'Storage Collision Detector';
  description = 'Detects storage collision vulnerabilities in proxy and upgradeable patterns';
  vulnType: Web3VulnType = 'storage-collision';

  // Proxy pattern indicators
  private proxyPatterns = [
    /delegatecall/i,
    /proxy/i,
    /upgradeable/i,
    /implementation/i,
    /fallback\s*\(\s*\)/i,
    /\_fallback\s*\(/i,
  ];

  // EIP-1967 compliant storage slot patterns
  private eip1967Patterns = [
    /0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc/i, // Implementation slot
    /0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103/i, // Admin slot
    /0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50/i, // Beacon slot
    /EIP1967/i,
    /IMPLEMENTATION_SLOT/i,
    /ADMIN_SLOT/i,
  ];

  // Upgrade gap patterns
  private gapPatterns = [
    /__gap/i,
    /\[\s*\d+\s*\]\s*private\s+__gap/i,
    /uint256\s*\[\s*\d+\s*\]/,
  ];

  // Storage pointer patterns (potential issues)
  private storagePointerPatterns = [
    /storage\s+\w+\s*=/g,
    /assembly\s*\{[^}]*sstore/gi,
    /assembly\s*\{[^}]*sload/gi,
  ];

  // Custom storage slot patterns (need validation)
  private customSlotPatterns = [
    /bytes32\s+(?:constant|immutable)\s+\w*[Ss]lot/g,
    /keccak256\s*\(\s*["'][^"']+["']\s*\)/g,
  ];

  // Initializable patterns
  private initializablePatterns = [
    /initializer\b/i,
    /initialize\s*\(/i,
    /Initializable/i,
    /_initialized/i,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    // Get real-world exploit references
    const exploitRefs = getExploitReferences('storage-collision', 2);

    for (const contract of parsed.contracts) {
      const contractSource = this.getContractSource(parsed.source, contract);

      // Detect if this is a proxy or upgradeable contract
      const isProxy = this.isProxyContract(contractSource, contract);
      const isUpgradeable = this.isUpgradeableContract(contractSource, contract);

      if (!isProxy && !isUpgradeable) {
        continue; // Skip non-proxy contracts
      }

      // Check for EIP-1967 compliance
      if (isProxy && !this.hasEIP1967Slots(contractSource)) {
        findings.push({
          id: uuidv4(),
          severity: 'high',
          title: 'Non-EIP-1967 Compliant Proxy',
          description: `Contract '${contract.name}' appears to be a proxy but does not use EIP-1967 standard storage slots. This can lead to storage collisions with implementation contracts.`,
          remediation: `Use EIP-1967 standard storage slots for implementation, admin, and beacon addresses. Consider using OpenZeppelin's proxy contracts which are EIP-1967 compliant.`,
          references: [
            'https://eips.ethereum.org/EIPS/eip-1967',
            'https://docs.openzeppelin.com/contracts/4.x/api/proxy',
          ],
          category: 'smart-contract',
          timestamp: new Date(),
          evidence: {
            isProxy: true,
            hasEIP1967: false,
            proxyIndicators: this.proxyPatterns.filter(p => p.test(contractSource)).map(p => p.source),
          },
          vulnerabilityType: 'storage-collision',
          contractName: contract.name,
          lineNumber: contract.lineStart,
          exploitScenario: `If the proxy's implementation storage slot collides with a state variable in the implementation contract, an attacker could potentially overwrite the implementation address by manipulating that state variable, taking control of the proxy.`,
          exploitComplexity: 'high',
          realWorldExploits: exploitRefs,
        });
      }

      // Check for missing __gap in upgradeable contracts
      if (isUpgradeable && !this.hasStorageGap(contractSource)) {
        findings.push({
          id: uuidv4(),
          severity: 'medium',
          title: 'Missing Storage Gap in Upgradeable Contract',
          description: `Upgradeable contract '${contract.name}' does not define a __gap array. This can cause storage collisions when new state variables are added in upgrades.`,
          remediation: `Add a storage gap at the end of the contract: uint256[50] private __gap; Reduce the gap size when adding new state variables.`,
          references: [
            'https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps',
          ],
          category: 'smart-contract',
          timestamp: new Date(),
          evidence: {
            isUpgradeable: true,
            hasGap: false,
            stateVariableCount: contract.stateVariables.length,
          },
          vulnerabilityType: 'storage-collision',
          contractName: contract.name,
          lineNumber: contract.lineStart,
          exploitScenario: `When upgrading the contract and adding new state variables, existing storage slots in derived contracts can be overwritten, corrupting their state. This can lead to fund loss or contract malfunction.`,
          exploitComplexity: 'medium',
        });
      }

      // Check for uninitialized proxy implementations
      if (isProxy && this.hasInitializable(contractSource)) {
        const hasInitializerCheck = /initialized|_initializing|initializer/i.test(contractSource);
        if (!hasInitializerCheck) {
          findings.push({
            id: uuidv4(),
            severity: 'critical',
            title: 'Potentially Uninitialized Proxy Implementation',
            description: `Proxy contract '${contract.name}' uses Initializable pattern but may not properly protect against uninitialized implementation exploitation.`,
            remediation: `Ensure the implementation contract is initialized during deployment or has a constructor that disables initializers. Use OpenZeppelin's _disableInitializers() in the constructor.`,
            references: [
              'https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable',
              'https://github.com/SunWeb3Sec/DeFiHackLabs',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              hasInitializable: true,
            },
            vulnerabilityType: 'storage-collision',
            contractName: contract.name,
            lineNumber: contract.lineStart,
            exploitScenario: `An attacker can call the initialize function directly on the implementation contract (not through proxy). If the implementation holds state or has privileged functions, this can be exploited to take control or drain funds.`,
            exploitComplexity: 'low',
            realWorldExploits: exploitRefs,
          });
        }
      }

      // Check for raw assembly storage operations
      const storageOps = this.findStorageOperations(contractSource);
      if (storageOps.length > 0 && !this.hasEIP1967Slots(contractSource)) {
        for (const op of storageOps) {
          findings.push({
            id: uuidv4(),
            severity: 'medium',
            title: 'Raw Storage Operation Without Standard Slot',
            description: `Contract '${contract.name}' uses raw assembly storage operations without EIP-1967 standard slots. This requires careful slot management to avoid collisions.`,
            remediation: `Use keccak256 hash of a unique string to derive storage slots, following the pattern: bytes32 slot = keccak256("domain.namespace.variable");`,
            references: [
              'https://eips.ethereum.org/EIPS/eip-1967',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              operation: op,
            },
            vulnerabilityType: 'storage-collision',
            contractName: contract.name,
            lineNumber: contract.lineStart,
            exploitScenario: `Raw storage operations can accidentally overwrite critical storage slots if the slot calculation collides with normal state variables or EIP-1967 slots.`,
            exploitComplexity: 'medium',
          });
        }
      }

      // Check for storage ordering issues in inheritance
      if (contract.inherits.length > 0 && contract.stateVariables.length > 0) {
        const hasUnsafeOrdering = this.checkInheritanceOrdering(contract);
        if (hasUnsafeOrdering) {
          findings.push({
            id: uuidv4(),
            severity: 'medium',
            title: 'Potential Storage Ordering Issue in Inheritance',
            description: `Contract '${contract.name}' inherits from multiple contracts and defines state variables. The order of inheritance affects storage layout.`,
            remediation: `Ensure consistent inheritance order across all upgrades. Document the expected storage layout. Consider using explicit storage slots for critical variables.`,
            references: [
              'https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              inherits: contract.inherits,
              stateVariables: contract.stateVariables.map(v => v.name),
            },
            vulnerabilityType: 'storage-collision',
            contractName: contract.name,
            lineNumber: contract.lineStart,
            exploitScenario: `If inheritance order is changed in an upgrade, state variables may be stored in different slots, causing corruption of existing data.`,
            exploitComplexity: 'high',
          });
        }
      }
    }

    return findings;
  }

  private getContractSource(fullSource: string, contract: { lineStart: number; lineEnd: number }): string {
    const lines = fullSource.split('\n');
    return lines.slice(contract.lineStart - 1, contract.lineEnd).join('\n');
  }

  private isProxyContract(source: string, contract: { inherits: string[] }): boolean {
    // Check inheritance
    if (contract.inherits.some(i => /proxy|upgradeable/i.test(i))) {
      return true;
    }

    // Check for proxy patterns in source
    return this.proxyPatterns.some(p => p.test(source));
  }

  private isUpgradeableContract(source: string, contract: { inherits: string[] }): boolean {
    // Check inheritance
    if (contract.inherits.some(i => /upgradeable|initializable/i.test(i))) {
      return true;
    }

    // Check for initializable patterns
    return this.initializablePatterns.some(p => p.test(source));
  }

  private hasEIP1967Slots(source: string): boolean {
    return this.eip1967Patterns.some(p => p.test(source));
  }

  private hasStorageGap(source: string): boolean {
    return this.gapPatterns.some(p => p.test(source));
  }

  private hasInitializable(source: string): boolean {
    return this.initializablePatterns.some(p => p.test(source));
  }

  private findStorageOperations(source: string): string[] {
    const operations: string[] = [];
    for (const pattern of this.storagePointerPatterns) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;
      while ((match = regex.exec(source)) !== null) {
        operations.push(match[0]);
      }
    }
    return operations;
  }

  private checkInheritanceOrdering(contract: { inherits: string[]; stateVariables: Array<{ name: string }> }): boolean {
    // Flag if contract has multiple inheritance with state variables
    // This is a heuristic - real analysis would require full AST
    return contract.inherits.length >= 2 && contract.stateVariables.length > 0;
  }
}
