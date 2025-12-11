/**
 * Reentrancy Vulnerability Detector
 * SWC-107: Reentrancy
 *
 * Detects patterns where external calls are made before state changes,
 * potentially allowing attackers to re-enter the function.
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';

export class ReentrancyDetector implements VulnDetector {
  name = 'Reentrancy Detector';
  description = 'Detects classic and cross-function reentrancy vulnerabilities (SWC-107)';
  vulnType: Web3VulnType = 'reentrancy';
  swcId = 'SWC-107';

  // Patterns for external calls
  private externalCallPatterns = [
    /\.call\s*\{[^}]*value\s*:/g,           // .call{value: ...}
    /\.call\s*\(/g,                          // .call(...)
    /\.send\s*\(/g,                          // .send(...)
    /\.transfer\s*\(/g,                      // .transfer(...)
    /\.delegatecall\s*\(/g,                  // .delegatecall(...)
    /\.staticcall\s*\(/g,                    // .staticcall(...)
  ];

  // Patterns for state changes
  private stateChangePatterns = [
    /\b(\w+)\s*=\s*[^=]/g,                   // variable assignment
    /\b(\w+)\s*\+=\s*/g,                     // += assignment
    /\b(\w+)\s*-=\s*/g,                      // -= assignment
    /\b(\w+)\s*\+\+/g,                       // increment
    /\b(\w+)\s*--/g,                         // decrement
    /\bdelete\s+\w+/g,                       // delete statement
    /\.push\s*\(/g,                          // array push
    /\.pop\s*\(/g,                           // array pop
  ];

  // Reentrancy guard patterns
  private guardPatterns = [
    /nonReentrant/i,
    /ReentrancyGuard/i,
    /mutex/i,
    /locked/i,
    /_status\s*==\s*_NOT_ENTERED/,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    for (const contract of parsed.contracts) {
      for (const func of contract.functions) {
        // Skip view/pure functions - they can't modify state
        if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
          continue;
        }

        // Skip if function has reentrancy guard
        if (this.hasReentrancyGuard(func.modifiers, func.body || '')) {
          continue;
        }

        const funcBody = func.body || '';
        const finding = this.detectReentrancy(funcBody, contract.name, func.name, func.lineStart);

        if (finding) {
          findings.push(finding);
        }
      }
    }

    return findings;
  }

  private hasReentrancyGuard(modifiers: string[], body: string): boolean {
    // Check modifiers
    for (const mod of modifiers) {
      if (this.guardPatterns.some(p => p.test(mod))) {
        return true;
      }
    }

    // Check body for inline guards
    for (const pattern of this.guardPatterns) {
      if (pattern.test(body)) {
        return true;
      }
    }

    return false;
  }

  private detectReentrancy(
    funcBody: string,
    contractName: string,
    funcName: string,
    lineStart: number
  ): Web3Finding | null {
    // Find all external calls and state changes
    const externalCalls: Array<{ index: number; match: string }> = [];
    const stateChanges: Array<{ index: number; match: string }> = [];

    // Find external calls
    for (const pattern of this.externalCallPatterns) {
      let match;
      const regex = new RegExp(pattern.source, 'g');
      while ((match = regex.exec(funcBody)) !== null) {
        externalCalls.push({ index: match.index, match: match[0] });
      }
    }

    // Find state changes
    for (const pattern of this.stateChangePatterns) {
      let match;
      const regex = new RegExp(pattern.source, 'g');
      while ((match = regex.exec(funcBody)) !== null) {
        // Skip local variable declarations (inside function, not storage)
        if (!this.isLocalVariable(funcBody, match.index, match[0])) {
          stateChanges.push({ index: match.index, match: match[0] });
        }
      }
    }

    // Check for CEI pattern violation: external call before state change
    for (const call of externalCalls) {
      for (const change of stateChanges) {
        if (call.index < change.index) {
          // Found: external call happens before state change
          return {
            id: uuidv4(),
            severity: 'critical',
            title: 'Reentrancy Vulnerability',
            description: `Function '${funcName}' in contract '${contractName}' makes an external call before updating state. This violates the Checks-Effects-Interactions pattern and may allow reentrancy attacks.`,
            remediation: `Apply the Checks-Effects-Interactions pattern: move all state changes before external calls. Consider using OpenZeppelin's ReentrancyGuard modifier.`,
            references: [
              'https://swcregistry.io/docs/SWC-107',
              'https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              externalCall: call.match,
              stateChange: change.match,
              pattern: 'CEI violation',
            },
            vulnerabilityType: 'reentrancy',
            contractName,
            functionName: funcName,
            lineNumber: lineStart,
            swcId: 'SWC-107',
            exploitScenario: `An attacker can deploy a malicious contract that calls ${funcName}(), and in the fallback/receive function, re-enters ${funcName}() before state is updated. This can drain funds or corrupt state.`,
            exploitComplexity: 'low',
          };
        }
      }
    }

    return null;
  }

  private isLocalVariable(funcBody: string, index: number, match: string): boolean {
    // Simple heuristic: check if variable is declared with memory/calldata
    // This is a simplified check - full AST analysis would be more accurate
    const beforeMatch = funcBody.substring(Math.max(0, index - 50), index);
    return beforeMatch.includes('memory ') ||
           beforeMatch.includes('calldata ') ||
           beforeMatch.includes('uint ') ||
           beforeMatch.includes('int ') ||
           beforeMatch.includes('bool ') ||
           beforeMatch.includes('address ');
  }
}
