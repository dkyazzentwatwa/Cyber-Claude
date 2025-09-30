import { Command } from 'commander';
import { PcapAnalyzer, DisplayFilter } from '../../agent/tools/PcapAnalyzer.js';
import { PcapReporter } from '../../agent/tools/PcapReporter.js';
import { CyberAgent } from '../../agent/core.js';
import { config } from '../../utils/config.js';
import { ui } from '../../utils/ui.js';
import { logger } from '../../utils/logger.js';
import { getModelByKey } from '../../utils/models.js';
import { IOCExtractor } from '../../utils/ioc.js';
import { MitreMapper } from '../../utils/mitre.js';
import { EvidenceManager, EvidenceReport } from '../../utils/evidence.js';

/**
 * Create pcap analysis command
 */
export function createPcapCommand(): Command {
  const cmd = new Command('pcap');

  cmd
    .description('Analyze network capture files (.pcap, .pcapng)')
    .argument('<file>', 'Path to pcap file')
    .option('-m, --mode <mode>', 'Analysis mode: quick, full, or threat-hunt', 'quick')
    .option('--model <model>', 'AI model to use (model key)', 'sonnet-4.5')
    .option('-f, --filter <filter>', 'Display filter (e.g., "tcp", "udp", "dns")')
    .option('--src <ip>', 'Filter by source IP address')
    .option('--dst <ip>', 'Filter by destination IP address')
    .option('--port <port>', 'Filter by port (source or destination)', parseInt)
    .option('--sport <port>', 'Filter by source port', parseInt)
    .option('--dport <port>', 'Filter by destination port', parseInt)
    .option('--packets', 'Display packet list (up to 50 packets)')
    .option('--max-packets <n>', 'Maximum packets to analyze', parseInt)
    .option('--stats-only', 'Show only statistics without AI analysis')
    .option('--extract-iocs', 'Extract and display IOCs (IPs, domains, etc.)')
    .option('--mitre', 'Map findings to MITRE ATT&CK techniques')
    .option('--preserve-evidence', 'Generate evidence metadata with hashes')
    .option('--case-number <number>', 'Case number for evidence tracking')
    .option('--analyst <name>', 'Analyst name for chain of custody')
    .option('--export-json <file>', 'Export analysis to JSON file')
    .option('--export-md <file>', 'Export report to Markdown file')
    .option('--export-csv <file>', 'Export packets to CSV file')
    .option('--export-iocs <file>', 'Export IOCs in STIX 2.1 format')
    .action(async (file: string, options: any) => {
      try {
        ui.banner();

        const mode = options.mode.toLowerCase();
        if (!['quick', 'full', 'threat-hunt'].includes(mode)) {
          ui.error('Invalid mode. Choose: quick, full, or threat-hunt');
          process.exit(1);
        }

        // Build display filter
        const displayFilter: DisplayFilter = {};
        if (options.filter) displayFilter.protocol = options.filter;
        if (options.src) displayFilter.sourceIp = options.src;
        if (options.dst) displayFilter.destIp = options.dst;
        if (options.port) displayFilter.port = options.port;
        if (options.sport) displayFilter.sourcePort = options.sport;
        if (options.dport) displayFilter.destPort = options.dport;

        const hasFilter = Object.keys(displayFilter).length > 0;

        // Show analysis mode
        const modeEmoji = mode === 'quick' ? '⚡' :
                         mode === 'full' ? '🔍' : '🎯';
        ui.section(`${modeEmoji} ${mode.toUpperCase()} Analysis Mode`);
        console.log('');

        if (hasFilter) {
          ui.info('Display Filters Applied:');
          if (displayFilter.protocol) console.log(`  Protocol: ${displayFilter.protocol}`);
          if (displayFilter.sourceIp) console.log(`  Source IP: ${displayFilter.sourceIp}`);
          if (displayFilter.destIp) console.log(`  Dest IP: ${displayFilter.destIp}`);
          if (displayFilter.port) console.log(`  Port: ${displayFilter.port}`);
          if (displayFilter.sourcePort) console.log(`  Source Port: ${displayFilter.sourcePort}`);
          if (displayFilter.destPort) console.log(`  Dest Port: ${displayFilter.destPort}`);
          console.log('');
        }

        // Analyze pcap
        const spinner = ui.spinner('Parsing pcap file...').start();
        const analyzer = new PcapAnalyzer();
        const reporter = new PcapReporter();

        const analysis = await analyzer.analyze(file, {
          displayFilter: hasFilter ? displayFilter : undefined,
          includePackets: options.packets || options.exportCsv,
          maxPackets: options.maxPackets,
          statisticsOnly: options.statsOnly,
        });

        spinner.succeed('Pcap file parsed successfully');
        console.log('');

        // Display results
        reporter.displaySummary(analysis);

        // Display packets if requested
        if (options.packets && analysis.packets) {
          reporter.displayPackets(analysis.packets);
        }

        // AI analysis
        if (!options.statsOnly) {
          const model = getModelByKey(options.model);
          if (!model) {
            ui.error(`Model '${options.model}' not found`);
            process.exit(1);
          }

          ui.section(`🤖 AI Analysis (${model.name})`);
          console.log('');

          const aiSpinner = ui.spinner('Analyzing network traffic...').start();

          const agent = new CyberAgent({
            apiKey: config.anthropicApiKey,
            googleApiKey: config.googleApiKey,
            model: model.id,
            mode: 'blueteam', // Use blueteam mode for traffic analysis
          });

          // Prepare analysis data
          const analysisPrompt = buildAnalysisPrompt(analysis, mode);

          const response = await agent.analyze(analysisPrompt, 'network traffic analysis');

          aiSpinner.stop();
          console.log(ui.formatAIResponse(response));
          console.log('');
        }

        // IOC Extraction
        if (options.extractIocs) {
          ui.section('🔍 Indicator of Compromise (IOC) Extraction');
          console.log('');

          const iocExtractor = new IOCExtractor();

          // Extract IOCs from DNS queries
          for (const query of analysis.dnsQueries) {
            iocExtractor.extractFromText(query.query, 'DNS Query');
          }

          // Extract IOCs from HTTP requests
          for (const req of analysis.httpRequests) {
            iocExtractor.extractFromText(`${req.host}${req.path}`, 'HTTP Request');
            if (req.userAgent) {
              iocExtractor.extractFromText(req.userAgent, 'User-Agent');
            }
          }

          // Extract IOCs from alerts
          for (const alert of analysis.alerts) {
            iocExtractor.extractFromText(alert, 'Alert');
          }

          const iocReport = iocExtractor.getReport();

          if (iocReport.totalCount > 0) {
            console.log(`Found ${iocReport.totalCount} unique IOCs:\n`);

            if (iocReport.ips.length > 0) {
              ui.info(`IP Addresses (${iocReport.ips.length}):`);
              for (const ioc of iocReport.ips.slice(0, 20)) {
                console.log(`  ${ioc.value} (seen ${ioc.count}x) - ${ioc.context || 'N/A'}`);
              }
              console.log('');
            }

            if (iocReport.domains.length > 0) {
              ui.info(`Domains (${iocReport.domains.length}):`);
              for (const ioc of iocReport.domains.slice(0, 20)) {
                console.log(`  ${ioc.value} (seen ${ioc.count}x) - ${ioc.context || 'N/A'}`);
              }
              console.log('');
            }

            if (iocReport.urls.length > 0) {
              ui.info(`URLs (${iocReport.urls.length}):`);
              for (const ioc of iocReport.urls.slice(0, 10)) {
                console.log(`  ${ioc.value}`);
              }
              console.log('');
            }

            if (options.exportIocs) {
              const stix = iocExtractor.exportSTIX();
              await require('fs').promises.writeFile(options.exportIocs, stix);
              ui.success(`Exported IOCs in STIX 2.1 format to ${options.exportIocs}`);
              console.log('');
            }
          } else {
            console.log('No IOCs extracted from traffic.\n');
          }
        }

        // MITRE ATT&CK Mapping
        if (options.mitre) {
          ui.section('🎯 MITRE ATT&CK Technique Mapping');
          console.log('');

          const mapper = new MitreMapper();
          const allMappings = [];

          // Map alerts to techniques
          for (const alert of analysis.alerts) {
            const mappings = mapper.mapFinding('Network Alert', alert);
            allMappings.push(...mappings);
          }

          // Map suspicious domains/traffic patterns
          if (analysis.dnsQueries.length > 100) {
            const mappings = mapper.mapFinding(
              'High DNS Activity',
              `${analysis.dnsQueries.length} DNS queries detected`,
              'reconnaissance'
            );
            allMappings.push(...mappings);
          }

          if (allMappings.length > 0) {
            // Remove duplicates
            const uniqueMappings = allMappings.filter(
              (m, i, arr) => arr.findIndex(x => x.technique.id === m.technique.id) === i
            );

            console.log(MitreMapper.formatMappings(uniqueMappings));
          } else {
            console.log('No MITRE ATT&CK techniques mapped for this traffic.\n');
          }
        }

        // Evidence Preservation
        if (options.preserveEvidence) {
          ui.section('📋 Evidence Preservation');
          console.log('');

          const evidenceSpinner = ui.spinner('Calculating cryptographic hashes...').start();

          const evidence = await EvidenceManager.createEvidence(file, {
            collectionMethod: 'Cyber-Claude PCAP Analysis',
            collectedBy: options.analyst || process.env.USER || 'Unknown',
            caseNumber: options.caseNumber,
            description: `Network traffic capture analysis - ${mode} mode`,
          });

          // Add analysis entry to chain of custody
          EvidenceManager.addChainOfCustodyEntry(evidence, {
            action: 'analyzed',
            performedBy: options.analyst || process.env.USER || 'Cyber-Claude',
            notes: `PCAP analyzed in ${mode} mode - ${analysis.packetCount} packets`,
            hashVerified: true,
          });

          evidenceSpinner.succeed('Evidence metadata generated');

          console.log(EvidenceManager.formatMetadata(evidence));

          // Export evidence metadata
          const evidenceFile = `${file}.evidence.json`;
          await EvidenceManager.exportMetadata(evidence, evidenceFile);
          ui.success(`Evidence metadata saved to ${evidenceFile}`);
          console.log('');
        }

        // Export results
        if (options.exportJson) {
          await reporter.exportJson(analysis, options.exportJson);
        }
        if (options.exportMd) {
          await reporter.exportMarkdown(analysis, options.exportMd);
        }
        if (options.exportCsv && analysis.packets) {
          await reporter.exportCsv(analysis.packets, options.exportCsv);
        }

        ui.success('Analysis complete!');
      } catch (error: any) {
        logger.error('Pcap analysis failed:', error);
        ui.error(`Analysis failed: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Build analysis prompt based on mode
 */
function buildAnalysisPrompt(analysis: any, mode: string): string {
  let prompt = `Analyze the following network traffic capture:\n\n`;
  prompt += `File: ${analysis.filename}\n`;
  prompt += `Packets: ${analysis.packetCount.toLocaleString()}\n`;
  prompt += `Duration: ${formatDuration(analysis.captureDuration)}\n\n`;

  // Protocol statistics
  prompt += `Protocol Distribution:\n`;
  for (const stat of analysis.protocolStats.slice(0, 10)) {
    prompt += `- ${stat.protocol}: ${stat.packets} packets (${stat.percentage.toFixed(1)}%)\n`;
  }
  prompt += `\n`;

  // Top conversations
  if (analysis.conversations.length > 0) {
    prompt += `Top Conversations:\n`;
    for (const conv of analysis.conversations.slice(0, 10)) {
      prompt += `- ${conv.protocol} ${conv.sourceAddr}:${conv.sourcePort} ↔ `;
      prompt += `${conv.destAddr}:${conv.destPort} (${conv.packets} packets)\n`;
    }
    prompt += `\n`;
  }

  // DNS queries
  if (analysis.dnsQueries.length > 0) {
    const uniqueQueries = new Map<string, number>();
    for (const query of analysis.dnsQueries) {
      uniqueQueries.set(query.query, (uniqueQueries.get(query.query) || 0) + 1);
    }
    prompt += `DNS Queries (${analysis.dnsQueries.length} total, ${uniqueQueries.size} unique):\n`;
    const sortedQueries = Array.from(uniqueQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    for (const [query, count] of sortedQueries) {
      prompt += `- ${query} (${count}x)\n`;
    }
    prompt += `\n`;
  }

  // HTTP requests
  if (analysis.httpRequests.length > 0) {
    prompt += `HTTP Requests (${analysis.httpRequests.length} total):\n`;
    for (const req of analysis.httpRequests.slice(0, 10)) {
      prompt += `- ${req.method} ${req.host}${req.path}\n`;
    }
    prompt += `\n`;
  }

  // Alerts
  if (analysis.alerts.length > 0) {
    prompt += `⚠️ Detected Alerts:\n`;
    for (const alert of analysis.alerts) {
      prompt += `- ${alert}\n`;
    }
    prompt += `\n`;
  }

  // Mode-specific instructions
  if (mode === 'quick') {
    prompt += `Provide a brief summary of the network traffic, highlighting:\n`;
    prompt += `1. Overall traffic patterns\n`;
    prompt += `2. Any suspicious or unusual activity\n`;
    prompt += `3. Security concerns (if any)\n`;
  } else if (mode === 'full') {
    prompt += `Provide a comprehensive analysis including:\n`;
    prompt += `1. Detailed traffic breakdown by protocol\n`;
    prompt += `2. Communication patterns and flows\n`;
    prompt += `3. Potential security issues or anomalies\n`;
    prompt += `4. DNS and HTTP activity analysis\n`;
    prompt += `5. Recommendations for further investigation\n`;
  } else if (mode === 'threat-hunt') {
    prompt += `Perform threat hunting analysis focusing on:\n`;
    prompt += `1. Indicators of compromise (IOCs)\n`;
    prompt += `2. Command and control (C2) patterns\n`;
    prompt += `3. Data exfiltration attempts\n`;
    prompt += `4. Lateral movement indicators\n`;
    prompt += `5. Suspicious port usage or protocol anomalies\n`;
    prompt += `6. Potential malware communication patterns\n`;
    prompt += `7. Actionable recommendations for incident response\n`;
  }

  return prompt;
}

/**
 * Format duration to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}