import inquirer from 'inquirer';
import { URL } from 'url';
import validator from 'validator';
import chalk from 'chalk';
import { ui } from '../../../utils/ui.js';

// Domains that should NEVER be scanned
const BLOCKED_DOMAINS = [
  // Government
  '.gov',
  '.mil',
  '.gov.uk',
  '.gc.ca',

  // Financial institutions
  'paypal.com',
  'stripe.com',
  'square.com',
  'bank',
  'chase.com',
  'wellsfargo.com',
  'bankofamerica.com',

  // Major social media (production)
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',

  // Cloud providers (production)
  'amazonaws.com',
  'googlecloud.com',
  'azure.microsoft.com',
  'cloudflare.com',

  // Critical infrastructure
  'apple.com',
  'microsoft.com',
  'google.com',
];

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  warnings?: string[];
}

export class Authorization {
  /**
   * Check if a URL is authorized for scanning
   * This is the main authorization check
   */
  async checkAuthorization(url: string, skipPrompt: boolean = false): Promise<AuthorizationResult> {
    // Validate URL format
    if (!validator.isURL(url, { require_protocol: true })) {
      return {
        authorized: false,
        reason: 'Invalid URL format. URL must include protocol (http:// or https://)',
      };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return {
        authorized: false,
        reason: 'Failed to parse URL',
      };
    }

    // Check if domain is blocked
    const blockedCheck = this.isBlocked(parsedUrl.hostname);
    if (blockedCheck.blocked) {
      return {
        authorized: false,
        reason: blockedCheck.reason,
      };
    }

    // Check if it's localhost or private IP
    const warnings: string[] = [];
    if (this.isLocalhost(parsedUrl.hostname)) {
      warnings.push('This appears to be a localhost address');
    } else if (this.isPrivateIP(parsedUrl.hostname)) {
      warnings.push('This appears to be a private network address');
    } else {
      // Production URL - add extra warning
      warnings.push('⚠️  This appears to be a PRODUCTION website');
      warnings.push('Ensure you have EXPLICIT WRITTEN PERMISSION to test this site');
    }

    // Skip interactive prompt if requested (for automated tests)
    if (skipPrompt) {
      return {
        authorized: true,
        warnings,
      };
    }

    // Interactive authorization prompt
    const authorized = await this.promptForAuthorization(url, warnings);

    return {
      authorized,
      warnings,
      reason: authorized ? undefined : 'User denied authorization',
    };
  }

  /**
   * Check if a domain/hostname is blocked
   */
  private isBlocked(hostname: string): { blocked: boolean; reason?: string } {
    const lowerHost = hostname.toLowerCase();

    for (const blocked of BLOCKED_DOMAINS) {
      if (blocked.startsWith('.')) {
        // Domain suffix match
        if (lowerHost.endsWith(blocked) || lowerHost.endsWith(blocked.substring(1))) {
          return {
            blocked: true,
            reason: `Domain ${hostname} is blocked. This appears to be a sensitive domain (${blocked}).`,
          };
        }
      } else if (blocked.includes('.')) {
        // Exact domain match
        if (lowerHost === blocked || lowerHost.endsWith(`.${blocked}`)) {
          return {
            blocked: true,
            reason: `Domain ${hostname} is blocked. This is a protected production service.`,
          };
        }
      } else {
        // Keyword match (e.g., "bank")
        if (lowerHost.includes(blocked)) {
          return {
            blocked: true,
            reason: `Domain contains blocked keyword "${blocked}". This appears to be a sensitive service.`,
          };
        }
      }
    }

    return { blocked: false };
  }

  /**
   * Check if hostname is localhost
   */
  private isLocalhost(hostname: string): boolean {
    const lowerHost = hostname.toLowerCase();
    return (
      lowerHost === 'localhost' ||
      lowerHost === '127.0.0.1' ||
      lowerHost === '0.0.0.0' ||
      lowerHost === '::1' ||
      lowerHost.endsWith('.local') ||
      lowerHost.endsWith('.localhost')
    );
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIP(hostname: string): boolean {
    // Basic private IP detection
    const ipPatterns = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    return ipPatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Prompt user for authorization
   */
  private async promptForAuthorization(url: string, warnings: string[]): Promise<boolean> {
    console.log('\n' + chalk.bgYellow.black.bold(' AUTHORIZATION REQUIRED ') + '\n');

    ui.box(
      `${chalk.bold('Target URL:')} ${url}\n\n` +
      `${chalk.bold.red('WARNING:')} Only scan systems you own or have explicit written permission to test.\n\n` +
      `Unauthorized security testing is ILLEGAL in most jurisdictions and may result in:\n` +
      `  • Criminal prosecution\n` +
      `  • Civil liability\n` +
      `  • Service termination\n` +
      `  • Legal penalties\n\n` +
      (warnings.length > 0 ? warnings.map(w => `${chalk.yellow('⚠')}  ${w}`).join('\n') + '\n\n' : '') +
      `${chalk.bold('Do you have authorization to test this URL?')}`,
      '🔒 Security Testing Authorization',
      'warning'
    );

    const { confirmed } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: 'I have authorization to test this URL',
      default: false,
    } as any);

    if (!confirmed) {
      ui.error('Authorization denied. Scan cancelled.');
      return false;
    }

    // Double confirmation for production sites
    if (warnings.some(w => w.includes('PRODUCTION'))) {
      const { doubleConfirm } = await inquirer.prompt({
        type: 'input',
        name: 'doubleConfirm',
        message: 'Type "I AUTHORIZE" to confirm (case-sensitive):',
      } as any);

      if (doubleConfirm !== 'I AUTHORIZE') {
        ui.error('Authorization not confirmed. Scan cancelled.');
        return false;
      }
    }

    ui.success('Authorization confirmed');
    return true;
  }

  /**
   * Check if URL matches CTF patterns (more permissive)
   */
  isCTFDomain(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();

      const ctfPatterns = [
        'ctf',
        'hackthebox',
        'tryhackme',
        'picoctf',
        'overthewire',
        'ctftime',
        'challenges',
        'wargame',
      ];

      return ctfPatterns.some(pattern => hostname.includes(pattern));
    } catch {
      return false;
    }
  }

  /**
   * Show CTF-specific authorization
   */
  async authorizeCTF(url: string): Promise<boolean> {
    console.log('\n' + chalk.bgCyan.black.bold(' CTF AUTHORIZATION ') + '\n');

    ui.box(
      `${chalk.bold('CTF Challenge URL:')} ${url}\n\n` +
      `${chalk.bold('CTF Guidelines:')}\n` +
      `  • Only participate in authorized CTF competitions\n` +
      `  • Follow the CTF rules and guidelines\n` +
      `  • Do not attack CTF infrastructure\n` +
      `  • Respect other participants\n\n` +
      `${chalk.bold('Are you participating in an authorized CTF?')}`,
      '🎯 CTF Challenge Authorization',
      'info'
    );

    const { confirmed } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: 'I am participating in an authorized CTF competition',
      default: false,
    } as any);

    if (confirmed) {
      ui.success('CTF authorization confirmed');
    } else {
      ui.error('CTF authorization denied');
    }

    return confirmed;
  }
}