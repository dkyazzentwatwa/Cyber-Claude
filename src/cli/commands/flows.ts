import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { config } from '../../utils/config.js';
import { DesktopScanner } from '../../agent/tools/scanner.js';
import { SecurityReporter } from '../../agent/tools/reporter.js';
import { logger } from '../../utils/logger.js';
import { HardeningChecker } from '../../agent/tools/hardening.js';

/**
 * Pre-configured workflow definition
 */
export interface WorkFlow {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'recon' | 'analysis' | 'incident' | 'ctf' | 'learning';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  steps: string[];
  mode: 'base' | 'redteam' | 'blueteam' | 'desktopsecurity' | 'webpentest' | 'osint';
}

/**
 * Available pre-configured workflows
 */
export const WORKFLOWS: WorkFlow[] = [
  // Beginner-friendly flows
  {
    id: 'quick-security-check',
    name: '🛡️  Quick Security Health Check',
    description: 'Scan your computer for common security issues and get recommendations',
    category: 'security',
    difficulty: 'beginner',
    estimatedTime: '2-3 minutes',
    steps: [
      'Scan running processes and services',
      'Check security settings (firewall, encryption)',
      'Analyze network connections',
      'Generate security report with AI analysis',
    ],
    mode: 'desktopsecurity',
  },
  {
    id: 'website-security-audit',
    name: '🌐 Website Security Audit',
    description: 'Comprehensive security assessment of a website (OWASP Top 10)',
    category: 'security',
    difficulty: 'beginner',
    estimatedTime: '3-5 minutes',
    steps: [
      'Enter target website URL',
      'Check security headers (CSP, HSTS, etc.)',
      'Scan for common vulnerabilities',
      'Analyze forms and cookies',
      'Get AI-powered security recommendations',
    ],
    mode: 'webpentest',
  },
  {
    id: 'domain-intel-gathering',
    name: '🔍 Domain Intelligence Gathering',
    description: 'Gather comprehensive OSINT on a domain (DNS, WHOIS, subdomains, tech stack)',
    category: 'recon',
    difficulty: 'beginner',
    estimatedTime: '3-5 minutes',
    steps: [
      'Enter target domain',
      'Perform DNS reconnaissance',
      'Lookup WHOIS information',
      'Enumerate subdomains',
      'Detect technologies',
      'Generate intelligence report',
    ],
    mode: 'osint',
  },

  // Intermediate flows
  {
    id: 'incident-response-triage',
    name: '🚨 Incident Response Triage',
    description: 'Quick triage for potential security incidents on your system',
    category: 'incident',
    difficulty: 'intermediate',
    estimatedTime: '5-7 minutes',
    steps: [
      'Full system scan (processes, network, files)',
      'Check for suspicious processes',
      'Analyze network connections for anomalies',
      'Review recent system changes',
      'Generate incident triage report',
    ],
    mode: 'blueteam',
  },
  {
    id: 'pcap-threat-hunt',
    name: '📡 Network Traffic Threat Hunting',
    description: 'Analyze network capture file for threats and anomalies',
    category: 'analysis',
    difficulty: 'intermediate',
    estimatedTime: '4-6 minutes',
    steps: [
      'Load PCAP file',
      'Parse and analyze packets',
      'Extract IOCs (IPs, domains, etc.)',
      'Map to MITRE ATT&CK techniques',
      'Generate threat intelligence report',
    ],
    mode: 'blueteam',
  },
  {
    id: 'full-osint-investigation',
    name: '🕵️  Full OSINT Investigation',
    description: 'Deep-dive OSINT on target (domain, people, breach data, social media)',
    category: 'recon',
    difficulty: 'intermediate',
    estimatedTime: '5-10 minutes',
    steps: [
      'Domain reconnaissance (DNS, WHOIS, subdomains)',
      'Email harvesting',
      'Username enumeration across platforms',
      'Breach data checking',
      'Technology stack detection',
      'Generate comprehensive OSINT report',
    ],
    mode: 'osint',
  },

  // Advanced flows
  {
    id: 'red-team-recon',
    name: '🎯 Red Team Reconnaissance',
    description: 'Full external reconnaissance workflow for red team engagements',
    category: 'recon',
    difficulty: 'advanced',
    estimatedTime: '10-15 minutes',
    steps: [
      'Passive OSINT gathering',
      'Subdomain enumeration',
      'Port scanning (if authorized)',
      'Web application fingerprinting',
      'Attack surface mapping',
      'Generate target profile',
    ],
    mode: 'redteam',
  },
  {
    id: 'ctf-web-challenge',
    name: '🚩 CTF Web Challenge Solver',
    description: 'Systematic approach to solving CTF web challenges',
    category: 'ctf',
    difficulty: 'advanced',
    estimatedTime: '10-20 minutes',
    steps: [
      'Enter CTF challenge URL',
      'Scan for vulnerabilities (SQL, XSS, etc.)',
      'Analyze source code and comments',
      'Test for authentication bypasses',
      'Interactive AI assistant for solving',
    ],
    mode: 'webpentest',
  },
  {
    id: 'learn-osint-basics',
    name: '📚 Learn OSINT Basics',
    description: 'Interactive tutorial on OSINT techniques and tools',
    category: 'learning',
    difficulty: 'beginner',
    estimatedTime: '15-20 minutes',
    steps: [
      'Introduction to OSINT concepts',
      'Hands-on DNS reconnaissance',
      'WHOIS lookup tutorial',
      'Subdomain enumeration practice',
      'Best practices and ethics',
    ],
    mode: 'osint',
  },
  {
    id: 'harden-system',
    name: '🔒 System Hardening Guide',
    description: 'Step-by-step system hardening with security recommendations',
    category: 'security',
    difficulty: 'intermediate',
    estimatedTime: '10-15 minutes',
    steps: [
      'Audit current security posture',
      'Check firewall configuration',
      'Verify disk encryption',
      'Review running services',
      'Apply hardening recommendations',
    ],
    mode: 'desktopsecurity',
  },
];

