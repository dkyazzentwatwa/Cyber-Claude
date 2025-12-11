/**
 * Timestamp Dependence Detector
 * SWC-116: Block values as Time Proxy
 *
 * Detects vulnerabilities related to block.timestamp usage:
 * - Strict timestamp equality checks
 * - Short time windows vulnerable to miner manipulation
 * - Timestamp-based randomness
 * - Time-based access control bypass
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';
import { getExploitReferences } from '../exploits/index.js';

export class TimestampDependenceDetector implements VulnDetector {
  name = 'Timestamp Dependence Detector';
  description = 'Detects block.timestamp manipulation vulnerabilities (SWC-116)';
  vulnType: Web3VulnType = 'timestamp-dependence';
  swcId = 'SWC-116';

  // Timestamp usage patterns
  private timestampPatterns = [
    { pattern: /block\.timestamp/g, type: 'timestamp' },
    { pattern: /\bnow\b/g, type: 'now' }, // Deprecated but still seen
    { pattern: /block\.number/g, type: 'blocknumber' },
  ];

  // Dangerous comparison patterns
  private dangerousComparisons = [
    // Strict equality - very dangerous
    { pattern: /==\s*block\.timestamp/g, severity: 'critical' as const, issue: 'strict-equality' },
    { pattern: /block\.timestamp\s*==/g, severity: 'critical' as const, issue: 'strict-equality' },
    { pattern: /==\s*now\b/g, severity: 'critical' as const, issue: 'strict-equality' },
    { pattern: /\bnow\s*==/g, severity: 'critical' as const, issue: 'strict-equality' },
    // Short window comparisons
    { pattern: /block\.timestamp\s*[<>]=?\s*\d{1,3}\b/g, severity: 'high' as const, issue: 'short-window' },
    { pattern: /block\.timestamp\s*\+\s*\d{1,3}\b/g, severity: 'high' as const, issue: 'short-window' },
  ];

  // Timestamp in randomness (very dangerous)
  private timestampRandomnessPatterns = [
    /keccak256\s*\([^)]*block\.timestamp/gi,
    /keccak256\s*\([^)]*\bnow\b/gi,
    /uint256\s*\([^)]*block\.timestamp.*%/gi,
    /block\.timestamp\s*%/g,
    /\bnow\s*%/g,
  ];

  // Time-sensitive operations that need careful handling
  private timeSensitiveOperations = [
    /deadline/i,
    /expir/i,
    /timeout/i,
    /unlock/i,
    /lock/i,
    /vesting/i,
    /auction/i,
    /bid/i,
    /lottery/i,
    /reward/i,
  ];

  // Safe patterns - reasonable time windows (> 15 minutes = 900 seconds)
  private safePatterns = [
    /block\.timestamp\s*\+\s*\d{4,}/g, // 4+ digit additions are likely safe
    /block\.timestamp\s*\+\s*\d+\s*(minutes|hours|days|weeks)/gi,
    /TWAP/i,
    /timeAverage/i,
    /cumulativePrice/i,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    // Get real-world exploit references
    const exploitRefs = getExploitReferences('timestamp-dependence', 2);

    for (const contract of parsed.contracts) {
      for (const func of contract.functions) {
        // Skip view/pure functions for most checks
        const funcBody = func.body || '';

        // Check for dangerous timestamp comparisons
        for (const danger of this.dangerousComparisons) {
          const regex = new RegExp(danger.pattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            // Skip if it looks like a safe pattern
            if (this.isSafeTimestampUsage(funcBody, match[0])) {
              continue;
            }

            findings.push({
              id: uuidv4(),
              severity: danger.severity,
              title: danger.issue === 'strict-equality'
                ? 'Strict Timestamp Equality Check'
                : 'Short Timestamp Window',
              description: danger.issue === 'strict-equality'
                ? `Function '${func.name}' in contract '${contract.name}' uses strict equality with block.timestamp. This is impossible to satisfy reliably due to miner timestamp manipulation.`
                : `Function '${func.name}' in contract '${contract.name}' uses a short time window with block.timestamp. Miners can manipulate timestamps by ~15 seconds.`,
              remediation: danger.issue === 'strict-equality'
                ? `Never use strict equality (==) with block.timestamp. Use >= or <= with reasonable buffer windows.`
                : `Use time windows of at least 15 minutes (900 seconds) to mitigate miner manipulation. For critical operations, consider using multiple block confirmations.`,
              references: [
                'https://swcregistry.io/docs/SWC-116',
                'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/timestamp-dependence/',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                matchedPattern: match[0],
                issueType: danger.issue,
              },
              vulnerabilityType: 'timestamp-dependence',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              swcId: 'SWC-116',
              exploitScenario: danger.issue === 'strict-equality'
                ? `This condition will likely never be satisfied, or can be exploited by miners who include the transaction with a favorable timestamp.`
                : `A miner can manipulate block.timestamp within the ~15 second tolerance to win auctions, bypass time locks, or front-run time-sensitive operations.`,
              exploitComplexity: danger.severity === 'critical' ? 'low' : 'medium',
              realWorldExploits: exploitRefs,
            });
          }
        }

        // Check for timestamp in randomness
        for (const pattern of this.timestampRandomnessPatterns) {
          const regex = new RegExp(pattern.source, 'gi');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            findings.push({
              id: uuidv4(),
              severity: 'critical',
              title: 'Timestamp Used in Randomness Generation',
              description: `Function '${func.name}' in contract '${contract.name}' uses block.timestamp for randomness. This is completely predictable and manipulable.`,
              remediation: `Use Chainlink VRF or another secure randomness oracle. Never use on-chain values (timestamp, blockhash, block.number) for randomness in value-bearing operations.`,
              references: [
                'https://swcregistry.io/docs/SWC-116',
                'https://docs.chain.link/vrf/v2/introduction',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                matchedPattern: match[0],
                issueType: 'timestamp-randomness',
              },
              vulnerabilityType: 'timestamp-dependence',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              swcId: 'SWC-116',
              exploitScenario: `An attacker (especially a miner) can predict or manipulate block.timestamp to game any randomness-based selection, winning lotteries, selecting favorable NFT traits, etc.`,
              exploitComplexity: 'low',
            });
          }
        }

        // Check for time-sensitive operations with timestamp
        const hasTimestamp = this.timestampPatterns.some(p =>
          new RegExp(p.pattern.source, 'g').test(funcBody)
        );

        if (hasTimestamp) {
          for (const sensitiveOp of this.timeSensitiveOperations) {
            if (sensitiveOp.test(funcBody) && !this.isSafeTimestampUsage(funcBody, '')) {
              findings.push({
                id: uuidv4(),
                severity: 'medium',
                title: 'Time-Sensitive Operation Using block.timestamp',
                description: `Function '${func.name}' in contract '${contract.name}' uses block.timestamp in a time-sensitive operation (${sensitiveOp.source}). Review for potential manipulation.`,
                remediation: `Ensure time windows are long enough (>15 minutes) to prevent miner manipulation. Consider using external time oracles for high-value operations.`,
                references: [
                  'https://swcregistry.io/docs/SWC-116',
                ],
                category: 'smart-contract',
                timestamp: new Date(),
                evidence: {
                  timeSensitiveOperation: sensitiveOp.source,
                },
                vulnerabilityType: 'timestamp-dependence',
                contractName: contract.name,
                functionName: func.name,
                lineNumber: func.lineStart,
                swcId: 'SWC-116',
                exploitScenario: `Time-sensitive operations relying on block.timestamp can be manipulated by miners within the ~15 second tolerance window.`,
                exploitComplexity: 'medium',
              });
              break; // One finding per function for this check
            }
          }
        }
      }
    }

    return findings;
  }

  private isSafeTimestampUsage(funcBody: string, matchedPattern: string): boolean {
    // Check if using safe patterns like TWAP or long time windows
    for (const pattern of this.safePatterns) {
      if (new RegExp(pattern.source, 'gi').test(funcBody)) {
        return true;
      }
    }

    // Check if the matched pattern includes a reasonable time addition
    if (/\+\s*\d{4,}/.test(matchedPattern)) {
      return true;
    }

    return false;
  }
}
