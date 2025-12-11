/**
 * Flash Loan Attack Vector Detector
 *
 * Detects patterns that may be vulnerable to flash loan attacks,
 * particularly around price calculations and liquidity operations.
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';

export class FlashLoanDetector implements VulnDetector {
  name = 'Flash Loan Detector';
  description = 'Detects patterns vulnerable to flash loan attacks in DeFi contracts';
  vulnType: Web3VulnType = 'flash-loan-attack';

  // Flash loan provider interfaces
  private flashLoanPatterns = [
    /IFlashLoan/i,
    /flashLoan/i,
    /FlashBorrower/i,
    /executeOperation/i,  // Aave
    /uniswapV2Call/i,     // Uniswap V2
    /uniswapV3/i,         // Uniswap V3
    /pancakeCall/i,       // PancakeSwap
    /onFlashLoan/i,       // ERC-3156
  ];

  // Price calculation patterns (vulnerable if in same transaction)
  private priceCalculationPatterns = [
    /getReserves\s*\(\)/i,           // Uniswap-style reserves
    /balanceOf\s*\([^)]*\)/i,        // Direct balance check for price
    /totalSupply\s*\(\)/i,           // Supply-based calculations
    /getAmountOut/i,                  // AMM pricing
    /getAmountsOut/i,
    /quote\s*\(/i,
    /price\s*=/i,
    /rate\s*=/i,
    /exchangeRate/i,
  ];

  // Vulnerable patterns in same function
  private vulnerablePatterns = [
    // Price based on reserve ratio
    /reserve[0-9]?\s*[*/]\s*reserve/i,
    /balance\s*[*/]\s*balance/i,
    /totalSupply.*balance|balance.*totalSupply/i,
    // Single block price check
    /block\.timestamp|block\.number/i,
  ];

  // Protection patterns
  private protectionPatterns = [
    /TWAP/i,                          // Time-weighted average price
    /oracle/i,                        // External oracle
    /Chainlink/i,                     // Chainlink oracle
    /priceFeed/i,
    /latestRoundData/i,               // Chainlink
    /consult\s*\(/i,                  // Uniswap TWAP
    /observe\s*\(/i,
    /getAveragePrice/i,
    /timeLock/i,
    /delay/i,
    /cooldown/i,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    for (const contract of parsed.contracts) {
      // Check if contract interacts with flash loans
      const hasFlashLoanInteraction = this.flashLoanPatterns.some(p =>
        p.test(parsed.source)
      );

      for (const func of contract.functions) {
        const funcBody = func.body || '';

        // Check for price calculations
        const hasPriceCalc = this.priceCalculationPatterns.some(p => p.test(funcBody));

        if (!hasPriceCalc) continue;

        // Check for protection mechanisms
        const hasProtection = this.protectionPatterns.some(p => p.test(funcBody));

        if (!hasProtection) {
          // Check for vulnerable patterns
          const vulnerablePattern = this.findVulnerablePattern(funcBody);

          if (vulnerablePattern || hasFlashLoanInteraction) {
            findings.push({
              id: uuidv4(),
              severity: hasFlashLoanInteraction ? 'critical' : 'high',
              title: 'Potential Flash Loan Vulnerability',
              description: `Function '${func.name}' in contract '${contract.name}' performs price/value calculations that may be manipulable within a single transaction via flash loans.${hasFlashLoanInteraction ? ' Contract appears to interact with flash loan providers.' : ''}`,
              remediation: `
1. Use time-weighted average prices (TWAP) instead of spot prices
2. Integrate Chainlink or other decentralized oracles for price feeds
3. Add transaction delays or timelocks for large operations
4. Consider using multiple price sources and aggregating them
5. Implement slippage protection and price bounds`,
              references: [
                'https://blog.chain.link/flash-loans-and-the-importance-of-tamper-proof-oracles/',
                'https://hackmd.io/@HaydenAdams/Hk7d5xQwa',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                hasFlashLoanInteraction,
                priceCalculation: true,
                vulnerablePattern,
                hasProtection,
              },
              vulnerabilityType: 'flash-loan-attack',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              exploitScenario: `An attacker can:
1. Take a flash loan to acquire large amounts of tokens
2. Manipulate the price/reserves by swapping large amounts
3. Call ${func.name}() while the price is manipulated
4. Profit from the manipulated price calculation
5. Return the flash loan, all in one transaction`,
              exploitComplexity: 'medium',
            });
          }
        }

        // Check for direct balance-based pricing (always risky)
        if (this.hasBalanceBasedPricing(funcBody)) {
          findings.push({
            id: uuidv4(),
            severity: 'high',
            title: 'Balance-Based Price Calculation',
            description: `Function '${func.name}' calculates prices or values based on contract balances. This is easily manipulable via flash loans or direct token transfers.`,
            remediation: `Do not use contract balances for price calculations. Use external oracles (Chainlink), TWAP, or track internal accounting separately from actual balances.`,
            references: [
              'https://samczsun.com/so-you-want-to-use-a-price-oracle/',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              pattern: 'balance-based pricing',
            },
            vulnerabilityType: 'flash-loan-attack',
            contractName: contract.name,
            functionName: func.name,
            lineNumber: func.lineStart,
            exploitScenario: `An attacker can transfer tokens to the contract or use flash loans to temporarily inflate balances, manipulating the price calculation.`,
            exploitComplexity: 'low',
          });
        }
      }
    }

    return findings;
  }

  private findVulnerablePattern(funcBody: string): string | null {
    for (const pattern of this.vulnerablePatterns) {
      if (pattern.test(funcBody)) {
        return pattern.source;
      }
    }
    return null;
  }

  private hasBalanceBasedPricing(funcBody: string): boolean {
    // Check for patterns like: price = balance / supply, or value = balance * something
    const balancePricingPatterns = [
      /balanceOf\([^)]+\)\s*[*/]\s*/i,
      /\s*[*/]\s*balanceOf\([^)]+\)/i,
      /token\.balanceOf.*[*/]/i,
      /address\(this\).*balance.*[*/]/i,
    ];

    return balancePricingPatterns.some(p => p.test(funcBody));
  }
}
