import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ui } from '../../utils/ui.js';
import { AgenticCore, AgenticConfig } from '../../agent/core/agentic.js';
import { config } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

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
 * Execute a workflow autonomously
 */
async function executeAutonomousFlow(flow: WorkFlow, options: { model?: string }) {
  ui.section(`🚀 Executing Autonomously: ${flow.name}`);

  const taskDescription = `
    Execute the "${flow.name}" workflow.
    Description: ${flow.description}.
    Steps to perform:
    ${flow.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
  `;

  // Get API keys
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey && !googleApiKey) {
    throw new Error(
      'No API keys found. Set ANTHROPIC_API_KEY or GOOGLE_API_KEY in environment.'
    );
  }

  // Create agentic config
  const agenticConfig: AgenticConfig = {
    apiKey,
    googleApiKey,
    model: options.model || config.model,
    mode: flow.mode,
    autoApprove: true, // Run autonomously
    verbose: true,
  };

  // Create agent
  const agent = new AgenticCore(agenticConfig);

  // Execute task
  const startTime = Date.now();
  const result = await agent.executeTask(taskDescription);
  const duration = Date.now() - startTime;

  // Display results
  if (result.success) {
    ui.success('\n✅ WORKFLOW COMPLETED');

    const summary = {
      status: result.context.status,
      stepsCompleted: result.context.completedSteps.length,
      findingsCount: result.context.findings.length,
      errorsCount: result.context.errors.length,
      duration: (duration / 1000).toFixed(1) + 's',
    };

    ui.box(
      `Status: ${summary.status}\n` +
      `Steps Completed: ${summary.stepsCompleted}\n` +
      `Findings: ${summary.findingsCount}\n` +
      `Errors: ${summary.errorsCount}\n` +
      `Duration: ${summary.duration}`
    );
  } else {
    ui.error('\n❌ WORKFLOW FAILED');
    ui.box(
      `Error: ${result.error}\n` +
      `Duration: ${(duration / 1000).toFixed(1)}s`
    );
  }
}

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

  // Execute flow autonomously
  try {
    await executeAutonomousFlow(flow, options);
  } catch (error: any) {
    logger.error('Flow execution error:', error);
    console.log(chalk.red(`\n❌ Error: ${error.message}`));
  }
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
