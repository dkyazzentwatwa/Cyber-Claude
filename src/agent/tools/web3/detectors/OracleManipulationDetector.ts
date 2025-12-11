/**
 * Oracle Manipulation Detector
 *
 * Detects vulnerabilities in price oracle usage,
 * including single-source oracles and stale price data.
 */

import { v4 as uuidv4 } from 'uuid';
import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';

export class OracleManipulationDetector implements VulnDetector {
  name = 'Oracle Manipulation Detector';
  description = 'Detects vulnerable oracle patterns and price feed issues';
  vulnType: Web3VulnType = 'oracle-manipulation';

  // Chainlink oracle patterns
  private chainlinkPatterns = {
    interface: /AggregatorV3Interface/i,
    call: /latestRoundData\s*\(\)/i,
    properties: [
      /roundId/i,
      /answer/i,
      /startedAt/i,
      /updatedAt/i,
      /answeredInRound/i,
    ],
  };

  // Other oracle patterns
  private oraclePatterns = [
    /oracle/i,
    /priceFeed/i,
    /getPrice/i,
    /getRate/i,
    /getLatestPrice/i,
    /fetchPrice/i,
  ];

  // Stale price check patterns (good practice)
  private freshnessCheckPatterns = [
    /updatedAt\s*[<>]/i,
    /block\.timestamp\s*-\s*updatedAt/i,
    /require\s*\([^)]*updatedAt/i,
    /require\s*\([^)]*answeredInRound/i,
    /stale/i,
    /freshness/i,
    /heartbeat/i,
    /maxDelay/i,
  ];

  // Zero/negative price check patterns (good practice)
  private priceValidationPatterns = [
    /require\s*\([^)]*answer\s*>/i,
    /require\s*\([^)]*price\s*>/i,
    /answer\s*>\s*0/i,
    /price\s*>\s*0/i,
    /if\s*\([^)]*answer\s*[<=>]/i,
  ];

  // Single source patterns (risky)
  private singleSourcePatterns = [
    /\.getPrice\(\)/i,
    /\.latestAnswer\(\)/i,
    /oracle\.price/i,
  ];

  // Multi-source/aggregation patterns (good practice)
  private multiSourcePatterns = [
    /median/i,
    /aggregate/i,
    /weighted/i,
    /fallback/i,
    /backup/i,
    /secondary/i,
    /multiple.*oracle/i,
  ];

