import fs from 'fs';
import { promisify } from 'util';
import type {
  PcapAnalysis,
  ParsedPacket,
  ProtocolStats,
  ConversationStats,
  EndpointStats,
} from './PcapAnalyzer.js';
import { ui } from '../../utils/ui.js';

const writeFile = promisify(fs.writeFile);

/**
 * PcapReporter - Formats and exports pcap analysis results
 */
export class PcapReporter {
  /**
   * Display analysis summary in terminal
   */
  displaySummary(analysis: PcapAnalysis): void {
    ui.section(`📊 PCAP Analysis Summary: ${analysis.filename}`);
    console.log('');

    // File information
    ui.info('File Information');
    console.log(`  File Size: ${this.formatBytes(analysis.fileSize)}`);
    console.log(`  Total Packets: ${analysis.packetCount.toLocaleString()}`);
    console.log(`  Total Bytes: ${this.formatBytes(analysis.totalBytes)}`);
    console.log(`  Capture Start: ${analysis.captureStartTime.toISOString()}`);
    console.log(`  Capture End: ${analysis.captureEndTime.toISOString()}`);
    console.log(`  Duration: ${this.formatDuration(analysis.captureDuration)}`);
    console.log('');

    // Protocol statistics
    if (analysis.protocolStats.length > 0) {
      ui.info('Protocol Distribution');
      const maxProtocolLen = Math.max(...analysis.protocolStats.map(p => p.protocol.length));

      for (const stat of analysis.protocolStats.slice(0, 10)) {
        const bar = this.createBar(stat.percentage, 30);
        console.log(
          `  ${stat.protocol.padEnd(maxProtocolLen)} ${bar} ` +
          `${stat.percentage.toFixed(1)}% (${stat.packets.toLocaleString()} packets, ` +
          `${this.formatBytes(stat.bytes)})`
        );
      }
      console.log('');
    }

    // Top conversations
    if (analysis.conversations.length > 0) {
      ui.info(`Top Conversations (showing ${Math.min(10, analysis.conversations.length)} of ${analysis.conversations.length})`);
      for (const conv of analysis.conversations.slice(0, 10)) {
        console.log(
          `  ${conv.protocol} ${conv.sourceAddr}:${conv.sourcePort} ↔ ` +
          `${conv.destAddr}:${conv.destPort}`
        );
        console.log(
          `    Packets: ${conv.packets.toLocaleString()}, ` +
          `Bytes: ${this.formatBytes(conv.bytes)}, ` +
          `Duration: ${this.formatDuration(conv.duration)}`
        );
      }
      console.log('');
    }

    // Top endpoints
    if (analysis.endpoints.size > 0) {
      ui.info(`Top Endpoints (showing top 10 of ${analysis.endpoints.size})`);
      const sortedEndpoints = Array.from(analysis.endpoints.values())
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 10);

      for (const endpoint of sortedEndpoints) {
        console.log(
          `  ${endpoint.address.padEnd(45)} ` +
          `${endpoint.packets.toString().padStart(8)} packets, ` +
          `${this.formatBytes(endpoint.bytes).padStart(10)}, ` +
          `${endpoint.ports.size} ports`
        );
      }
      console.log('');
    }

    // DNS queries
    if (analysis.dnsQueries.length > 0) {
      ui.info(`DNS Queries (showing ${Math.min(10, analysis.dnsQueries.length)} of ${analysis.dnsQueries.length})`);
      const uniqueQueries = new Map<string, number>();
      for (const query of analysis.dnsQueries) {
        uniqueQueries.set(query.query, (uniqueQueries.get(query.query) || 0) + 1);
      }

      const sortedQueries = Array.from(uniqueQueries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      for (const [query, count] of sortedQueries) {
        console.log(`  ${query.padEnd(50)} (${count}x)`);
      }
      console.log('');
    }

    // HTTP requests
    if (analysis.httpRequests.length > 0) {
      ui.info(`HTTP Requests (showing ${Math.min(10, analysis.httpRequests.length)} of ${analysis.httpRequests.length})`);
      for (const req of analysis.httpRequests.slice(0, 10)) {
        console.log(`  ${req.method.padEnd(7)} ${req.host}${req.path}`);
        if (req.userAgent) {
          console.log(`    User-Agent: ${req.userAgent}`);
        }
      }
      console.log('');
    }

    // Alerts
    if (analysis.alerts.length > 0) {
      ui.warning(`🚨 Security Alerts (${analysis.alerts.length})`);
      for (const alert of analysis.alerts) {
        console.log(`  • ${alert}`);
      }
      console.log('');
    }
  }

