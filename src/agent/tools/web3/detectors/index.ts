/**
 * Vulnerability Detector Registry
 * Manages all smart contract vulnerability detectors
 */

import { VulnDetector, Web3Finding, ParsedContract, Web3VulnType } from '../types.js';
import { ReentrancyDetector } from './ReentrancyDetector.js';
import { AccessControlDetector } from './AccessControlDetector.js';
import { IntegerOverflowDetector } from './IntegerOverflowDetector.js';
import { StateModificationDetector } from './StateModificationDetector.js';
import { FlashLoanDetector } from './FlashLoanDetector.js';
import { OracleManipulationDetector } from './OracleManipulationDetector.js';
// DeFiHackLabs-derived detectors
import { PrecisionLossDetector } from './PrecisionLossDetector.js';
import { ArbitraryCallDetector } from './ArbitraryCallDetector.js';
import { StorageCollisionDetector } from './StorageCollisionDetector.js';
import { TimestampDependenceDetector } from './TimestampDependenceDetector.js';
import { WeakRandomnessDetector } from './WeakRandomnessDetector.js';

/**
 * Registry for all vulnerability detectors
 */
export class DetectorRegistry {
  private detectors: VulnDetector[] = [];

  constructor() {
    // Register all built-in detectors
    this.register(new ReentrancyDetector());
    this.register(new AccessControlDetector());
    this.register(new IntegerOverflowDetector());
    this.register(new StateModificationDetector());
    this.register(new FlashLoanDetector());
    this.register(new OracleManipulationDetector());
    // DeFiHackLabs-derived detectors
    this.register(new PrecisionLossDetector());
    this.register(new ArbitraryCallDetector());
    this.register(new StorageCollisionDetector());
    this.register(new TimestampDependenceDetector());
    this.register(new WeakRandomnessDetector());
  }

  /**
   * Register a new detector
   */
  register(detector: VulnDetector): void {
    this.detectors.push(detector);
  }

  /**
   * Get all registered detectors
   */
  getAll(): VulnDetector[] {
    return this.detectors;
  }

  /**
   * Get detector by vulnerability type
   */
  getByType(vulnType: Web3VulnType): VulnDetector | undefined {
    return this.detectors.find(d => d.vulnType === vulnType);
  }

  /**
   * Get detector by SWC ID
   */
  getBySWC(swcId: string): VulnDetector | undefined {
    return this.detectors.find(d => d.swcId === swcId);
  }

  /**
   * Run all detectors on a parsed contract
   */
  async analyzeAll(parsed: ParsedContract): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    for (const detector of this.detectors) {
      try {
        const detectorFindings = await detector.analyze(parsed);
        findings.push(...detectorFindings);
      } catch (error: any) {
        // Log error but continue with other detectors
        console.error(`Detector ${detector.name} failed: ${error.message}`);
      }
    }

    return findings;
  }

  /**
   * Run specific detectors by vulnerability types
   */
  async analyzeTypes(parsed: ParsedContract, types: Web3VulnType[]): Promise<Web3Finding[]> {
    const findings: Web3Finding[] = [];

    for (const type of types) {
      const detector = this.getByType(type);
      if (detector) {
        try {
          const detectorFindings = await detector.analyze(parsed);
          findings.push(...detectorFindings);
        } catch (error: any) {
          console.error(`Detector ${detector.name} failed: ${error.message}`);
        }
      }
    }

    return findings;
  }

  /**
   * Get list of all detector names and descriptions
   */
  listDetectors(): Array<{ name: string; description: string; vulnType: Web3VulnType; swcId?: string }> {
    return this.detectors.map(d => ({
      name: d.name,
      description: d.description,
      vulnType: d.vulnType,
      swcId: d.swcId,
    }));
  }
}

// Export individual detectors for direct use
export { ReentrancyDetector } from './ReentrancyDetector.js';
export { AccessControlDetector } from './AccessControlDetector.js';
export { IntegerOverflowDetector } from './IntegerOverflowDetector.js';
export { StateModificationDetector } from './StateModificationDetector.js';
export { FlashLoanDetector } from './FlashLoanDetector.js';
export { OracleManipulationDetector } from './OracleManipulationDetector.js';
// DeFiHackLabs-derived detectors
export { PrecisionLossDetector } from './PrecisionLossDetector.js';
export { ArbitraryCallDetector } from './ArbitraryCallDetector.js';
export { StorageCollisionDetector } from './StorageCollisionDetector.js';
export { TimestampDependenceDetector } from './TimestampDependenceDetector.js';
export { WeakRandomnessDetector } from './WeakRandomnessDetector.js';
