import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { CyberAgent } from '../../agent/core.js';
import { config, validateConfig } from '../../utils/config.js';
import { getModelByKey } from '../../utils/models.js';
import { MobSFMCP } from '../../mcp/tools/index.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import ora from 'ora';

/**
 * Save mobile scan results to the /scans directory as markdown
 */
async function saveScanResults(result: any, filePath: string): Promise<string> {
  // Create scans directory if it doesn't exist
  const scansDir = path.join(process.cwd(), 'scans');
  await fs.mkdir(scansDir, { recursive: true });

  // Generate filename from app name and timestamp
  const appName = result.appInfo?.appName?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'mobile_app';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${appName}_${timestamp}.md`;
  const filepath = path.join(scansDir, filename);

  // Format markdown content
  const markdown = formatScanMarkdown(result, filePath);

  // Write to file
  await fs.writeFile(filepath, markdown, 'utf-8');

  return filepath;
}

/**
 * Format mobile scan results as markdown
 */
function formatScanMarkdown(result: any, filePath: string): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Mobile App Security Scan Report`);
  lines.push(`\n**File:** ${filePath}`);
  lines.push(`**Scan Date:** ${new Date().toLocaleString()}`);
  lines.push(`**Scan Type:** ${result.scanType}`);
  lines.push('');

  // App Info
  if (result.appInfo) {
    lines.push(`## Application Information`);
    lines.push('');
    lines.push(`- **Name:** ${result.appInfo.appName}`);
    lines.push(`- **Package:** ${result.appInfo.packageName}`);
    lines.push(`- **Version:** ${result.appInfo.version}`);
    lines.push(`- **Platform:** ${result.appInfo.platform}`);
    if (result.appInfo.minSDK) {
      lines.push(`- **Min SDK:** ${result.appInfo.minSDK}`);
    }
    if (result.appInfo.targetSDK) {
      lines.push(`- **Target SDK:** ${result.appInfo.targetSDK}`);
    }
    lines.push(`- **Size:** ${(result.appInfo.size / 1024 / 1024).toFixed(2)} MB`);
    lines.push('');
    lines.push(`**Hashes:**`);
    lines.push(`- **MD5:** ${result.appInfo.md5}`);
    lines.push(`- **SHA1:** ${result.appInfo.sha1}`);
    lines.push(`- **SHA256:** ${result.appInfo.sha256}`);
    lines.push('');
  }

  // Security Score
  if (result.summary.securityScore !== undefined) {
    const score = result.summary.securityScore;
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : score >= 40 ? '🟠' : '🔴';
    lines.push(`## Security Score: ${scoreEmoji} ${score}/100`);
    lines.push('');
  }

  // Summary
  lines.push(`## Vulnerability Summary`);
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| 🔴 Critical | ${result.summary.critical} |`);
  lines.push(`| 🟠 High | ${result.summary.high} |`);
  lines.push(`| 🟡 Medium | ${result.summary.medium} |`);
  lines.push(`| 🟢 Low | ${result.summary.low} |`);
  lines.push(`| ⚠️  Warning | ${result.summary.warning} |`);
  lines.push(`| 🔵 Info | ${result.summary.info} |`);
  lines.push(`| **Total** | **${result.summary.total}** |`);
  lines.push('');

  // Components (Android)
  if (result.components) {
    lines.push(`## Components`);
    lines.push('');
    lines.push(`- **Activities:** ${result.components.activities}`);
    lines.push(`- **Services:** ${result.components.services}`);
    lines.push(`- **Receivers:** ${result.components.receivers}`);
    lines.push(`- **Providers:** ${result.components.providers}`);
    lines.push('');
  }

  // Permissions
  if (result.permissions && result.permissions.length > 0) {
    lines.push(`## Permissions (${result.permissions.length})`);
    lines.push('');

    const dangerous = result.permissions.filter((p: any) => p.status === 'dangerous');
    if (dangerous.length > 0) {
      lines.push(`### 🔴 Dangerous Permissions (${dangerous.length})`);
      lines.push('');
      dangerous.forEach((perm: any) => {
        lines.push(`- **${perm.name}**`);
        lines.push(`  - ${perm.description}`);
      });
      lines.push('');
    }
  }

  // Vulnerabilities
  if (result.vulnerabilities && result.vulnerabilities.length > 0) {
    lines.push(`## Vulnerabilities`);
    lines.push('');

    // Group by severity
    const severityOrder = ['critical', 'high', 'medium', 'low', 'warning', 'info'];
    for (const severity of severityOrder) {
      const vulns = result.vulnerabilities.filter((v: any) => v.severity === severity);
      if (vulns.length === 0) continue;

      const emojiMap: Record<string, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        warning: '⚠️',
        info: '🔵'
      };
      const emoji = emojiMap[severity];

      lines.push(`### ${emoji} ${severity.toUpperCase()} (${vulns.length})`);
      lines.push('');

      vulns.forEach((vuln: any, index: number) => {
        lines.push(`#### ${index + 1}. ${vuln.title}`);
        lines.push('');
        lines.push(`${vuln.description}`);
        lines.push('');
        if (vuln.file) {
          lines.push(`**File:** \`${vuln.file}\``);
          lines.push('');
        }
        if (vuln.cvss) {
          lines.push(`**CVSS:** ${vuln.cvss}`);
          lines.push('');
        }
        if (vuln.cwe) {
          lines.push(`**CWE:** ${vuln.cwe}`);
          lines.push('');
        }
        if (vuln.owasp) {
          lines.push(`**OWASP:** ${vuln.owasp}`);
          lines.push('');
        }
        if (vuln.masvs) {
          lines.push(`**MASVS:** ${vuln.masvs}`);
          lines.push('');
        }
      });
    }
  }

  // Network Security
  if (result.networkSecurity) {
    lines.push(`## Network Security Configuration`);
    lines.push('');
    lines.push(`- **Cleartext Traffic Allowed:** ${result.networkSecurity.cleartextTraffic ? '❌ Yes (Insecure)' : '✅ No'}`);
    lines.push(`- **Certificate Pinning:** ${result.networkSecurity.certificatePinning ? '✅ Enabled' : '❌ Disabled'}`);
    if (result.networkSecurity.domains && result.networkSecurity.domains.length > 0) {
      lines.push(`- **Domains:** ${result.networkSecurity.domains.join(', ')}`);
    }
    lines.push('');
  }

  // Certificates
  if (result.certificates && result.certificates.length > 0) {
    lines.push(`## Certificates`);
    lines.push('');
    result.certificates.forEach((cert: any, index: number) => {
      lines.push(`### Certificate ${index + 1}`);
      lines.push('');
      lines.push(`- **Issuer:** ${cert.issuer}`);
      lines.push(`- **Subject:** ${cert.subject}`);
      lines.push(`- **Valid From:** ${cert.validFrom}`);
      lines.push(`- **Valid To:** ${cert.validTo}`);
      lines.push(`- **Signature Algorithm:** ${cert.signatureAlgorithm}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Display mobile scan results in terminal
 */
function displayResults(result: any): void {
  console.log('');
  ui.section('Mobile App Security Scan Results');

  // App Info
  if (result.appInfo) {
    console.log('');
    const appDetails = [
      `📱 ${result.appInfo.appName}`,
      `Package: ${result.appInfo.packageName}`,
      `Version: ${result.appInfo.version}`,
      `Platform: ${result.appInfo.platform.toUpperCase()}`,
      result.appInfo.targetSDK ? `Target SDK: ${result.appInfo.targetSDK}` : '',
    ].filter(Boolean).join('\n');

    ui.box(appDetails, 'Application Information');
  }

  // Security Score
  if (result.summary.securityScore !== undefined) {
    const score = result.summary.securityScore;
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : score >= 40 ? '🟠' : '🔴';
    console.log('');
    const scoreMsg = [
      `${scoreEmoji} Security Score: ${score}/100`,
      '',
      score >= 80 ? 'Good security posture' :
      score >= 60 ? 'Moderate security concerns' :
      score >= 40 ? 'Significant security issues' :
      'Critical security vulnerabilities found'
    ].join('\n');

    ui.box(scoreMsg, 'Security Assessment');
  }

  // Summary
  console.log('');
  const summary = [
    'Vulnerability Summary:',
    '',
    `Critical: ${result.summary.critical}`,
    `High: ${result.summary.high}`,
    `Medium: ${result.summary.medium}`,
    `Low: ${result.summary.low}`,
    `Warning: ${result.summary.warning}`,
    `Info: ${result.summary.info}`,
  ].join('\n');

  ui.box(summary);

  // Top vulnerabilities
  if (result.vulnerabilities && result.vulnerabilities.length > 0) {
    console.log('');
    const critical = result.vulnerabilities.filter((v: any) => v.severity === 'critical');
    const high = result.vulnerabilities.filter((v: any) => v.severity === 'high');
    const topVulns = [...critical, ...high].slice(0, 5);

    if (topVulns.length > 0) {
      console.log('\n📋 Top Vulnerabilities:\n');
      topVulns.forEach((vuln: any, i: number) => {
        const emoji = vuln.severity === 'critical' ? '🔴' : '🟠';
        console.log(`  ${emoji} ${vuln.title}`);
        console.log(`     ${vuln.description.slice(0, 100)}${vuln.description.length > 100 ? '...' : ''}`);
      });
    }
  }

  console.log('');
}

/**
 * Create mobilescan command
 */
export function createMobileScanCommand(): Command {
  const cmd = new Command('mobilescan')
    .description('Scan mobile applications for security vulnerabilities (Android APK / iOS IPA)')
    .argument('<file>', 'Path to APK or IPA file')
    .option('-s, --scan-type <type>', 'Scan type: static or dynamic', 'static')
    .option('--rescan', 'Force re-scan if already analyzed', false)
    .option('--model <model>', 'AI model to use for analysis')
    .option('--json <file>', 'Export results to JSON file')
    .option('--md <file>', 'Export results to Markdown file')
    .action(async (file: string, options: any) => {
      try {
        // Validate config
        validateConfig();

        // Check if file exists
        try {
          await fs.access(file);
        } catch {
          ui.error(`File not found: ${file}`);
          process.exit(1);
        }

        // Check file extension
        const ext = path.extname(file).toLowerCase();
        if (ext !== '.apk' && ext !== '.ipa' && ext !== '.xapk') {
          ui.error(`Unsupported file type: ${ext}. Supported: .apk, .ipa, .xapk`);
          process.exit(1);
        }

        // Check if MobSF is enabled
        if (!MobSFMCP.isAvailable()) {
          ui.error('MobSF is not enabled. Set MCP_MOBSF_ENABLED=true in your .env file');
          process.exit(1);
        }

        ui.banner();
        ui.section(`Mobile App Security Scan: ${path.basename(file)}`);

        const spinner = ora('Running MobSF security scan...').start();

        // Run MobSF scan
        const result = await MobSFMCP.scan({
          filePath: file,
          scanType: options.scanType,
          reScan: options.rescan,
        });

        spinner.stop();

        if (!result.success) {
          ui.error(`MobSF scan failed: ${result.error || 'Unknown error'}`);
          process.exit(1);
        }

        // Display results
        displayResults(result);

        // Save results
        const savedPath = await saveScanResults(result, file);
        ui.success(`Results saved to ${savedPath}`);

        // Export to JSON if requested
        if (options.json) {
          await fs.writeFile(options.json, JSON.stringify(result, null, 2), 'utf-8');
          ui.success(`JSON export saved to ${options.json}`);
        }

        // Export to Markdown if requested
        if (options.md) {
          const markdown = formatScanMarkdown(result, file);
          await fs.writeFile(options.md, markdown, 'utf-8');
          ui.success(`Markdown export saved to ${options.md}`);
        }

        // AI Analysis (if model specified)
        if (options.model) {
          const modelConfig = getModelByKey(options.model);
          if (!modelConfig) {
            ui.warning(`Unknown model: ${options.model}. Skipping AI analysis.`);
            return;
          }

          console.log('');
          ui.section('AI Security Analysis');
          const analysisSpinner = ora('Analyzing with AI...').start();

          const agent = new CyberAgent({
            apiKey: config.anthropicApiKey,
            googleApiKey: config.googleApiKey,
            model: modelConfig.id,
            mode: 'base',
          });

          const prompt = `Analyze this mobile app security scan result and provide:
1. Risk assessment and prioritization
2. Top 3 most critical issues to fix immediately
3. Security best practices recommendations
4. Compliance considerations (OWASP MASVS, etc.)

Scan Results:
${JSON.stringify(result, null, 2)}`;

          try {
            const analysis = await agent.chat(prompt);
            analysisSpinner.stop();
            console.log('');
            console.log(analysis);
            console.log('');
          } catch (error: any) {
            analysisSpinner.stop();
            ui.error(`AI analysis failed: ${error.message}`);
          }
        }

      } catch (error: any) {
        ui.error(`Mobile scan failed: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}