  /**
   * Display packet list
   */
  displayPackets(packets: ParsedPacket[], maxPackets = 50): void {
    ui.section('📦 Packet List');
    console.log('');

    const displayCount = Math.min(packets.length, maxPackets);
    console.log(`Showing ${displayCount} of ${packets.length} packets\n`);

    // Header
    console.log(
      'No.'.padEnd(8) +
      'Time'.padEnd(15) +
      'Source'.padEnd(20) +
      'Destination'.padEnd(20) +
      'Protocol'.padEnd(12) +
      'Length'.padEnd(10) +
      'Info'
    );
    console.log('─'.repeat(120));

    // Packets
    for (const packet of packets.slice(0, displayCount)) {
      const timeStr = packet.timestamp.toISOString().split('T')[1].substring(0, 12);
      const protocol = packet.protocols[packet.protocols.length - 1] || 'Unknown';

      let source = packet.source;
      if (packet.sourcePort) source += `:${packet.sourcePort}`;

      let dest = packet.destination;
      if (packet.destPort) dest += `:${packet.destPort}`;

      console.log(
        packet.number.toString().padEnd(8) +
        timeStr.padEnd(15) +
        source.substring(0, 19).padEnd(20) +
        dest.substring(0, 19).padEnd(20) +
        protocol.padEnd(12) +
        packet.length.toString().padEnd(10) +
        packet.info.substring(0, 40)
      );
    }

    if (packets.length > displayCount) {
      console.log(`\n... ${packets.length - displayCount} more packets ...`);
    }
    console.log('');
  }

  /**
   * Export analysis to JSON
   */
  async exportJson(analysis: PcapAnalysis, filePath: string): Promise<void> {
    const data = {
      ...analysis,
      endpoints: Array.from(analysis.endpoints.entries()).map(([_, stats]) => ({
        ...stats,
        ports: Array.from(stats.ports),
      })),
    };

    await writeFile(filePath, JSON.stringify(data, null, 2));
    ui.success(`Exported analysis to ${filePath}`);
  }

