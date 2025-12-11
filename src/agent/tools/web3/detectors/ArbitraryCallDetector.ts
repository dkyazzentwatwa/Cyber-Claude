/**
 * Arbitrary Call Detector
 *
 * Detects unchecked external calls with user-controlled data:
 * - .call() with user-controlled target address
 * - delegatecall to variable address
 * - User-controlled function selectors
 * - Missing call target whitelists
 *
 * Based on DeFiHackLabs exploit patterns (Qubit Finance, Multichain, Socket Gateway)
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';
import { getExploitReferences } from '../exploits/index.js';

export class ArbitraryCallDetector implements VulnDetector {
  name = 'Arbitrary Call Detector';
  description = 'Detects unchecked external calls with user-controlled targets or data';
  vulnType: Web3VulnType = 'arbitrary-call';

  // Low-level call patterns with variable targets
  private arbitraryCallPatterns = [
    // variable.call{...}(...)
    { pattern: /(\w+)\.call\s*\{[^}]*\}\s*\(/g, type: 'call', severity: 'critical' as const },
    // variable.call(...)
    { pattern: /(\w+)\.call\s*\(/g, type: 'call', severity: 'critical' as const },
    // variable.delegatecall(...)
    { pattern: /(\w+)\.delegatecall\s*\(/g, type: 'delegatecall', severity: 'critical' as const },
    // variable.staticcall(...)
    { pattern: /(\w+)\.staticcall\s*\(/g, type: 'staticcall', severity: 'high' as const },
  ];

  // User-controlled function selector patterns
  private selectorPatterns = [
    // abi.encodeWithSelector with variable
    /abi\.encodeWithSelector\s*\(\s*bytes4\s*\(\s*(\w+)\s*\)/g,
    // abi.encodePacked with function signature
    /abi\.encodePacked\s*\([^)]*bytes4/g,
    // Direct bytes4 casting of user input
    /bytes4\s*\(\s*(\w+)\s*\)/g,
  ];

  // Patterns indicating user control
  private userControlIndicators = [
    /calldata/i,
    /_target\b/i,
    /_to\b/i,
    /_contract\b/i,
    /_addr\b/i,
    /_data\b/i,
    /_payload\b/i,
    /recipient/i,
    /destination/i,
  ];

  // Safe patterns to skip
  private safePatterns = [
    // Known safe targets
    /address\s*\(\s*this\s*\)/,
    /msg\.sender/,
    // Hardcoded addresses
    /0x[a-fA-F0-9]{40}/,
    // Immutable/constant variables
    /immutable/i,
    /constant/i,
  ];

  // Whitelist check patterns
  private whitelistPatterns = [
    /whitelist/i,
    /allowlist/i,
    /approved/i,
    /isValid\w*Address/i,
    /isTrusted/i,
    /supportedTarget/i,
    /registeredContract/i,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    // Get real-world exploit references
    const exploitRefs = getExploitReferences('arbitrary-call', 2);

    for (const contract of parsed.contracts) {
      for (const func of contract.functions) {
        // Skip private/internal functions for some checks
        if (func.visibility === 'private' || func.visibility === 'internal') {
          continue;
        }

        const funcBody = func.body || '';

        // Check for arbitrary call patterns
        for (const callPattern of this.arbitraryCallPatterns) {
          const regex = new RegExp(callPattern.pattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            const targetVar = match[1];

            // Skip if target is clearly safe
            if (this.isSafeTarget(targetVar, funcBody)) {
              continue;
            }

            // Check if target is user-controlled
            const isUserControlled = this.isUserControlledTarget(targetVar, func.parameters, funcBody);

            // Check if there's a whitelist check
            const hasWhitelistCheck = this.hasWhitelistCheck(funcBody, targetVar);

            if (isUserControlled && !hasWhitelistCheck) {
              findings.push({
                id: uuidv4(),
                severity: callPattern.severity,
                title: `Arbitrary ${callPattern.type} to User-Controlled Address`,
                description: `Function '${func.name}' in contract '${contract.name}' performs ${callPattern.type} to user-controlled address '${targetVar}' without whitelist validation.`,
                remediation: `Implement a whitelist of allowed target addresses. Use a mapping to validate targets: require(allowedTargets[target], "Invalid target"). Consider using OpenZeppelin's Address.isContract() for additional validation.`,
                references: [
                  'https://github.com/SunWeb3Sec/DeFiHackLabs',
                  'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/external-calls/',
                ],
                category: 'smart-contract',
                timestamp: new Date(),
                evidence: {
                  matchedPattern: match[0],
                  callType: callPattern.type,
                  targetVariable: targetVar,
                  isUserControlled,
                  hasWhitelistCheck,
                },
                vulnerabilityType: 'arbitrary-call',
                contractName: contract.name,
                functionName: func.name,
                lineNumber: func.lineStart,
                exploitScenario: callPattern.type === 'delegatecall'
                  ? `An attacker can provide a malicious contract address. When delegatecall executes, it runs in the context of this contract, allowing the attacker to modify storage, drain funds, or take ownership.`
                  : `An attacker can provide a malicious contract address that drains tokens approved to this contract, performs reentrancy attacks, or calls privileged functions on behalf of this contract.`,
                exploitComplexity: 'low',
                realWorldExploits: exploitRefs,
              });
            }
          }
        }

        // Check for user-controlled function selectors
        for (const selectorPattern of this.selectorPatterns) {
          const regex = new RegExp(selectorPattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            const selectorVar = match[1];

            // Check if selector is from user input
            if (selectorVar && this.isUserControlledTarget(selectorVar, func.parameters, funcBody)) {
              findings.push({
                id: uuidv4(),
                severity: 'high',
                title: 'User-Controlled Function Selector',
                description: `Function '${func.name}' in contract '${contract.name}' uses a user-controlled function selector. This allows calling arbitrary functions on target contracts.`,
                remediation: `Whitelist allowed function selectors. Use an enum or mapping of approved selectors rather than accepting arbitrary bytes4 values from users.`,
                references: [
                  'https://github.com/SunWeb3Sec/DeFiHackLabs',
                ],
                category: 'smart-contract',
                timestamp: new Date(),
                evidence: {
                  matchedPattern: match[0],
                  selectorVariable: selectorVar,
                },
                vulnerabilityType: 'arbitrary-call',
                contractName: contract.name,
                functionName: func.name,
                lineNumber: func.lineStart,
                exploitScenario: `An attacker can craft a function selector to call dangerous functions like approve(), transfer(), or selfdestruct() on target contracts.`,
                exploitComplexity: 'medium',
              });
            }
          }
        }

        // Check for unvalidated calldata forwarding
        if (this.hasUnvalidatedCalldataForwarding(func, funcBody)) {
          findings.push({
            id: uuidv4(),
            severity: 'high',
            title: 'Unvalidated Calldata Forwarding',
            description: `Function '${func.name}' in contract '${contract.name}' forwards calldata to external calls without validation.`,
            remediation: `Validate the function selector and parameters in the calldata before forwarding. Consider decoding and re-encoding the call to ensure only expected functions are called.`,
            references: [
              'https://github.com/SunWeb3Sec/DeFiHackLabs',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              functionName: func.name,
              hasCalldataParam: func.parameters.some(p => p.type.includes('bytes')),
            },
            vulnerabilityType: 'arbitrary-call',
            contractName: contract.name,
            functionName: func.name,
            lineNumber: func.lineStart,
            exploitScenario: `An attacker can pass malicious calldata that gets forwarded to target contracts, potentially draining funds or manipulating state.`,
            exploitComplexity: 'medium',
          });
        }
      }
    }

    return findings;
  }

  private isSafeTarget(targetVar: string, funcBody: string): boolean {
    // Check if target is address(this), msg.sender, or hardcoded
    for (const pattern of this.safePatterns) {
      const checkPattern = new RegExp(`${targetVar}\\s*=\\s*${pattern.source}`);
      if (checkPattern.test(funcBody)) {
        return true;
      }
    }

    // Check if variable is declared as immutable or constant nearby
    const declPattern = new RegExp(`(immutable|constant)\\s+\\w+\\s+${targetVar}`);
    return declPattern.test(funcBody);
  }

  private isUserControlledTarget(
    targetVar: string,
    parameters: Array<{ name: string; type: string }>,
    funcBody: string
  ): boolean {
    // Direct parameter match
    for (const param of parameters) {
      if (param.name === targetVar || targetVar.includes(param.name)) {
        return true;
      }
    }

    // Check for user control indicators in variable name
    for (const indicator of this.userControlIndicators) {
      if (indicator.test(targetVar)) {
        return true;
      }
    }

    // Check if assigned from parameter
    for (const param of parameters) {
      const assignPattern = new RegExp(`${targetVar}\\s*=\\s*${param.name}`);
      if (assignPattern.test(funcBody)) {
        return true;
      }
    }

    return false;
  }

  private hasWhitelistCheck(funcBody: string, targetVar: string): boolean {
    for (const pattern of this.whitelistPatterns) {
      // Check for whitelist check involving the target variable
      const checkPattern = new RegExp(`${pattern.source}\\s*\\[\\s*${targetVar}\\s*\\]|${pattern.source}\\s*\\(\\s*${targetVar}\\s*\\)`, 'i');
      if (checkPattern.test(funcBody)) {
        return true;
      }
    }

    // Check for require/if with target validation
    const requirePattern = new RegExp(`require\\s*\\([^)]*${targetVar}[^)]*\\)`, 'i');
    return requirePattern.test(funcBody);
  }

  private hasUnvalidatedCalldataForwarding(
    func: { name: string; parameters: Array<{ name: string; type: string }>; body?: string },
    funcBody: string
  ): boolean {
    // Check if function has bytes/calldata parameter
    const hasBytesParam = func.parameters.some(p =>
      p.type.includes('bytes') && !p.type.includes('bytes4') && !p.type.includes('bytes32')
    );

    if (!hasBytesParam) return false;

    // Check if bytes param is passed to external call
    const bytesParam = func.parameters.find(p => p.type.includes('bytes'));
    if (!bytesParam) return false;

    // Check if it's used in a call without validation
    const callWithDataPattern = new RegExp(`\\.call\\s*\\([^)]*${bytesParam.name}[^)]*\\)`);
    const hasCallWithData = callWithDataPattern.test(funcBody);

    // Check for validation (abi.decode, bytes4 check)
    const hasValidation = /abi\.decode|bytes4\s*\(|\.selector/.test(funcBody);

    return hasCallWithData && !hasValidation;
  }
}
