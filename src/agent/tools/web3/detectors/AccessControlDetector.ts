/**
 * Access Control Vulnerability Detector
 * SWC-115: Authorization through tx.origin
 * SWC-105: Unprotected Ether Withdrawal
 *
 * Detects missing or weak access control patterns in smart contracts.
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';

export class AccessControlDetector implements VulnDetector {
  name = 'Access Control Detector';
  description = 'Detects missing or weak access control patterns (SWC-105, SWC-115)';
  vulnType: Web3VulnType = 'access-control';
  swcId = 'SWC-115';

  // Sensitive operations that should be protected
  private sensitiveOperations = [
    /selfdestruct\s*\(/g,
    /suicide\s*\(/g,
    /\.transfer\s*\(/g,
    /\.send\s*\(/g,
    /\.call\s*\{[^}]*value/g,
    /withdraw/gi,
    /setOwner/gi,
    /changeOwner/gi,
    /transferOwnership/gi,
    /mint\s*\(/gi,
    /burn\s*\(/gi,
    /pause\s*\(/gi,
    /unpause\s*\(/gi,
    /upgrade/gi,
    /setImplementation/gi,
    /setAdmin/gi,
  ];

  // Access control modifiers
  private accessControlModifiers = [
    'onlyOwner',
    'onlyAdmin',
    'onlyRole',
    'onlyMinter',
    'onlyPauser',
    'onlyGovernance',
    'onlyAuthorized',
    'requiresAuth',
    'auth',
    'restricted',
  ];

  // Patterns for tx.origin usage (bad practice)
  private txOriginPatterns = [
    /tx\.origin\s*==\s*/g,
    /require\s*\([^)]*tx\.origin/g,
    /if\s*\([^)]*tx\.origin/g,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    for (const contract of parsed.contracts) {
      // Check for tx.origin usage
      const txOriginFindings = this.detectTxOriginUsage(parsed.source, contract.name);
      findings.push(...txOriginFindings);

      for (const func of contract.functions) {
        // Only check public/external functions
        if (func.visibility !== 'public' && func.visibility !== 'external') {
          continue;
        }

        // Skip view/pure functions
        if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
          continue;
        }

        // Skip constructor
        if (func.name === 'constructor' || func.name === '') {
          continue;
        }

        const funcBody = func.body || '';

        // Check if function has sensitive operations
        const hasSensitiveOp = this.hasSensitiveOperation(funcBody, func.name);

        if (hasSensitiveOp) {
          // Check if function has access control
          const hasAccessControl = this.hasAccessControl(func.modifiers, funcBody);

          if (!hasAccessControl) {
            findings.push({
              id: uuidv4(),
              severity: 'critical',
              title: 'Missing Access Control',
              description: `Function '${func.name}' in contract '${contract.name}' performs sensitive operations (${hasSensitiveOp}) but lacks access control modifiers.`,
              remediation: `Add access control modifiers (e.g., onlyOwner, onlyRole) to restrict access. Consider using OpenZeppelin's AccessControl or Ownable contracts.`,
              references: [
                'https://swcregistry.io/docs/SWC-105',
                'https://docs.openzeppelin.com/contracts/4.x/access-control',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                sensitiveOperation: hasSensitiveOp,
                visibility: func.visibility,
                modifiers: func.modifiers,
              },
              vulnerabilityType: 'access-control',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              swcId: 'SWC-105',
              exploitScenario: `Any user can call ${func.name}() and perform ${hasSensitiveOp}. An attacker could drain funds, change ownership, or destroy the contract.`,
              exploitComplexity: 'low',
            });
          }
        }
      }
    }

    return findings;
  }

  private hasSensitiveOperation(funcBody: string, funcName: string): string | null {
    // Check function name for sensitive operations
    for (const pattern of this.sensitiveOperations) {
      if (pattern.test(funcName) || pattern.test(funcBody)) {
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        return pattern.source.replace(/\\/g, '').replace(/[()gi]/g, '');
      }
    }
    return null;
  }

  private hasAccessControl(modifiers: string[], funcBody: string): boolean {
    // Check modifiers
    for (const mod of modifiers) {
      if (this.accessControlModifiers.some(ac =>
        mod.toLowerCase().includes(ac.toLowerCase())
      )) {
        return true;
      }
    }

    // Check for inline access control
    const inlinePatterns = [
      /require\s*\(\s*msg\.sender\s*==\s*owner/i,
      /require\s*\(\s*owner\s*==\s*msg\.sender/i,
      /require\s*\(\s*hasRole/i,
      /require\s*\(\s*isOwner/i,
      /require\s*\(\s*_msgSender\(\)\s*==\s*owner/i,
      /if\s*\(\s*msg\.sender\s*!=\s*owner\s*\)/i,
      /onlyOwner/i,
    ];

    for (const pattern of inlinePatterns) {
      if (pattern.test(funcBody)) {
        return true;
      }
    }

    return false;
  }

  private detectTxOriginUsage(source: string, contractName: string): Web3Finding[] {
    const findings: Web3Finding[] = [];

    for (const pattern of this.txOriginPatterns) {
      let match;
      const regex = new RegExp(pattern.source, 'g');
      while ((match = regex.exec(source)) !== null) {
        // Find line number
        const lineNumber = source.substring(0, match.index).split('\n').length;

        findings.push({
          id: uuidv4(),
          severity: 'high',
          title: 'tx.origin Used for Authorization',
          description: `Contract '${contractName}' uses tx.origin for authorization. This is vulnerable to phishing attacks where a malicious contract can trick the original transaction sender.`,
          remediation: `Replace tx.origin with msg.sender for authorization checks. tx.origin should never be used for authentication.`,
          references: [
            'https://swcregistry.io/docs/SWC-115',
            'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/tx-origin/',
          ],
          category: 'smart-contract',
          timestamp: new Date(),
          evidence: {
            match: match[0],
            pattern: 'tx.origin authorization',
          },
          vulnerabilityType: 'tx-origin-auth',
          contractName,
          lineNumber,
          swcId: 'SWC-115',
          exploitScenario: `An attacker can create a malicious contract that calls functions in this contract. When a user interacts with the attacker's contract, tx.origin will be the user's address, bypassing the authorization check.`,
          exploitComplexity: 'medium',
        });
      }
    }

    return findings;
  }
}
