/**
 * Breach Data Lookup Tool
 * Uses Have I Been Pwned API (free tier, no API key required for breach checks)
 */

import axios from 'axios';
import crypto from 'crypto';
import { BreachData, BreachCheckResult } from './types.js';
import { logger } from '../../../utils/logger.js';

export class BreachCheck {
  private hibpApiUrl = 'https://haveibeenpwned.com/api/v3';

  /**
   * Check if an email has been in any breaches
   */
  async checkEmail(email: string): Promise<BreachCheckResult> {
    logger.info(`Checking breach data for: ${email}`);

    try {
      // Get all breaches for the email
      const breaches = await this.getBreachesForAccount(email);

      // Get paste count (if available)
      let pasteCount = 0;
      try {
        pasteCount = await this.getPasteCount(email);
      } catch (error) {
        logger.debug('Paste count check failed:', error);
      }

      const result: BreachCheckResult = {
        email,
        breached: breaches.length > 0,
        breaches: breaches.sort(
          (a, b) =>
            new Date(b.breachDate).getTime() - new Date(a.breachDate).getTime()
        ),
        totalBreaches: breaches.length,
        pasteCount,
      };

      logger.info(
        `Breach check completed: ${result.totalBreaches} breaches found`
      );
      return result;
    } catch (error) {
      logger.error(`Breach check failed for ${email}:`, error);

      // Return empty result if no breaches found (404 is normal)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          email,
          breached: false,
          breaches: [],
          totalBreaches: 0,
          pasteCount: 0,
        };
      }