/**
 * Execute a workflow
 */
async function executeFlow(flow: WorkFlow, options: { model?: string }) {
  ui.section(`Starting Flow: ${flow.name}`);
  console.log(chalk.gray(`Estimated time: ${flow.estimatedTime}`));
  console.log(chalk.gray(`Difficulty: ${flow.difficulty}\n`));

  // Show steps
  console.log(chalk.bold('📋 Workflow Steps:'));
  flow.steps.forEach((step, i) => {
    console.log(chalk.gray(`  ${i + 1}. ${step}`));
  });
  console.log('');

  // Confirm execution
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Ready to start this workflow?',
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Workflow cancelled.'));
    return;
  }

  // Execute flow based on ID
  try {
    switch (flow.id) {
      case 'quick-security-check':
        await executeQuickSecurityCheck(flow, options);
        break;
      case 'website-security-audit':
        await executeWebsiteAudit(flow, options);
        break;
      case 'domain-intel-gathering':
        await executeDomainIntel(flow, options);
        break;
      case 'incident-response-triage':
        await executeIncidentTriage(flow, options);
        break;
      case 'pcap-threat-hunt':
        await executePcapThreatHunt(flow, options);
        break;
      case 'full-osint-investigation':
        await executeFullOsint(flow, options);
        break;
      case 'harden-system':
        await executeSystemHardening(flow, options);
        break;
      case 'learn-osint-basics':
        await executeOsintTutorial(flow, options);
        break;
      default:
        console.log(chalk.yellow(`Flow "${flow.id}" implementation coming soon!`));
        console.log(chalk.gray('Use the interactive mode for guided assistance.'));
    }
  } catch (error: any) {
    logger.error('Flow execution error:', error);
    console.log(chalk.red(`\n❌ Error: ${error.message}`));
  }
}

/**
 * Quick Security Check Flow
 */
async function executeQuickSecurityCheck(flow: WorkFlow, options: { model?: string }) {
  const spinner = ui.spinner('Scanning system security...').start();

  // Step 1: Quick scan
  const scanner = new DesktopScanner();
  const scanResultRaw = await scanner.quickCheck();
  spinner.succeed('System scan complete');

  // Step 2: Security hardening check
  const hardeningSpinner = ui.spinner('Checking security settings...').start();
  const hardeningChecker = new HardeningChecker();
  const hardeningResultRaw = await hardeningChecker.checkHardening();
  hardeningSpinner.succeed('Security settings analyzed');

  // Step 3: Generate report
  const reporter = new SecurityReporter();
  const allFindings = [
    ...(scanResultRaw.success && scanResultRaw.data?.findings ? scanResultRaw.data.findings : []),
    ...(hardeningResultRaw.success && hardeningResultRaw.data?.findings ? hardeningResultRaw.data.findings : [])
  ];

  const scanResult = reporter.createScanResult(allFindings, new Date());
  reporter.displayReport(scanResult);

  // Step 4: AI Analysis
  const aiSpinner = ui.spinner('Getting AI security recommendations...').start();
  const agent = new CyberAgent({
    mode: flow.mode,
    apiKey: config.anthropicApiKey,
    googleApiKey: config.googleApiKey,
    model: options.model || config.model,
  });

  const prompt = `Analyze this security scan and provide actionable recommendations:\n\nFindings: ${JSON.stringify(allFindings, null, 2)}`;
  const analysis = await agent.chat(prompt);
  aiSpinner.succeed('AI analysis complete');

  console.log('');
  ui.section('🤖 AI Security Recommendations');
  console.log(ui.formatAIResponse(analysis));
}

