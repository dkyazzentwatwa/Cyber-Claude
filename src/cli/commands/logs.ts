import { Command } from 'commander';
import { LogAnalyzer, LogReporter } from '../../agent/tools/log/index.js';
import { AnalysisMode, LogFormat } from '../../agent/tools/log/types.js';
import { CyberAgent } from '../../agent/core.js';
import { config } from '../../utils/config.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';
import { getModelByKey } from '../../utils/models.js';

/**
 * Create logs analysis command
 */
export function createLogsCommand(): Command {
  const cmd = new Command('logs');

  cmd
    .description('Analyze log files for security issues and anomalies')
    .argument('<file>', 'Path to log file')
    .option('-m, --mode <mode>', 'Analysis mode: quick, full, or threat-hunt', 'quick')
    .option('-f, --format <format>', 'Log format: syslog, apache, auth, json, windows, firewall, auto', 'auto')
    .option('--model <model>', 'AI model to use (model key)', 'sonnet-4.5')
    .option('--max-lines <n>', 'Maximum lines to analyze', parseInt)
    .option('--time-start <date>', 'Filter logs from this time (ISO 8601)')
    .option('--time-end <date>', 'Filter logs until this time (ISO 8601)')
    .option('--search <pattern>', 'Regex pattern to filter log lines')
    .option('--extract-iocs', 'Extract indicators of compromise (IPs, domains, etc.)')
    .option('--no-anomalies', 'Skip anomaly detection')
    .option('--show-entries', 'Display sample log entries')
    .option('--export-json <file>', 'Export analysis to JSON')
    .option('--export-md <file>', 'Export report to Markdown')
    .action(async (file: string, options: any) => {
      try {
        ui.banner();

        const mode: AnalysisMode = options.mode.toLowerCase();
        if (!['quick', 'full', 'threat-hunt'].includes(mode)) {
          ui.error('Invalid mode. Choose: quick, full, or threat-hunt');
          process.exit(1);
        }

        const format = options.format.toLowerCase() as LogFormat;

        // Show analysis mode
        const modeEmoji = mode === 'quick' ? '⚡' :
                         mode === 'full' ? '🔍' : '🎯';
        ui.section(`${modeEmoji} ${mode.toUpperCase()} Log Analysis Mode`);
        console.log('');

        // Parse log file
        const spinner = ui.spinner('Parsing log file...').start();
        const analyzer = new LogAnalyzer();
        const reporter = new LogReporter();

        const analysisOptions: import('../../agent/tools/log/types.js').LogAnalysisOptions = {
          format,
          maxLines: options.maxLines,
          detectAnomalies: options.anomalies !== false,
          includeIOCs: options.extractIocs || mode === 'threat-hunt',
          timeFilter: (options.timeStart || options.timeEnd) ? {
            start: options.timeStart ? new Date(options.timeStart) : undefined,
            end: options.timeEnd ? new Date(options.timeEnd) : undefined,
          } : undefined,
          searchPattern: options.search || undefined,
        };

        // Adjust settings based on mode
        if (mode === 'quick') {
          analysisOptions.maxLines = analysisOptions.maxLines || 10000;
        } else if (mode === 'full') {
          analysisOptions.maxLines = analysisOptions.maxLines || 50000;
        } else if (mode === 'threat-hunt') {
          analysisOptions.maxLines = analysisOptions.maxLines || 100000;
          analysisOptions.includeIOCs = true;
        }

        const analysis = await analyzer.analyze(file, analysisOptions);

        spinner.succeed('Log analysis complete');
        console.log('');

        // Display results
        reporter.displaySummary(analysis);

        // Show sample entries if requested
        if (options.showEntries) {
          reporter.displayEntries(analysis.entries);
        }

        // AI analysis
        const model = getModelByKey(options.model);
        if (!model) {
          ui.error(`Model '${options.model}' not found`);
          process.exit(1);
        }

        ui.section(`🤖 AI Analysis (${model.name})`);
        console.log('');

        const aiSpinner = ui.spinner('Analyzing log patterns with AI...').start();

        const agent = new CyberAgent({
          apiKey: config.anthropicApiKey,
          googleApiKey: config.googleApiKey,
          model: model.id,
          mode: 'blueteam', // Use blueteam mode for log analysis
        });

        // Build analysis prompt
        const analysisPrompt = buildAnalysisPrompt(analysis, mode);

        const response = await agent.analyze(analysisPrompt, 'log file analysis');

        aiSpinner.stop();
        console.log(ui.formatAIResponse(response));
        console.log('');

        // Export results
        if (options.exportJson) {
          await reporter.exportJson(analysis, options.exportJson);
        }

        if (options.exportMd) {
          await reporter.exportMarkdown(analysis, options.exportMd);
        }

        ui.success('Log analysis complete!');

      } catch (error: any) {
        logger.error('Log analysis failed:', error);
        ui.error(`Analysis failed: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Build AI analysis prompt based on mode
 */
function buildAnalysisPrompt(analysis: any, mode: AnalysisMode): string {
  let prompt = `Analyze the following log file:\n\n`;
  prompt += `File: ${analysis.filePath}\n`;
  prompt += `Format: ${analysis.format}\n`;
  prompt += `Total Entries: ${analysis.statistics.totalLines.toLocaleString()}\n`;
  prompt += `Error Rate: ${analysis.statistics.errorRate.toFixed(2)}%\n\n`;

  if (analysis.statistics.timeRange) {
    prompt += `Time Range: ${analysis.statistics.timeRange.start.toLocaleString()} to ${analysis.statistics.timeRange.end.toLocaleString()}\n\n`;
  }

  // Severity distribution
  prompt += `Severity Distribution:\n`;
  const dist = analysis.statistics.severityDistribution;
  Object.entries(dist).forEach(([severity, count]) => {
    if ((count as number) > 0) {
      prompt += `- ${severity}: ${count}\n`;
    }
  });
  prompt += `\n`;

  // Top sources
  if (analysis.statistics.topSources.length > 0) {
    prompt += `Top Sources:\n`;
    analysis.statistics.topSources.slice(0, 5).forEach((src: any) => {
      prompt += `- ${src.source}: ${src.count} entries\n`;
    });
    prompt += `\n`;
  }

  // Top IPs
  if (analysis.statistics.topIPs && analysis.statistics.topIPs.length > 0) {
    prompt += `Top IP Addresses:\n`;
    analysis.statistics.topIPs.slice(0, 5).forEach((ip: any) => {
      prompt += `- ${ip.ip}: ${ip.count} entries\n`;
    });
    prompt += `\n`;
  }

  // Anomalies
  if (analysis.anomalies.length > 0) {
    prompt += `⚠️ Detected Anomalies (${analysis.anomalies.length}):\n`;
    analysis.anomalies.slice(0, 10).forEach((anomaly: any) => {
      prompt += `\n- [${anomaly.severity.toUpperCase()}] ${anomaly.title}\n`;
      prompt += `  ${anomaly.description}\n`;
      if (anomaly.count > 1) {
        prompt += `  Occurrences: ${anomaly.count}\n`;
      }
      if (anomaly.mitreAttack && anomaly.mitreAttack.length > 0) {
        prompt += `  MITRE ATT&CK: ${anomaly.mitreAttack.join(', ')}\n`;
      }
    });
    prompt += `\n`;
  }

  // IOCs
  if (analysis.extractedIOCs) {
    const iocs = analysis.extractedIOCs;
    const hasIOCs = iocs.ips.length > 0 || iocs.domains.length > 0;

    if (hasIOCs) {
      prompt += `Extracted IOCs:\n`;
      if (iocs.ips.length > 0) {
        prompt += `- IPs: ${iocs.ips.slice(0, 10).join(', ')}${iocs.ips.length > 10 ? '...' : ''}\n`;
      }
      if (iocs.domains.length > 0) {
        prompt += `- Domains: ${iocs.domains.slice(0, 10).join(', ')}${iocs.domains.length > 10 ? '...' : ''}\n`;
      }
      prompt += `\n`;
    }
  }

  // Mode-specific instructions
  if (mode === 'quick') {
    prompt += `Provide a brief summary of the log analysis:\n`;
    prompt += `1. Overall system health\n`;
    prompt += `2. Any critical issues or anomalies\n`;
    prompt += `3. Immediate action items (if any)\n`;
  } else if (mode === 'full') {
    prompt += `Provide a comprehensive log analysis including:\n`;
    prompt += `1. Detailed security assessment\n`;
    prompt += `2. Analysis of all detected anomalies\n`;
    prompt += `3. Patterns and trends in the logs\n`;
    prompt += `4. Risk assessment\n`;
    prompt += `5. Prioritized recommendations\n`;
  } else if (mode === 'threat-hunt') {
    prompt += `Perform threat hunting analysis focusing on:\n`;
    prompt += `1. Indicators of compromise and malicious activity\n`;
    prompt += `2. Attack patterns and techniques (MITRE ATT&CK)\n`;
    prompt += `3. Lateral movement or persistence mechanisms\n`;
    prompt += `4. Data exfiltration attempts\n`;
    prompt += `5. Timeline of suspicious events\n`;
    prompt += `6. Actionable threat intelligence\n`;
    prompt += `7. Incident response recommendations\n`;
  }

  return prompt;
}
