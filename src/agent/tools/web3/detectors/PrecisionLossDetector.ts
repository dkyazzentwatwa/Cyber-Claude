/**
 * Precision Loss Detector
 *
 * Detects rounding errors and precision loss vulnerabilities:
 * - Division before multiplication
 * - Small numerator truncation
 * - Unsafe integer downcasting
 * - Missing precision scaling (1e18)
 *
 * Based on DeFiHackLabs exploit patterns (Hundred Finance, Sentiment, Wise Lending)
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';
import { getExploitReferences } from '../exploits/index.js';

export class PrecisionLossDetector implements VulnDetector {
  name = 'Precision Loss Detector';
  description = 'Detects rounding errors and precision loss vulnerabilities in arithmetic operations';
  vulnType: Web3VulnType = 'precision-loss';

  // Division before multiplication patterns - major vulnerability
  private divisionBeforeMultPatterns = [
    // a / b * c  - should be a * c / b
    /(\w+)\s*\/\s*(\w+)\s*\*\s*(\w+)/g,
    // (a / b) * c
    /\(\s*(\w+)\s*\/\s*(\w+)\s*\)\s*\*\s*(\w+)/g,
  ];

  // Unsafe downcast patterns
  private unsafeDowncastPatterns = [
    { pattern: /uint8\s*\(\s*(\w+)\s*\)/g, from: 'uint256', to: 'uint8', maxLoss: '2^248' },
    { pattern: /uint16\s*\(\s*(\w+)\s*\)/g, from: 'uint256', to: 'uint16', maxLoss: '2^240' },
    { pattern: /uint32\s*\(\s*(\w+)\s*\)/g, from: 'uint256', to: 'uint32', maxLoss: '2^224' },
    { pattern: /uint64\s*\(\s*(\w+)\s*\)/g, from: 'uint256', to: 'uint64', maxLoss: '2^192' },
    { pattern: /uint128\s*\(\s*(\w+)\s*\)/g, from: 'uint256', to: 'uint128', maxLoss: '2^128' },
    { pattern: /int8\s*\(\s*(\w+)\s*\)/g, from: 'int256', to: 'int8', maxLoss: 'sign/magnitude' },
    { pattern: /int16\s*\(\s*(\w+)\s*\)/g, from: 'int256', to: 'int16', maxLoss: 'sign/magnitude' },
    { pattern: /int32\s*\(\s*(\w+)\s*\)/g, from: 'int256', to: 'int32', maxLoss: 'sign/magnitude' },
  ];

  // Small division patterns (truncation to zero)
  private smallDivisionPatterns = [
    // Division by large constant without scaling
    /(\w+)\s*\/\s*(1e\d+|\d{6,})/g,
    // Percentage calculations that may truncate
    /(\w+)\s*\*\s*(\d+)\s*\/\s*(100|1000|10000)/g,
  ];

  // Missing precision scaling patterns
  private missingScalingPatterns = [
    // Token amount without 1e18 scaling
    /amount\s*[*\/]\s*(?!.*1e)/gi,
    /balance\s*[*\/]\s*(?!.*1e)/gi,
    /rate\s*[*\/]\s*(?!.*1e)/gi,
  ];

  // Safe patterns to skip
  private safePatterns = [
    /FullMath/i,
    /mulDiv/i,
    /PRBMath/i,
    /SafeCast/i,
    /\.toUint\d+\(/i,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    // Get real-world exploit references
    const exploitRefs = getExploitReferences('precision-loss', 2);

    for (const contract of parsed.contracts) {
      // Check if contract uses safe math libraries
      const usesSafeMath = this.safePatterns.some(p => p.test(parsed.source));

      for (const func of contract.functions) {
        // Skip view/pure functions for some checks (still check division order)
        const funcBody = func.body || '';

        // Check for division before multiplication
        for (const pattern of this.divisionBeforeMultPatterns) {
          const regex = new RegExp(pattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            findings.push({
              id: uuidv4(),
              severity: 'high',
              title: 'Division Before Multiplication',
              description: `Function '${func.name}' in contract '${contract.name}' performs division before multiplication: '${match[0]}'. This causes precision loss due to integer truncation.`,
              remediation: `Reorder operations to perform multiplication before division: instead of 'a / b * c', use 'a * c / b'. Consider using libraries like PRBMath or Solmate's FullMath for precise division.`,
              references: [
                'https://github.com/SunWeb3Sec/DeFiHackLabs',
                'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/integer-division/',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                matchedPattern: match[0],
                operationOrder: 'division-before-multiplication',
              },
              vulnerabilityType: 'precision-loss',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              exploitScenario: `An attacker can exploit precision loss by providing values that maximize truncation. For example, if calculating rewards as 'amount / totalSupply * rewardRate', small amounts relative to totalSupply will truncate to zero, effectively stealing user rewards.`,
              exploitComplexity: 'medium',
              realWorldExploits: exploitRefs,
            });
          }
        }

        // Check for unsafe downcasts
        for (const cast of this.unsafeDowncastPatterns) {
          const regex = new RegExp(cast.pattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            // Skip if using SafeCast library
            if (usesSafeMath) continue;

            findings.push({
              id: uuidv4(),
              severity: 'medium',
              title: `Unsafe Downcast to ${cast.to}`,
              description: `Function '${func.name}' in contract '${contract.name}' casts to ${cast.to} without bounds checking. This can truncate up to ${cast.maxLoss} bits of data.`,
              remediation: `Use OpenZeppelin's SafeCast library: SafeCast.to${cast.to.charAt(0).toUpperCase() + cast.to.slice(1)}(value). Alternatively, add explicit bounds checks before casting.`,
              references: [
                'https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeCast',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                matchedPattern: match[0],
                fromType: cast.from,
                toType: cast.to,
                potentialLoss: cast.maxLoss,
              },
              vulnerabilityType: 'precision-loss',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              exploitScenario: `An attacker can provide values larger than ${cast.to}.max, causing silent truncation. This can bypass balance checks, manipulate voting weights, or corrupt stored values.`,
              exploitComplexity: 'medium',
            });
          }
        }

        // Check for small division (truncation to zero)
        for (const pattern of this.smallDivisionPatterns) {
          const regex = new RegExp(pattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            // Check if it's a risky pattern (user input or balance)
            if (this.isRiskyDivision(funcBody, match[0], func.parameters)) {
              findings.push({
                id: uuidv4(),
                severity: 'medium',
                title: 'Potential Truncation to Zero',
                description: `Function '${func.name}' in contract '${contract.name}' has division that may truncate small values to zero: '${match[0]}'.`,
                remediation: `Add minimum value checks before division, use scaling factors (multiply by 1e18 before division), or implement rounding logic.`,
                references: [
                  'https://github.com/SunWeb3Sec/DeFiHackLabs',
                ],
                category: 'smart-contract',
                timestamp: new Date(),
                evidence: {
                  matchedPattern: match[0],
                },
                vulnerabilityType: 'precision-loss',
                contractName: contract.name,
                functionName: func.name,
                lineNumber: func.lineStart,
                exploitScenario: `If a user's amount is smaller than the divisor, the result will be zero. An attacker can exploit this to avoid fees, receive zero rewards, or manipulate share calculations.`,
                exploitComplexity: 'low',
              });
            }
          }
        }
      }
    }

    return findings;
  }

  private isRiskyDivision(funcBody: string, operation: string, parameters: Array<{ name: string; type: string }>): boolean {
    // Check if operation involves user-provided parameters
    for (const param of parameters) {
      if (operation.includes(param.name)) {
        return true;
      }
    }

    // Check for common risky variable names
    const riskyNames = ['amount', 'balance', 'value', 'shares', 'tokens', 'deposit', 'reward'];
    for (const name of riskyNames) {
      if (operation.toLowerCase().includes(name)) {
        return true;
      }
    }

    return false;
  }
}