/**
 * Website Security Audit Flow
 */
async function executeWebsiteAudit(flow: WorkFlow, options: { model?: string }) {
  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter website URL to audit:',
      validate: (input) => input.startsWith('http') || 'Please enter a valid URL (http:// or https://)',
    },
  ]);

  console.log(chalk.yellow('\n⚠️  Make sure you have permission to scan this website!'));
  const { authorized } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'authorized',
      message: 'Do you have authorization to scan this website?',
      default: false,
    },
  ]);

  if (!authorized) {
    console.log(chalk.red('❌ Authorization required. Scan cancelled.'));
    return;
  }

  console.log(chalk.green('\n✓ Starting website security audit...\n'));
  console.log(chalk.gray('Tip: Use "webscan" command for more options'));
  console.log(chalk.gray(`Run: cyber-claude webscan ${url} --full\n`));
}

/**
 * Domain Intelligence Gathering Flow
 */
async function executeDomainIntel(flow: WorkFlow, options: { model?: string }) {
  const { domain } = await inquirer.prompt([
    {
      type: 'input',
      name: 'domain',
      message: 'Enter domain to investigate:',
      validate: (input) => input.length > 0 || 'Domain is required',
    },
  ]);

  console.log(chalk.green('\n✓ Starting OSINT reconnaissance...\n'));
  console.log(chalk.gray('Tip: Use "recon" command for more options'));
  console.log(chalk.gray(`Run: cyber-claude recon ${domain} --domain\n`));
}

/**
 * Incident Response Triage Flow
 */
async function executeIncidentTriage(flow: WorkFlow, options: { model?: string }) {
  const spinner = ui.spinner('Performing incident triage scan...').start();

  const scanner = new DesktopScanner();
  const scanResultRaw = await scanner.scanSystem();
  spinner.succeed('Full system scan complete');

  const reporter = new SecurityReporter();
  const findings = scanResultRaw.success && scanResultRaw.data?.findings ? scanResultRaw.data.findings : [];
  const scanResult = reporter.createScanResult(findings, new Date());
  reporter.displayReport(scanResult);

  const aiSpinner = ui.spinner('Analyzing for incident indicators...').start();
  const agent = new CyberAgent({
    mode: 'blueteam',
    apiKey: config.anthropicApiKey,
    googleApiKey: config.googleApiKey,
    model: options.model || config.model,
  });

  const prompt = `Perform incident response triage on this system scan. Look for:\n- Suspicious processes\n- Unusual network connections\n- Potential compromise indicators\n- Recommended immediate actions\n\nScan Results:\n${JSON.stringify(findings, null, 2)}`;
  const analysis = await agent.chat(prompt);
  aiSpinner.succeed('Incident analysis complete');

  console.log('');
  ui.section('🚨 Incident Triage Report');
  console.log(ui.formatAIResponse(analysis));
}

/**
 * PCAP Threat Hunt Flow
 */
async function executePcapThreatHunt(flow: WorkFlow, options: { model?: string }) {
  const { pcapFile } = await inquirer.prompt([
    {
      type: 'input',
      name: 'pcapFile',
      message: 'Enter path to PCAP file:',
      validate: (input) => input.endsWith('.pcap') || input.endsWith('.pcapng') || 'Please provide a .pcap or .pcapng file',
    },
  ]);

  console.log(chalk.green('\n✓ Starting network threat hunting...\n'));
  console.log(chalk.gray('Tip: Use "pcap" command for more options'));
  console.log(chalk.gray(`Run: cyber-claude pcap ${pcapFile} --extract-iocs --mitre\n`));
}

/**
 * Full OSINT Investigation Flow
 */
async function executeFullOsint(flow: WorkFlow, options: { model?: string }) {
  const { target } = await inquirer.prompt([
    {
      type: 'input',
      name: 'target',
      message: 'Enter target (domain, email, or username):',
      validate: (input) => input.length > 0 || 'Target is required',
    },
  ]);

  console.log(chalk.green('\n✓ Starting comprehensive OSINT investigation...\n'));
  console.log(chalk.gray('Tip: Use "recon" command for more control'));
  console.log(chalk.gray(`Run: cyber-claude recon ${target} --full\n`));
}