  /**
   * Export analysis to Markdown
   */
  async exportMarkdown(analysis: PcapAnalysis, filePath: string): Promise<void> {
    let md = `# PCAP Analysis Report: ${analysis.filename}\n\n`;

    // Summary
    md += `## Summary\n\n`;
    md += `- **File Size**: ${this.formatBytes(analysis.fileSize)}\n`;
    md += `- **Total Packets**: ${analysis.packetCount.toLocaleString()}\n`;
    md += `- **Total Bytes**: ${this.formatBytes(analysis.totalBytes)}\n`;
    md += `- **Capture Start**: ${analysis.captureStartTime.toISOString()}\n`;
    md += `- **Capture End**: ${analysis.captureEndTime.toISOString()}\n`;
    md += `- **Duration**: ${this.formatDuration(analysis.captureDuration)}\n\n`;

    // Protocol statistics
    if (analysis.protocolStats.length > 0) {
      md += `## Protocol Distribution\n\n`;
      md += `| Protocol | Packets | Bytes | Percentage |\n`;
      md += `|----------|---------|-------|------------|\n`;
      for (const stat of analysis.protocolStats) {
        md += `| ${stat.protocol} | ${stat.packets.toLocaleString()} | `;
        md += `${this.formatBytes(stat.bytes)} | ${stat.percentage.toFixed(2)}% |\n`;
      }
      md += `\n`;
    }

    // Top conversations
    if (analysis.conversations.length > 0) {
      md += `## Top Conversations\n\n`;
      md += `| Protocol | Source | Destination | Packets | Bytes | Duration |\n`;
      md += `|----------|--------|-------------|---------|-------|----------|\n`;
      for (const conv of analysis.conversations.slice(0, 20)) {
        md += `| ${conv.protocol} | ${conv.sourceAddr}:${conv.sourcePort} | `;
        md += `${conv.destAddr}:${conv.destPort} | ${conv.packets.toLocaleString()} | `;
        md += `${this.formatBytes(conv.bytes)} | ${this.formatDuration(conv.duration)} |\n`;
      }
      md += `\n`;
    }

    // Top endpoints
    if (analysis.endpoints.size > 0) {
      md += `## Top Endpoints\n\n`;
      md += `| Address | Packets | Bytes | Ports |\n`;
      md += `|---------|---------|-------|-------|\n`;
      const sortedEndpoints = Array.from(analysis.endpoints.values())
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 20);
      for (const endpoint of sortedEndpoints) {
        md += `| ${endpoint.address} | ${endpoint.packets.toLocaleString()} | `;
        md += `${this.formatBytes(endpoint.bytes)} | ${endpoint.ports.size} |\n`;
      }
      md += `\n`;
    }

    // DNS queries
    if (analysis.dnsQueries.length > 0) {
      md += `## DNS Queries\n\n`;
      const uniqueQueries = new Map<string, number>();
      for (const query of analysis.dnsQueries) {
        uniqueQueries.set(query.query, (uniqueQueries.get(query.query) || 0) + 1);
      }
      md += `| Query | Count |\n`;
      md += `|-------|-------|\n`;
      const sortedQueries = Array.from(uniqueQueries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
      for (const [query, count] of sortedQueries) {
        md += `| ${query} | ${count} |\n`;
      }
      md += `\n`;
    }

    // HTTP requests
    if (analysis.httpRequests.length > 0) {
      md += `## HTTP Requests\n\n`;
      md += `| Method | Host | Path | Source |\n`;
      md += `|--------|------|------|--------|\n`;
      for (const req of analysis.httpRequests.slice(0, 50)) {
        md += `| ${req.method} | ${req.host} | ${req.path} | ${req.source} |\n`;
      }
      md += `\n`;
    }

    // Alerts
    if (analysis.alerts.length > 0) {
      md += `## Security Alerts\n\n`;
      for (const alert of analysis.alerts) {
        md += `- ⚠️ ${alert}\n`;
      }
      md += `\n`;
    }

    await writeFile(filePath, md);
    ui.success(`Exported report to ${filePath}`);
  }

  /**
   * Export packets to CSV
   */
  async exportCsv(packets: ParsedPacket[], filePath: string): Promise<void> {
    let csv = 'Number,Timestamp,Source,Source Port,Destination,Dest Port,Protocol,Length,Info\n';

    for (const packet of packets) {
      const protocol = packet.protocols.join('/');
      const info = packet.info.replace(/"/g, '""'); // Escape quotes
      csv += `${packet.number},${packet.timestamp.toISOString()},`;
      csv += `${packet.source},${packet.sourcePort || ''},`;
      csv += `${packet.destination},${packet.destPort || ''},`;
      csv += `${protocol},${packet.length},"${info}"\n`;
    }

    await writeFile(filePath, csv);
    ui.success(`Exported packets to ${filePath}`);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Format duration to human-readable string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  /**
   * Create a progress bar
   */
  private createBar(percentage: number, width: number): string {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const filled = Math.round((clampedPercentage / 100) * width);
    const empty = Math.max(0, width - filled);
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}