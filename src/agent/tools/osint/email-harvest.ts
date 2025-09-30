/**
 * Email Harvesting Tool
 * Scrapes emails from web pages, HTML content, and public sources
 * No API keys required
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { EmailResult, EmailHarvestResult } from './types.js';
import { logger } from '../../../utils/logger.js';

export class EmailHarvest {
  private emailRegex =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  /**
   * Harvest emails from a domain
   */
  async harvest(domain: string): Promise<EmailHarvestResult> {
    logger.info(`Starting email harvesting for ${domain}`);

    const emails = new Map<string, EmailResult>();
    const sources: string[] = [];

    // Method 1: Scrape main website
    try {
      const websiteEmails = await this.scrapeWebsite(`https://${domain}`);
      websiteEmails.forEach((email) => emails.set(email.email, email));
      if (websiteEmails.length > 0) {
        sources.push('Website Scraping');
      }
      logger.info(`Found ${websiteEmails.length} emails from website`);
    } catch (error) {
      logger.error('Website scraping failed:', error);
    }

    // Method 2: Check common pages
    const commonPages = [
      'contact',
      'about',
      'team',
      'staff',
      'support',
      'help',
      'privacy',
      'terms',
      'legal',
      'impressum',
    ];

    for (const page of commonPages) {
      try {
        const pageEmails = await this.scrapeWebsite(
          `https://${domain}/${page}`
        );
        pageEmails.forEach((email) => {
          if (!emails.has(email.email)) {
            emails.set(email.email, email);
          }
        });
      } catch (error) {
        // Page doesn't exist or failed to load, that's okay
      }
    }

    // Method 3: Try common email patterns
    const commonEmails = this.generateCommonEmails(domain);
    sources.push('Common Patterns');

    for (const email of commonEmails) {
      if (!emails.has(email)) {
        emails.set(email, {
          email,
          source: 'Common Pattern',
          verified: false,
        });
      }
    }

    const result: EmailHarvestResult = {
      domain,
      emails: Array.from(emails.values()).sort((a, b) =>
        a.email.localeCompare(b.email)
      ),
      total: emails.size,
      sources: Array.from(new Set(sources)),
    };

    logger.info(`Email harvesting completed: ${result.total} emails found`);
    return result;
  }

  /**
   * Scrape emails from a website
   */
  private async scrapeWebsite(url: string): Promise<EmailResult[]> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      if (response.status >= 400) {
        return [];
      }

      const emails: EmailResult[] = [];
      const $ = cheerio.load(response.data);

      // Extract from HTML content
      const htmlText = $.text();
      const foundEmails = this.extractEmails(htmlText);

      foundEmails.forEach((email) => {
        emails.push({
          email,
          source: 'Website',
          context: url,
          verified: false,
        });
      });

      // Extract from mailto links
      $('a[href^="mailto:"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const email = href.replace('mailto:', '').split('?')[0];
          if (this.isValidEmail(email) && !emails.find((e) => e.email === email)) {
            emails.push({
              email,
              source: 'Mailto Link',
              context: url,
              verified: true, // Mailto links are considered verified
            });
          }
        }
      });

      // Extract from meta tags
      $('meta').each((_, element) => {
        const content = $(element).attr('content');
        if (content) {
          const foundEmails = this.extractEmails(content);
          foundEmails.forEach((email) => {
            if (!emails.find((e) => e.email === email)) {
              emails.push({
                email,
                source: 'Meta Tag',
                context: url,
                verified: false,
              });
            }
          });
        }
      });

      return emails;
    } catch (error) {
      logger.debug(`Failed to scrape ${url}:`, error);
      return [];
    }
  }

  /**
   * Extract emails from text using regex
   */
  private extractEmails(text: string): string[] {
    const matches = text.match(this.emailRegex) || [];
    const emails = new Set<string>();

    for (const match of matches) {
      const email = match.toLowerCase();
      if (this.isValidEmail(email) && !this.isCommonFalsePositive(email)) {
        emails.add(email);
      }
    }

    return Array.from(emails);
  }

  /**
   * Generate common email patterns for a domain
   */
  private generateCommonEmails(domain: string): string[] {
    const commonPrefixes = [
      'info',
      'contact',
      'support',
      'hello',
      'admin',
      'sales',
      'marketing',
      'team',
      'help',
      'service',
      'office',
      'mail',
      'webmaster',
      'postmaster',
      'abuse',
      'noreply',
      'no-reply',
    ];

    return commonPrefixes.map((prefix) => `${prefix}@${domain}`);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Filter out common false positives
   */
  private isCommonFalsePositive(email: string): boolean {
    const falsePositives = [
      'example@example.com',
      'user@example.com',
      'test@test.com',
      'email@example.com',
      'name@example.com',
      'your@email.com',
      'you@example.com',
      'someone@example.com',
    ];

    const lowerEmail = email.toLowerCase();
    return falsePositives.some((fp) => lowerEmail === fp);
  }

  /**
   * Format email for display
   */
  formatEmail(email: EmailResult): string {
    const verifiedTag = email.verified ? '[VERIFIED]' : '';
    const sourceTag = `[${email.source}]`;
    return `${email.email} ${verifiedTag} ${sourceTag}`;
  }

  /**
   * Extract emails from raw text
   */
  extractFromText(text: string): string[] {
    return this.extractEmails(text);
  }

  /**
   * Get unique domains from email list
   */
  getEmailDomains(emails: EmailResult[]): string[] {
    const domains = new Set<string>();
    emails.forEach((email) => {
      const domain = email.email.split('@')[1];
      if (domain) {
        domains.add(domain);
      }
    });
    return Array.from(domains).sort();
  }

  /**
   * Group emails by domain
   */
  groupByDomain(emails: EmailResult[]): Map<string, EmailResult[]> {
    const grouped = new Map<string, EmailResult[]>();

    emails.forEach((email) => {
      const domain = email.email.split('@')[1];
      if (domain) {
        if (!grouped.has(domain)) {
          grouped.set(domain, []);
        }
        grouped.get(domain)!.push(email);
      }
    });

    return grouped;
  }
}