/**
 * System Hardening Flow
 */
async function executeSystemHardening(flow: WorkFlow, options: { model?: string }) {
  const spinner = ui.spinner('Auditing security configuration...').start();

  const hardeningChecker = new HardeningChecker();
  const resultsRaw = await hardeningChecker.checkHardening();
  spinner.succeed('Security audit complete');

  const reporter = new SecurityReporter();
  const findings = resultsRaw.success && resultsRaw.data?.findings ? resultsRaw.data.findings : [];
  const scanResult = reporter.createScanResult(findings, new Date());
  reporter.displayReport(scanResult);

  const aiSpinner = ui.spinner('Generating hardening recommendations...').start();
  const agent = new CyberAgent({
    mode: 'desktopsecurity',
    apiKey: config.anthropicApiKey,
    googleApiKey: config.googleApiKey,
    model: options.model || config.model,
  });

  const prompt = `Based on this security audit, provide step-by-step hardening recommendations:\n\n${JSON.stringify(findings, null, 2)}`;
  const analysis = await agent.chat(prompt);
  aiSpinner.succeed('Hardening guide generated');

  console.log('');
  ui.section('🔒 System Hardening Guide');
  console.log(ui.formatAIResponse(analysis));
}

/**
 * OSINT Tutorial Flow
 */
async function executeOsintTutorial(flow: WorkFlow, options: { model?: string }) {
  ui.section('📚 OSINT Basics Tutorial');
  console.log(chalk.gray('Starting interactive OSINT learning session...\n'));

  const agent = new CyberAgent({
    mode: 'osint',
    apiKey: config.anthropicApiKey,
    googleApiKey: config.googleApiKey,
    model: options.model || config.model,
  });

  const tutorial = await agent.chat(`Provide a beginner-friendly tutorial on OSINT basics including:
1. What is OSINT and why it's important
2. Legal and ethical considerations
3. Basic DNS reconnaissance
4. WHOIS lookups
5. Best practices

Make it interactive and educational.`);

  console.log(ui.formatAIResponse(tutorial));
}

/**
 * Create flows command
 */
export function createFlowsCommand(): Command {
  const command = new Command('flows');

  command
    .description('Pre-configured security workflows for common tasks')
    .option('-l, --list', 'List all available workflows')
    .option('-c, --category <category>', 'Filter by category (security, recon, analysis, incident, ctf, learning)')
    .option('-d, --difficulty <level>', 'Filter by difficulty (beginner, intermediate, advanced)')
    .option('-m, --model <model>', 'AI model to use for analysis')
    .action(async (options) => {
      console.log(ui.banner());

      // List mode
      if (options.list) {
        ui.section('Available Workflows');

        let filtered = WORKFLOWS;
        if (options.category) {
          filtered = filtered.filter(f => f.category === options.category);
        }
        if (options.difficulty) {
          filtered = filtered.filter(f => f.difficulty === options.difficulty);
        }

        // Group by category
        const grouped = filtered.reduce((acc, flow) => {
          if (!acc[flow.category]) acc[flow.category] = [];
          acc[flow.category].push(flow);
          return acc;
        }, {} as Record<string, WorkFlow[]>);

        for (const [category, flows] of Object.entries(grouped)) {
          console.log(chalk.bold(`\n${category.toUpperCase()}:`));
          flows.forEach(flow => {
            console.log(`  ${flow.name}`);
            console.log(chalk.gray(`    ${flow.description}`));
            console.log(chalk.gray(`    Difficulty: ${flow.difficulty} | Time: ${flow.estimatedTime}`));
          });
        }
        return;
      }

      // Interactive selection
      const choices = WORKFLOWS.map(flow => ({
        name: `${flow.name} ${chalk.gray(`(${flow.difficulty} · ${flow.estimatedTime})`)}`,
        value: flow.id,
        short: flow.name,
      }));

      const { selectedFlowId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedFlowId',
          message: 'Choose a workflow:',
          choices,
          pageSize: 15,
        },
      ]);

      const selectedFlow = WORKFLOWS.find(f => f.id === selectedFlowId);
      if (!selectedFlow) {
        console.log(chalk.red('Flow not found'));
        return;
      }

      await executeFlow(selectedFlow, options);
    });

  return command;
}