  async analyze(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    // Check if contract uses oracles
    const usesOracle = this.oraclePatterns.some(p => p.test(parsed.source));
    const usesChainlink = this.chainlinkPatterns.interface.test(parsed.source) ||
                          this.chainlinkPatterns.call.test(parsed.source);

    if (!usesOracle && !usesChainlink) {
      return findings;
    }

    for (const contract of parsed.contracts) {
      for (const func of contract.functions) {
        const funcBody = func.body || '';

        // Check for Chainlink usage without proper validation
        if (usesChainlink && this.chainlinkPatterns.call.test(funcBody)) {
          const hasFreshnessCheck = this.freshnessCheckPatterns.some(p => p.test(funcBody));
          const hasPriceValidation = this.priceValidationPatterns.some(p => p.test(funcBody));

          if (!hasFreshnessCheck) {
            findings.push({
              id: uuidv4(),
              severity: 'high',
              title: 'Missing Oracle Freshness Check',
              description: `Function '${func.name}' in contract '${contract.name}' uses Chainlink oracle but doesn't verify data freshness. Stale prices can lead to incorrect calculations.`,
              remediation: `Add freshness validation after latestRoundData():
\`\`\`solidity
(uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();
require(updatedAt > block.timestamp - MAX_DELAY, "Stale price");
require(answeredInRound >= roundId, "Stale price round");
\`\`\``,
              references: [
                'https://docs.chain.link/data-feeds/using-data-feeds#check-the-timestamp-of-the-latest-answer',
                'https://blog.chain.link/using-chainlink-data-feeds/#checking-for-stale-data',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                oracleType: 'Chainlink',
                hasFreshnessCheck,
                hasPriceValidation,
              },
              vulnerabilityType: 'oracle-manipulation',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              exploitScenario: `If the Chainlink oracle stops updating (network congestion, oracle downtime), the contract may use stale prices. An attacker can exploit the price discrepancy to profit at the protocol's expense.`,
              exploitComplexity: 'medium',
            });
          }

          if (!hasPriceValidation) {
            findings.push({
              id: uuidv4(),
              severity: 'medium',
              title: 'Missing Oracle Price Validation',
              description: `Function '${func.name}' in contract '${contract.name}' uses Chainlink oracle but doesn't validate that the price is positive and reasonable.`,
              remediation: `Add price validation:
\`\`\`solidity
require(answer > 0, "Invalid price");
require(answer < MAX_REASONABLE_PRICE, "Price too high");
\`\`\``,
              references: [
                'https://docs.chain.link/data-feeds/using-data-feeds',
              ],
              category: 'smart-contract',
              timestamp: new Date(),
              evidence: {
                oracleType: 'Chainlink',
                hasPriceValidation,
              },
              vulnerabilityType: 'oracle-manipulation',
              contractName: contract.name,
              functionName: func.name,
              lineNumber: func.lineStart,
              exploitScenario: `Zero or negative prices from malfunctioning oracles could cause division by zero errors, incorrect collateral calculations, or allow free/infinite minting of assets.`,
              exploitComplexity: 'low',
            });
          }
        }

        // Check for single-source oracle (risky)
        const usesSingleSource = this.singleSourcePatterns.some(p => p.test(funcBody));
        const usesMultiSource = this.multiSourcePatterns.some(p => p.test(funcBody));

        if (usesSingleSource && !usesMultiSource) {
          findings.push({
            id: uuidv4(),
            severity: 'medium',
            title: 'Single Oracle Source Dependency',
            description: `Function '${func.name}' in contract '${contract.name}' appears to rely on a single oracle source without fallback mechanisms.`,
            remediation: `
1. Implement multiple oracle sources with aggregation (median, weighted average)
2. Add fallback oracles in case primary fails
3. Consider using oracle aggregators like Chainlink's Data Feeds
4. Implement circuit breakers for extreme price deviations`,
            references: [
              'https://blog.chain.link/using-multiple-data-feeds/',
            ],
            category: 'smart-contract',
            timestamp: new Date(),
            evidence: {
              singleSource: true,
              hasMultiSource: usesMultiSource,
            },
            vulnerabilityType: 'oracle-manipulation',
            contractName: contract.name,
            functionName: func.name,
            lineNumber: func.lineStart,
            exploitScenario: `If the single oracle source is compromised, manipulated, or experiences downtime, the entire protocol becomes vulnerable. Attackers can exploit oracle manipulation to profit from incorrect prices.`,
            exploitComplexity: 'high',
          });
        }
      }
    }

    // Check for on-chain price calculations without oracles
    const noExternalOracle = !usesChainlink &&
      !parsed.source.includes('oracle') &&
      !parsed.source.includes('priceFeed');

    if (noExternalOracle) {
      // Check for AMM-style pricing patterns
      const hasAmmPricing = /getReserves|reserve0|reserve1/i.test(parsed.source);
      const hasTwap = /TWAP|observe|consult/i.test(parsed.source);

      if (hasAmmPricing && !hasTwap) {
        findings.push({
          id: uuidv4(),
          severity: 'high',
          title: 'On-Chain Price Without Oracle Protection',
          description: `Contract '${parsed.contracts[0]?.name}' appears to use on-chain reserve/AMM data for pricing without TWAP or external oracle protection.`,
          remediation: `
1. Use Chainlink or other decentralized oracles for price data
2. Implement TWAP (Time-Weighted Average Price) calculations
3. Add slippage protection and price deviation checks
4. Consider using oracle aggregators`,
          references: [
            'https://uniswap.org/docs/v2/smart-contract-integration/building-an-oracle/',
            'https://docs.chain.link/data-feeds',
          ],
          category: 'smart-contract',
          timestamp: new Date(),
          evidence: {
            hasAmmPricing,
            hasTwap,
            usesExternalOracle: false,
          },
          vulnerabilityType: 'oracle-manipulation',
          contractName: parsed.contracts[0]?.name || 'Unknown',
          exploitScenario: `Spot prices from AMM reserves can be manipulated within a single transaction using flash loans. An attacker can temporarily skew prices to exploit the protocol.`,
          exploitComplexity: 'medium',
        });
      }
    }

    return findings;
  }
}
