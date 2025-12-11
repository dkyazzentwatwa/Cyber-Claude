/**
 * Weak Randomness Detector
 * SWC-120: Weak Sources of Randomness
 *
 * Detects predictable randomness vulnerabilities:
 * - blockhash for random selection
 * - block.timestamp % for lottery
 * - block.prevrandao without VRF
 * - keccak256(block.*) as seed
 *
 * Based on DeFiHackLabs exploit patterns (Fomo3D, Meebits)
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';
import { getExploitReferences } from '../exploits/index.js';

export class WeakRandomnessDetector implements VulnDetector {
  name = 'Weak Randomness Detector';
  description = 'Detects weak/predictable sources of randomness (SWC-120)';
  vulnType: Web3VulnType = 'weak-randomness';
  swcId = 'SWC-120';

  // Block-based "randomness" patterns - all predictable/manipulable
  private weakRandomnessPatterns = [
    // blockhash - only works for last 256 blocks, predictable
    { pattern: /blockhash\s*\(/g, source: 'blockhash', severity: 'critical' as const },
    // block.timestamp modulo
    { pattern: /block\.timestamp\s*%/g, source: 'block.timestamp', severity: 'critical' as const },
    // block.number modulo
    { pattern: /block\.number\s*%/g, source: 'block.number', severity: 'critical' as const },
    // block.difficulty (pre-merge) / block.prevrandao (post-merge)
    { pattern: /block\.difficulty/g, source: 'block.difficulty', severity: 'critical' as const },
    { pattern: /block\.prevrandao/g, source: 'block.prevrandao', severity: 'high' as const },
    // block.coinbase
    { pattern: /block\.coinbase/g, source: 'block.coinbase', severity: 'high' as const },
    // block.gaslimit
    { pattern: /block\.gaslimit/g, source: 'block.gaslimit', severity: 'medium' as const },
    // now (deprecated but still seen)
    { pattern: /\bnow\s*%/g, source: 'now', severity: 'critical' as const },
  ];

  // Keccak256 with weak seeds
  private weakKeccakPatterns = [
    // keccak256 with block values
    { pattern: /keccak256\s*\([^)]*block\.timestamp/gi, seed: 'block.timestamp' },
    { pattern: /keccak256\s*\([^)]*block\.number/gi, seed: 'block.number' },
    { pattern: /keccak256\s*\([^)]*block\.difficulty/gi, seed: 'block.difficulty' },
    { pattern: /keccak256\s*\([^)]*block\.prevrandao/gi, seed: 'block.prevrandao' },
    { pattern: /keccak256\s*\([^)]*blockhash/gi, seed: 'blockhash' },
    // keccak256 with msg.sender alone (predictable by sender)
    { pattern: /keccak256\s*\(\s*abi\.encode[^)]*msg\.sender[^)]*\)\s*%/gi, seed: 'msg.sender' },
  ];

  // Random-looking variable/function names (indicate randomness intent)
  private randomnessIndicators = [
    /random/i,
    /lottery/i,
    /winner/i,
    /select/i,
    /pick/i,
    /raffle/i,
    /prize/i,
    /draw/i,
    /shuffle/i,
    /roll/i,
    /dice/i,
    /spin/i,
    /nonce/i,
    /seed/i,
  ];

  // Secure randomness patterns (VRF usage)
  private securePatterns = [
    /VRF/i,
    /Chainlink.*Random/i,
    /requestRandomness/i,
    /fulfillRandomWords/i,
    /rawFulfillRandomness/i,
    /VRFConsumer/i,
    /IVRFCoordinator/i,
    /commit.*reveal/i,
    /randao/i, // Proper RANDAO usage with commit-reveal
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    // Get real-world exploit references
    const exploitRefs = getExploitReferences('weak-randomness', 2);

    for (const contract of parsed.contracts) {
      // Check if contract uses secure randomness
      const usesSecureRandomness = this.securePatterns.some(p =>
        p.test(parsed.source)
      );

      for (const func of contract.functions) {
        const funcBody = func.body || '';

        // Check if function appears to be related to randomness
        const isRandomnessFunction = this.randomnessIndicators.some(p =>
          p.test(func.name) || p.test(funcBody)
        );

        // Check for weak randomness patterns
        for (const weak of this.weakRandomnessPatterns) {
          const regex = new RegExp(weak.pattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            // Higher severity if it's clearly a randomness function
            const adjustedSeverity = isRandomnessFunction && weak.severity !== 'critical'
              ? 'high' as const
              : weak.severity;

            findings.push({
              id: uuidv4(),
              severity: adjustedSeverity,
              title: `Weak Randomness: ${weak.source}`,
              description: `Function '${func.name}' in contract '${contract.name}' uses ${weak.source} as a source of randomness. This is ${weak.severity === 'critical' ? 'completely predictable and manipulable' : 'potentially predictable'} by miners/validators.`,
              remediation: usesSecureRandomness
                ? `The contract uses VRF, but this function uses weak randomness. Ensure all randomness-dependent operations use the VRF implementation.`
                : `Use Chainlink VRF (Verifiable Random Function) for secure on-chain randomness. Never use block values as the sole source of randomness for value-bearing operations.`,
              references: [
                'https://swcregistry.io/docs/SWC-120',
                'https://docs.chain.link/vrf/v2/introduction',
                'https://github.com/SunWeb3Sec/DeFiHackLabs',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                matchedPattern: match[0],
                randomnessSource: weak.source,
                isRandomnessFunction,
                usesSecureRandomnessElsewhere: usesSecureRandomness,
              },
              vulnerabilityType: 'weak-randomness',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              swcId: 'SWC-120',
              exploitScenario: weak.source === 'blockhash'
                ? `An attacker can predict blockhash for recent blocks, or wait until the blockhash expires (>256 blocks) when it returns 0. Miners can also manipulate which transactions get included.`
                : weak.source.includes('timestamp')
                  ? `Miners can manipulate block.timestamp within ~15 seconds to influence randomness outcomes. An attacker can also calculate the expected "random" value before transacting.`
                  : weak.source === 'block.prevrandao'
                    ? `While prevrandao (post-merge) is better than pre-merge difficulty, validators can still bias outcomes slightly. For high-value randomness, use VRF.`
                    : `This block value is predictable and/or manipulable. An attacker can calculate expected outcomes before transacting.`,
              exploitComplexity: 'low',
              realWorldExploits: isRandomnessFunction ? exploitRefs : undefined,
            });
          }
        }

        // Check for weak keccak patterns
        for (const keccak of this.weakKeccakPatterns) {
          const regex = new RegExp(keccak.pattern.source, 'gi');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            findings.push({
              id: uuidv4(),
              severity: isRandomnessFunction ? 'critical' : 'high',
              title: 'Predictable Hash-Based Randomness',
              description: `Function '${func.name}' in contract '${contract.name}' uses keccak256 with ${keccak.seed} for randomness. All inputs to keccak256 are known/predictable, making the output predictable.`,
              remediation: `keccak256 only provides randomness if at least one input is truly random. Use Chainlink VRF or implement a proper commit-reveal scheme with a trusted randomness source.`,
              references: [
                'https://swcregistry.io/docs/SWC-120',
                'https://docs.chain.link/vrf/v2/introduction',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                matchedPattern: match[0],
                weakSeed: keccak.seed,
              },
              vulnerabilityType: 'weak-randomness',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              swcId: 'SWC-120',
              exploitScenario: `An attacker can compute keccak256(${keccak.seed}, ...) off-chain before submitting a transaction, allowing them to predict outcomes and only participate when favorable.`,
              exploitComplexity: 'low',
              realWorldExploits: exploitRefs,
            });
          }
        }

        // Check for modulo operation on uint256 cast of hash (common pattern)
        const hashModuloPattern = /uint256\s*\(\s*keccak256\s*\([^)]+\)\s*\)\s*%/g;
        let hashMatch;

        while ((hashMatch = hashModuloPattern.exec(funcBody)) !== null) {
          // Already covered by keccak patterns, but flag if missed
          const alreadyFlagged = findings.some(f =>
            f.functionName === func.name && f.title.includes('Hash-Based')
          );

          if (!alreadyFlagged && isRandomnessFunction) {
            findings.push({
              id: uuidv4(),
              severity: 'high',
              title: 'Hash-Based Random Number Generation',
              description: `Function '${func.name}' in contract '${contract.name}' generates random numbers by hashing and using modulo. Verify that the hash inputs include a secure random source.`,
              remediation: `If any hash input is predictable (block values, msg.sender, etc.), the output is predictable. Use Chainlink VRF for secure randomness.`,
              references: [
                'https://swcregistry.io/docs/SWC-120',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                matchedPattern: hashMatch[0],
              },
              vulnerabilityType: 'weak-randomness',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              swcId: 'SWC-120',
              exploitScenario: `If the hash inputs are predictable, an attacker can compute the "random" number before transacting.`,
              exploitComplexity: 'medium',
            });
          }
        }
      }
    }

    return findings;
  }
}
