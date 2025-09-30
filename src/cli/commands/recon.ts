/**
 * OSINT Reconnaissance Command
 * Comprehensive OSINT scanning with multiple modes
 */

import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { OSINTOrchestrator, OSINTReporter } from '../../agent/tools/osint/index.js';
import { logger } from '../../utils/logger.js';

export function createReconCommand(): Command {
  const recon = new Command('recon');

  recon
    .description('Perform OSINT reconnaissance on targets (domains, usernames, IPs)')
    .argument('<target>', 'Target to investigate (domain, username, or IP)')
    .option('--quick', 'Quick scan (essential information only)')
    .option('--full', 'Full comprehensive scan (all OSINT tools)')
    .option('--domain', 'Domain-focused reconnaissance')
    .option('--person', 'Person-focused reconnaissance (username/email)')
    .option('--export-json <file>', 'Export results to JSON file')
    .option('--export-md <file>', 'Export results to Markdown file')
    .action(async (target: string, options) => {
      try {
        ui.banner();

        // Determine scan type
        let scanType: 'quick' | 'full' | 'domain' | 'person' = 'quick';
        if (options.full) scanType = 'full';
        else if (options.domain) scanType = 'domain';
        else if (options.person) scanType = 'person';

        ui.section('🔍 OSINT Reconnaissance');
        console.log(`Target: ${target}`);
        console.log(`Scan Type: ${scanType.toUpperCase()}`);

        const orchestrator = new OSINTOrchestrator();
        const reporter = new OSINTReporter();

        const spinner = ui.spinner('Starting reconnaissance...').start();

        let result;
        try {
          switch (scanType) {
            case 'quick':
              result = await orchestrator.quickScan(target);
              break;
            case 'full':
              result = await orchestrator.fullScan(target);
              break;
            case 'domain':
              result = await orchestrator.domainScan(target);
              break;
            case 'person':
              result = await orchestrator.personScan(target);
              break;
          }

          spinner.succeed('Reconnaissance completed');
        } catch (error) {
          spinner.fail('Reconnaissance failed');
          throw error;
        }

        // Display results
        reporter.displayResults(result);

        // Export if requested
        if (options.exportJson) {
          await reporter.exportJSON(result, options.exportJson);
        }

        if (options.exportMd) {
          await reporter.exportMarkdown(result, options.exportMd);
        }

        // Final summary
        const riskLevel =
          result.summary.riskScore > 70
            ? 'HIGH'
            : result.summary.riskScore > 40
              ? 'MEDIUM'
              : 'LOW';

        ui.info(
          `\nScan completed: ${result.summary.totalFindings} findings | Risk: ${riskLevel}`
        );

        logger.info(`OSINT reconnaissance completed for ${target}`);
      } catch (error) {
        logger.error('Recon command failed:', error);
        ui.error(
          `Reconnaissance failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        process.exit(1);
      }
    });

  // Add subcommands for specific tools
  recon
    .command('dns <domain>')
    .description('DNS reconnaissance only')
    .action(async (domain: string) => {
      try {
        const { DNSRecon } = await import('../../agent/tools/osint/index.js');
        const dnsRecon = new DNSRecon();

        const spinner = ui.spinner('Performing DNS reconnaissance...').start();
        const result = await dnsRecon.scan(domain);
        spinner.succeed('DNS reconnaissance completed');

        ui.section(`DNS Records - ${domain}`);

        if (result.records.A) {
          console.log(`A: ${result.records.A.join(', ')}`);
        }
        if (result.records.MX) {
          console.log(`MX: ${result.records.MX.join(', ')}`);
        }
        if (result.records.NS) {
          console.log(`NS: ${result.records.NS.join(', ')}`);
        }
        if (result.records.TXT) {
          console.log(`TXT: ${result.records.TXT.length} record(s)`);
        }
      } catch (error) {
        ui.error(`DNS reconnaissance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

  recon
    .command('subdomains <domain>')
    .description('Subdomain enumeration only')
    .action(async (domain: string) => {
      try {
        const { SubdomainEnum } = await import('../../agent/tools/osint/index.js');
        const subdomainEnum = new SubdomainEnum();

        const spinner = ui.spinner('Enumerating subdomains...').start();
        const result = await subdomainEnum.enumerate(domain, {
          useCertTransparency: true,
          useBruteForce: true,
        });
        spinner.succeed(`Found ${result.total} subdomains`);

        ui.section(`Subdomains - ${domain}`);
        result.subdomains.forEach((sub) => {
          const ips = sub.ip ? ` [${sub.ip.join(', ')}]` : '';
          console.log(`  • ${sub.subdomain}${ips}`);
        });
      } catch (error) {
        ui.error(`Subdomain enumeration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

  recon
    .command('emails <domain>')
    .description('Email harvesting only')
    .action(async (domain: string) => {
      try {
        const { EmailHarvest } = await import('../../agent/tools/osint/index.js');
        const emailHarvest = new EmailHarvest();

        const spinner = ui.spinner('Harvesting emails...').start();
        const result = await emailHarvest.harvest(domain);
        spinner.succeed(`Found ${result.total} emails`);

        ui.section(`Email Addresses - ${domain}`);
        result.emails.forEach((email) => {
          const verified = email.verified ? '[✓]' : '[?]';
          console.log(`  ${verified} ${email.email}`);
        });
      } catch (error) {
        ui.error(`Email harvesting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

  recon
    .command('username <username>')
    .description('Username enumeration across platforms')
    .action(async (username: string) => {
      try {
        const { UsernameEnum } = await import('../../agent/tools/osint/index.js');
        const usernameEnum = new UsernameEnum();

        const spinner = ui.spinner('Checking username across platforms...').start();
        const result = await usernameEnum.enumerate(username);
        spinner.succeed(`Found ${result.totalFound} profiles`);

        ui.section(`Social Media Profiles - ${username}`);
        result.profiles
          .filter((p) => p.exists)
          .forEach((profile) => {
            console.log(`  ✓ ${profile.platform}: ${profile.url}`);
          });
      } catch (error) {
        ui.error(`Username enumeration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

  recon
    .command('breach <email>')
    .description('Check email for data breaches')
    .action(async (email: string) => {
      try {
        const { BreachCheck } = await import('../../agent/tools/osint/index.js');
        const breachCheck = new BreachCheck();

        const spinner = ui.spinner('Checking breach databases...').start();
        const result = await breachCheck.checkEmail(email);

        if (result.breached) {
          spinner.fail(`Email found in ${result.totalBreaches} breach(es)`);

          ui.section(`⚠️  Data Breaches - ${email}`);
          result.breaches.forEach((breach) => {
            console.log(`\n${breach.title} (${breach.breachDate})`);
            console.log(
              `  Accounts: ${breach.pwnCount.toLocaleString()}`
            );
            console.log(`  Data: ${breach.dataClasses.join(', ')}`);
          });

          const recommendations = breachCheck.generateRecommendations(result);
          console.log('\n💡 Recommendations:');
          recommendations.forEach((rec) => {
            console.log(`  • ${rec}`);
          });
        } else {
          spinner.succeed('No breaches found');
          ui.success('✓ Email not found in any known data breaches');
        }
      } catch (error) {
        ui.error(`Breach check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

  recon
    .command('tech <url>')
    .description('Detect technologies used by a website')
    .action(async (url: string) => {
      try {
        const { TechDetect } = await import('../../agent/tools/osint/index.js');
        const techDetect = new TechDetect();

        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }

        const spinner = ui.spinner('Detecting technologies...').start();
        const result = await techDetect.detect(url);
        spinner.succeed(`Detected ${result.technologies.length} technologies`);

        ui.section(`Technology Stack - ${url}`);

        if (result.server) {
          console.log(`Server: ${result.server}`);
        }

        const techsByCategory = new Map<string, string[]>();
        result.technologies.forEach((tech) => {
          tech.categories.forEach((cat) => {
            if (!techsByCategory.has(cat)) {
              techsByCategory.set(cat, []);
            }
            techsByCategory.get(cat)!.push(tech.name);
          });
        });

        techsByCategory.forEach((techs, category) => {
          console.log(`\n${category}:`);
          techs.forEach((tech) => console.log(`  • ${tech}`));
        });
      } catch (error) {
        ui.error(`Technology detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

  recon
    .command('ip <ip>')
    .description('IP address analysis (geolocation, reverse lookup)')
    .action(async (ip: string) => {
      try {
        const { IPLookup } = await import('../../agent/tools/osint/index.js');
        const ipLookup = new IPLookup();

        const spinner = ui.spinner('Analyzing IP address...').start();
        const result = await ipLookup.analyzeIP(ip);
        spinner.succeed('IP analysis completed');

        ui.section(`IP Address Analysis - ${ip}`);

        console.log('\nGeolocation:');
        console.log(
          `  Location: ${result.geolocation.city}, ${result.geolocation.region}, ${result.geolocation.country}`
        );
        console.log(`  ISP: ${result.geolocation.isp}`);
        console.log(`  Organization: ${result.geolocation.org}`);

        if (result.reverseDNS.length > 0) {
          console.log(`\nReverse DNS: ${result.reverseDNS.join(', ')}`);
        }

        if (result.reverseIP.total > 0) {
          console.log(`\nDomains on same IP: ${result.reverseIP.total}`);
          result.reverseIP.domains.slice(0, 10).forEach((domain) => {
            console.log(`  • ${domain}`);
          });
        }

        console.log('\nInsights:');
        if (result.insights.isHosting) {
          console.log(
            `  • Hosted on ${result.insights.hostingProvider || 'hosting provider'}`
          );
        }
        if (result.insights.isVPN) {
          console.log(
            `  • VPN/Proxy detected: ${result.insights.vpnProvider}`
          );
        }
        if (result.insights.sharedHosting) {
          console.log(
            `  • Shared hosting (${result.insights.totalDomainsOnIP} domains on IP)`
          );
        }
      } catch (error) {
        ui.error(`IP analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

  return recon;
}