      throw new Error(
        `Breach check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all breaches for an account
   */
  private async getBreachesForAccount(account: string): Promise<BreachData[]> {
    try {
      const response = await axios.get(
        `${this.hibpApiUrl}/breachedaccount/${encodeURIComponent(account)}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Cyber-Claude-OSINT',
          },
          validateStatus: (status) => status === 200 || status === 404,
        }
      );

      if (response.status === 404) {
        return []; // No breaches found
      }

      return response.data.map((breach: any) => ({
        name: breach.Name,
        title: breach.Title,
        domain: breach.Domain,
        breachDate: breach.BreachDate,
        addedDate: breach.AddedDate,
        modifiedDate: breach.ModifiedDate,
        pwnCount: breach.PwnCount,
        description: breach.Description,
        dataClasses: breach.DataClasses || [],
        isVerified: breach.IsVerified,
        isFabricated: breach.IsFabricated,
        isSensitive: breach.IsSensitive,
        isRetired: breach.IsRetired,
        isSpamList: breach.IsSpamList,
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get paste count for an account (requires API key in full version)
   * This is a simplified version that returns 0
   */
  private async getPasteCount(account: string): Promise<number> {
    // Paste API requires API key, so we'll skip this in free version
    // Users can add API key as environment variable if they want this feature
    return 0;
  }

  /**
   * Check if a password has been leaked (k-anonymity model)
   * Uses SHA1 hash prefix to check without exposing full password
   */
  async checkPassword(password: string): Promise<{
    leaked: boolean;
    count: number;
  }> {
    // Hash the password
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

    // Use k-anonymity: send first 5 chars, get back all hashes with that prefix
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    try {
      const response = await axios.get(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Cyber-Claude-OSINT',
          },
        }
      );

      // Parse response - each line is SUFFIX:COUNT
      const lines = response.data.split('\n');
      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          return {
            leaked: true,
            count: parseInt(countStr.trim(), 10),
          };
        }
      }

      return { leaked: false, count: 0 };
    } catch (error) {
      logger.error('Password check failed:', error);
      throw new Error(
        `Password check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all breaches in the system
   */
  async getAllBreaches(): Promise<BreachData[]> {
    try {
      const response = await axios.get(`${this.hibpApiUrl}/breaches`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Cyber-Claude-OSINT',
        },
      });

      return response.data.map((breach: any) => ({
        name: breach.Name,
        title: breach.Title,
        domain: breach.Domain,
        breachDate: breach.BreachDate,
        addedDate: breach.AddedDate,
        modifiedDate: breach.ModifiedDate,
        pwnCount: breach.PwnCount,
        description: breach.Description,
        dataClasses: breach.DataClasses || [],
        isVerified: breach.IsVerified,
        isFabricated: breach.IsFabricated,
        isSensitive: breach.IsSensitive,
        isRetired: breach.IsRetired,
        isSpamList: breach.IsSpamList,
      }));
    } catch (error) {
      logger.error('Failed to get all breaches:', error);
      throw error;
    }
  }

  /**
   * Search for breaches by domain
   */
  async getBreachesByDomain(domain: string): Promise<BreachData[]> {
    const allBreaches = await this.getAllBreaches();
    return allBreaches.filter(
      (breach) => breach.domain.toLowerCase() === domain.toLowerCase()
    );
  }

  /**
   * Analyze breach severity
   */
  analyzeBreachSeverity(breach: BreachData): {
    severity: 'critical' | 'high' | 'medium' | 'low';
    reasons: string[];
  } {
    const reasons: string[] = [];
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';

    // Check data classes
    const criticalClasses = [
      'passwords',
      'password hints',
      'credit cards',
      'bank account numbers',
      'social security numbers',
      'passport numbers',
    ];

    const highClasses = [
      'email addresses',
      'physical addresses',
      'phone numbers',
      'security questions and answers',
      'partial credit card data',
    ];

    const exposedCritical = breach.dataClasses.filter((dc) =>
      criticalClasses.some((cc) => dc.toLowerCase().includes(cc.toLowerCase()))
    );

    const exposedHigh = breach.dataClasses.filter((dc) =>
      highClasses.some((hc) => dc.toLowerCase().includes(hc.toLowerCase()))
    );

    if (exposedCritical.length > 0) {
      severity = 'critical';
      reasons.push(`Exposed critical data: ${exposedCritical.join(', ')}`);
    } else if (exposedHigh.length > 0) {
      severity = 'high';
      reasons.push(`Exposed sensitive data: ${exposedHigh.join(', ')}`);
    } else if (breach.dataClasses.length > 0) {
      severity = 'medium';
      reasons.push(`Exposed data: ${breach.dataClasses.join(', ')}`);
    }

    // Check if verified
    if (!breach.isVerified) {
      reasons.push('Breach is not verified');
    }

    // Check if fabricated
    if (breach.isFabricated) {
      severity = 'low';
      reasons.push('Breach is fabricated/fake');
    }

    // Check pwn count
    if (breach.pwnCount > 10000000) {
      reasons.push(`Very large breach: ${breach.pwnCount.toLocaleString()} accounts`);
    }

    return { severity, reasons };
  }

  /**
   * Generate recommendations based on breach data
   */
  generateRecommendations(result: BreachCheckResult): string[] {
    const recommendations: string[] = [];

    if (!result.breached) {
      recommendations.push(
        'No known breaches found - continue practicing good security hygiene'
      );
      return recommendations;
    }

    recommendations.push(
      `Your email was found in ${result.totalBreaches} data breach(es)`
    );

    // Check for password breaches
    const passwordBreaches = result.breaches.filter((b) =>
      b.dataClasses.some((dc) => dc.toLowerCase().includes('password'))
    );

    if (passwordBreaches.length > 0) {
      recommendations.push(
        'URGENT: Change passwords for all accounts using this email'
      );
      recommendations.push(
        'Enable two-factor authentication (2FA) on all important accounts'
      );
    }

    // Check for financial data
    const financialBreaches = result.breaches.filter((b) =>
      b.dataClasses.some((dc) =>
        ['credit card', 'bank', 'financial'].some((term) =>
          dc.toLowerCase().includes(term)
        )
      )
    );

    if (financialBreaches.length > 0) {
      recommendations.push(
        'CRITICAL: Monitor bank and credit card statements for suspicious activity'
      );
      recommendations.push('Consider placing a fraud alert with credit bureaus');
    }

    // Check for recent breaches
    const recentBreaches = result.breaches.filter((b) => {
      const breachDate = new Date(b.breachDate);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return breachDate > sixMonthsAgo;
    });

    if (recentBreaches.length > 0) {
      recommendations.push(
        `${recentBreaches.length} breach(es) occurred in the last 6 months - take immediate action`
      );
    }

    recommendations.push('Use unique passwords for each account');
    recommendations.push('Consider using a password manager');
    recommendations.push('Monitor your accounts regularly for suspicious activity');

    return recommendations;
  }
}