/**
 * Unprotected State Modification Detector
 *
 * Detects public/external functions that modify critical state
 * without proper validation or access control.
 * Based on SCONE-bench finding: "unprotected state-modifying function"
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';

export class StateModificationDetector implements VulnDetector {
  name = 'State Modification Detector';
  description = 'Detects unprotected functions that modify critical contract state';
  vulnType: Web3VulnType = 'unprotected-state-modification';

  // Critical state variables that should be protected
  private criticalStatePatterns = [
    /owner/i,
    /admin/i,
    /operator/i,
    /balance/i,
    /totalSupply/i,
    /allowance/i,
    /paused/i,
    /price/i,
    /rate/i,
    /fee/i,
    /limit/i,
    /threshold/i,
    /whitelist/i,
    /blacklist/i,
    /implementation/i,
    /controller/i,
  ];

  // Patterns indicating the function modifies state
  private stateModifyingPatterns = [
    /=\s*[^=]/,        // Assignment (not comparison)
    /\+=/,             // Addition assignment
    /-=/,              // Subtraction assignment
    /\*=/,             // Multiplication assignment
    /\/=/,             // Division assignment
    /delete\s+/,       // Delete statement
    /\.push\(/,        // Array push
    /\.pop\(/,         // Array pop
    /\+\+/,            // Increment
    /--/,              // Decrement
  ];

  // Access control patterns
  private accessControlPatterns = [
    /onlyOwner/i,
    /onlyAdmin/i,
    /onlyRole/i,
    /require\s*\(\s*msg\.sender\s*==/i,
    /require\s*\(\s*_msgSender\(\)\s*==/i,
    /require\s*\(\s*hasRole/i,
    /if\s*\(\s*msg\.sender\s*!=/i,
    /modifier/i,
  ];

  // Input validation patterns
  private validationPatterns = [
    /require\s*\(/,
    /assert\s*\(/,
    /revert\s*\(/,
    /if\s*\([^)]+\)\s*revert/,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    for (const contract of parsed.contracts) {
      // Get critical state variables
      const criticalVars = contract.stateVariables.filter(v =>
        this.criticalStatePatterns.some(p => p.test(v.name))
      );

      for (const func of contract.functions) {
        // Only check public/external non-view functions
        if (func.visibility !== 'public' && func.visibility !== 'external') {
          continue;
        }

        if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
          continue;
        }

        // Skip constructor
        if (func.name === 'constructor' || func.name === '') {
          continue;
        }

        const funcBody = func.body || '';

        // Check if function modifies critical state
        const modifiedCriticalVars = this.findModifiedCriticalVars(funcBody, criticalVars);

        if (modifiedCriticalVars.length > 0) {
          // Check for access control
          const hasAccessControl = this.hasAccessControl(func.modifiers, funcBody);

          // Check for input validation
          const hasValidation = this.hasInputValidation(funcBody);

          if (!hasAccessControl) {
            findings.push({
              id: uuidv4(),
              severity: 'critical',
              title: 'Unprotected Critical State Modification',
              description: `Function '${func.name}' in contract '${contract.name}' modifies critical state variable(s) [${modifiedCriticalVars.join(', ')}] without access control.`,
              remediation: `Add access control modifiers (e.g., onlyOwner) to restrict who can modify these critical state variables. Consider using OpenZeppelin's Ownable or AccessControl.`,
              references: [
                'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/visibility/',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                modifiedVariables: modifiedCriticalVars,
                visibility: func.visibility,
                hasAccessControl,
                hasValidation,
              },
              vulnerabilityType: 'unprotected-state-modification',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              exploitScenario: `Any external account can call ${func.name}() and modify ${modifiedCriticalVars.join(', ')}. An attacker could change ownership, manipulate balances, or corrupt contract state.`,
              exploitComplexity: 'low',
            });
          } else if (!hasValidation && func.parameters.length > 0) {
            // Has access control but no input validation
            findings.push({
              id: uuidv4(),
              severity: 'medium',
              title: 'Missing Input Validation on State Modification',
              description: `Function '${func.name}' in contract '${contract.name}' modifies state variable(s) [${modifiedCriticalVars.join(', ')}] but lacks input validation.`,
              remediation: `Add require() statements to validate input parameters before modifying state. Check for zero addresses, valid ranges, and other constraints.`,
              references: [
                'https://consensys.github.io/smart-contract-best-practices/development-recommendations/general/input-validation/',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                modifiedVariables: modifiedCriticalVars,
                parameters: func.parameters.map(p => p.name),
              },
              vulnerabilityType: 'unprotected-state-modification',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              exploitScenario: `An authorized caller could accidentally or maliciously set invalid values (e.g., zero address, extreme values) that corrupt contract state.`,
              exploitComplexity: 'medium',
            });
          }
        }
      }
    }

    return findings;
  }

  private findModifiedCriticalVars(
    funcBody: string,
    criticalVars: Array<{ name: string; type: string }>
  ): string[] {
    const modified: string[] = [];

    for (const variable of criticalVars) {
      // Check if variable is assigned in function body
      const assignmentPattern = new RegExp(`\\b${variable.name}\\s*[+\\-*\\/]?=`);
      const incrementPattern = new RegExp(`\\b${variable.name}\\s*[+\\-]{2}`);
      const deletePattern = new RegExp(`delete\\s+${variable.name}`);

      if (
        assignmentPattern.test(funcBody) ||
        incrementPattern.test(funcBody) ||
        deletePattern.test(funcBody)
      ) {
        modified.push(variable.name);
      }
    }

    // Also check for patterns in function body even if not declared as state variable
    for (const pattern of this.criticalStatePatterns) {
      const match = funcBody.match(new RegExp(`(\\w*${pattern.source}\\w*)\\s*[+\\-*\\/]?=`, 'i'));
      if (match && !modified.includes(match[1])) {
        modified.push(match[1]);
      }
    }

    return modified;
  }

  private hasAccessControl(modifiers: string[], funcBody: string): boolean {
    // Check modifiers
    for (const mod of modifiers) {
      if (this.accessControlPatterns.some(p => p.test(mod))) {
        return true;
      }
    }

    // Check inline access control
    for (const pattern of this.accessControlPatterns) {
      if (pattern.test(funcBody)) {
        return true;
      }
    }

    return false;
  }

  private hasInputValidation(funcBody: string): boolean {
    return this.validationPatterns.some(p => p.test(funcBody));
  }
}
