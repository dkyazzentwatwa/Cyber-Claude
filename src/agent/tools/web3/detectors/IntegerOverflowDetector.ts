/**
 * Integer Overflow/Underflow Detector
 * SWC-101: Integer Overflow and Underflow
 *
 * Detects potential integer overflow/underflow vulnerabilities,
 * especially in contracts using Solidity < 0.8.0
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';
import { isVulnerableToOverflow } from '../../../../utils/web3.js';

export class IntegerOverflowDetector implements VulnDetector {
  name = 'Integer Overflow Detector';
  description = 'Detects integer overflow/underflow vulnerabilities (SWC-101)';
  vulnType: Web3VulnType = 'integer-overflow';
  swcId = 'SWC-101';

  // SafeMath usage patterns
  private safeMathPatterns = [
    /using\s+SafeMath\s+for/g,
    /\.add\s*\(/g,
    /\.sub\s*\(/g,
    /\.mul\s*\(/g,
    /\.div\s*\(/g,
    /\.mod\s*\(/g,
  ];

  // Unchecked block pattern (Solidity 0.8+)
  private uncheckedPattern = /unchecked\s*\{[^}]*\}/g;

  // Arithmetic operation patterns
  private arithmeticPatterns = [
    { pattern: /(\w+)\s*\+\s*(\w+)/g, op: 'addition', risk: 'overflow' },
    { pattern: /(\w+)\s*-\s*(\w+)/g, op: 'subtraction', risk: 'underflow' },
    { pattern: /(\w+)\s*\*\s*(\w+)/g, op: 'multiplication', risk: 'overflow' },
    { pattern: /(\w+)\s*\+=/g, op: 'addition assignment', risk: 'overflow' },
    { pattern: /(\w+)\s*-=/g, op: 'subtraction assignment', risk: 'underflow' },
    { pattern: /(\w+)\s*\*=/g, op: 'multiplication assignment', risk: 'overflow' },
    { pattern: /(\w+)\s*\+\+/g, op: 'increment', risk: 'overflow' },
    { pattern: /(\w+)\s*--/g, op: 'decrement', risk: 'underflow' },
  ];

  // Integer types that can overflow
  private integerTypes = [
    'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256',
    'int', 'int8', 'int16', 'int32', 'int64', 'int128', 'int256',
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    // Check if contract is vulnerable (Solidity < 0.8.0)
    const pragma = parsed.pragma || '';
    const isOldSolidity = isVulnerableToOverflow(pragma);

    // Check for SafeMath usage
    const usesSafeMath = this.safeMathPatterns.some(p => p.test(parsed.source));

    // If using Solidity 0.8+ without unchecked blocks, skip
    if (!isOldSolidity) {
      // Only check for vulnerabilities inside unchecked blocks
      const uncheckedFindings = this.analyzeUncheckedBlocks(parsed);
      return uncheckedFindings;
    }

    // Solidity < 0.8.0 analysis
    for (const contract of parsed.contracts) {
      // Check if this contract uses SafeMath
      const contractUsesSafeMath = usesSafeMath ||
        contract.inherits.some(i => i.toLowerCase().includes('safemath'));

      for (const func of contract.functions) {
        const funcBody = func.body || '';

        // Skip if function body uses SafeMath patterns
        if (this.safeMathPatterns.some(p => {
          const regex = new RegExp(p.source, 'g');
          return regex.test(funcBody);
        })) {
          continue;
        }

        // Find unsafe arithmetic operations
        for (const arith of this.arithmeticPatterns) {
          const regex = new RegExp(arith.pattern.source, 'g');
          let match;

          while ((match = regex.exec(funcBody)) !== null) {
            // Check if operation involves storage variables or user input
            if (this.isRiskyOperation(funcBody, match[0], func.parameters)) {
              findings.push({
                id: uuidv4(),
                severity: contractUsesSafeMath ? 'medium' : 'high',
                title: `Potential Integer ${arith.risk === 'overflow' ? 'Overflow' : 'Underflow'}`,
                description: `Function '${func.name}' in contract '${contract.name}' performs ${arith.op} without overflow protection. Solidity version ${pragma || '< 0.8.0'} does not have built-in overflow checks.`,
                remediation: contractUsesSafeMath
                  ? `Ensure SafeMath is used for this operation: use SafeMath's ${arith.op === 'addition' || arith.op === 'addition assignment' ? 'add()' : arith.op === 'subtraction' || arith.op === 'subtraction assignment' ? 'sub()' : 'mul()'} method.`
                  : `Upgrade to Solidity 0.8.0+ for built-in overflow protection, or use OpenZeppelin's SafeMath library.`,
                references: [
                  'https://swcregistry.io/docs/SWC-101',
                  'https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeMath',
                ],
                category: 'smart-contract',
                timestamp: new Date(),
                evidence: {
                  operation: match[0],
                  operationType: arith.op,
                  solidityVersion: pragma,
                  usesSafeMath: contractUsesSafeMath,
                },
                vulnerabilityType: arith.risk === 'overflow' ? 'integer-overflow' : 'integer-underflow',
                contractName: contract.name,
                functionName: func.name,
                lineNumber: func.lineStart,
                swcId: 'SWC-101',
                exploitScenario: arith.risk === 'overflow'
                  ? `An attacker can provide large input values that cause the ${arith.op} to wrap around to a small number, potentially bypassing checks or manipulating balances.`
                  : `An attacker can trigger a ${arith.op} that wraps around to a very large number (max uint256), potentially draining funds or bypassing limits.`,
                exploitComplexity: 'medium',
              });
            }
          }
        }
      }
    }

    return findings;
  }

  private analyzeUncheckedBlocks(parsed: ParsedContract): Web3Finding[] {
    const findings: Web3Finding[] = [];
    const regex = new RegExp(this.uncheckedPattern.source, 'g');
    let match;

    while ((match = regex.exec(parsed.source)) !== null) {
      const uncheckedBlock = match[0];
      const lineNumber = parsed.source.substring(0, match.index).split('\n').length;

      // Check for arithmetic in unchecked block
      for (const arith of this.arithmeticPatterns) {
        if (new RegExp(arith.pattern.source).test(uncheckedBlock)) {
          findings.push({
            id: uuidv4(),
            severity: 'medium',
            title: `Unchecked ${arith.op} in unchecked block`,
            description: `An unchecked block contains ${arith.op} which bypasses Solidity 0.8+ overflow protection. This may be intentional for gas optimization, but verify it cannot be exploited.`,
            remediation: `Verify that the unchecked arithmetic cannot cause overflow/underflow, or add explicit bounds checking before the unchecked block.`,
            references: [
              'https://swcregistry.io/docs/SWC-101',
              'https://docs.soliditylang.org/en/v0.8.0/control-structures.html#checked-or-unchecked-arithmetic',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              uncheckedBlock: uncheckedBlock.substring(0, 100) + '...',
              operation: arith.op,
            },
            vulnerabilityType: arith.risk === 'overflow' ? 'integer-overflow' : 'integer-underflow',
            contractName: parsed.contracts[0]?.name || 'Unknown',
            lineNumber,
            swcId: 'SWC-101',
            exploitScenario: `The unchecked block may allow ${arith.risk} if the values are not properly validated before entry.`,
            exploitComplexity: 'medium',
          });
          break; // One finding per unchecked block
        }
      }
    }

    return findings;
  }

  private isRiskyOperation(funcBody: string, operation: string, parameters: Array<{ name: string; type: string }>): boolean {
    // Check if operation involves user-provided parameters
    for (const param of parameters) {
      if (operation.includes(param.name)) {
        return true;
      }
    }

    // Check if operation involves storage variables (no memory/calldata keyword nearby)
    const beforeOp = funcBody.substring(0, funcBody.indexOf(operation));
    const varName = operation.match(/\w+/)?.[0];

    if (varName) {
      // If variable is not declared as memory/calldata in function, it's likely storage
      const localDecl = new RegExp(`(memory|calldata)\\s+${varName}`);
      if (!localDecl.test(beforeOp)) {
        return true;
      }
    }

    return false;
  }
}
