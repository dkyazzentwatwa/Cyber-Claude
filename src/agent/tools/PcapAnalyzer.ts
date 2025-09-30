import fs from 'fs';
import { promisify } from 'util';
import pcap from 'pcap-parser';
import { EventEmitter } from 'events';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

/**
 * Pcap packet structure
 */
export interface PcapPacket {
  timestamp: Date;
  length: number;
  captureLength: number;
  data: Buffer;
}

/**
 * Parsed packet with protocol information
 */
export interface ParsedPacket {
  number: number;
  timestamp: Date;
  length: number;
  protocols: string[];
  source: string;
  destination: string;
  sourcePort?: number;
  destPort?: number;
  info: string;
  data: Buffer;
}

/**
 * Protocol statistics
 */
export interface ProtocolStats {
  protocol: string;
  packets: number;
  bytes: number;
  percentage: number;
}

/**
 * Conversation (flow) statistics
 */
export interface ConversationStats {
  protocol: string;
  sourceAddr: string;
  sourcePort: number;
  destAddr: string;
  destPort: number;
  packets: number;
  bytes: number;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
}

/**
 * Endpoint statistics
 */
export interface EndpointStats {
  address: string;
  packets: number;
  bytes: number;
  ports: Set<number>;
}

/**
 * DNS query record
 */
export interface DnsQuery {
  timestamp: Date;
  query: string;
  type: string;
  source: string;
}

/**
 * HTTP request record
 */
export interface HttpRequest {
  timestamp: Date;
  method: string;
  host: string;
  path: string;
  source: string;
  userAgent?: string;
}

/**
 * Pcap analysis results
 */
export interface PcapAnalysis {
  filename: string;
  fileSize: number;
  packetCount: number;
  captureStartTime: Date;
  captureEndTime: Date;
  captureDuration: number; // milliseconds
  totalBytes: number;

  // Statistics
  protocolStats: ProtocolStats[];
  conversations: ConversationStats[];
  endpoints: Map<string, EndpointStats>;

  // Protocol-specific
  dnsQueries: DnsQuery[];
  httpRequests: HttpRequest[];

  // Packets (if requested)
  packets?: ParsedPacket[];

  // Alerts
  alerts: string[];
}

/**
 * Display filter options
 */
export interface DisplayFilter {
  protocol?: string;
  sourceIp?: string;
  destIp?: string;
  sourcePort?: number;
  destPort?: number;
  port?: number; // matches either source or dest port
}

/**
 * Pcap analyzer options
 */
export interface PcapAnalyzerOptions {
  displayFilter?: DisplayFilter;
  includePackets?: boolean;
  maxPackets?: number;
  statisticsOnly?: boolean;
}

/**
 * PcapAnalyzer - Network traffic analysis tool
 * Inspired by Wireshark/tshark functionality
 */
export class PcapAnalyzer {
  /**
   * Analyze a pcap file
   */
  async analyze(
    filePath: string,
    options: PcapAnalyzerOptions = {}
  ): Promise<PcapAnalysis> {
    // Verify file exists
    const stats = await stat(filePath);

    const packets: PcapPacket[] = [];
    let linkType: number | undefined;

    // Parse pcap file
    await new Promise<void>((resolve, reject) => {
      const parser = pcap.parse(filePath);

      parser.on('globalHeader', (header: any) => {
        linkType = header.linkLayerType;
      });

      parser.on('packet', (packet: any) => {
        packets.push({
          timestamp: new Date(packet.header.timestampSeconds * 1000 +
                             packet.header.timestampMicroseconds / 1000),
          length: packet.header.originalLength,
          captureLength: packet.header.captureLength,
          data: packet.data,
        });
      });

      parser.on('end', () => resolve());
      parser.on('error', (err: Error) => reject(err));
    });

    // Parse packets with link type
    const parsedPackets = packets.map((pkt, idx) =>
      this.parsePacket(pkt, idx + 1, linkType || 1)
    );

    // Apply display filter
    let filteredPackets = parsedPackets;
    if (options.displayFilter) {
      filteredPackets = this.applyFilter(parsedPackets, options.displayFilter);
    }

    // Limit packets if requested
    if (options.maxPackets && filteredPackets.length > options.maxPackets) {
      filteredPackets = filteredPackets.slice(0, options.maxPackets);
    }

    // Calculate statistics
    const protocolStats = this.calculateProtocolStats(filteredPackets);
    const conversations = this.extractConversations(filteredPackets);
    const endpoints = this.calculateEndpointStats(filteredPackets);
    const dnsQueries = this.extractDnsQueries(filteredPackets);
    const httpRequests = this.extractHttpRequests(filteredPackets);
    const alerts = this.detectAnomalies(filteredPackets);

    const captureStartTime = packets.length > 0 ? packets[0].timestamp : new Date();
    const captureEndTime = packets.length > 0 ? packets[packets.length - 1].timestamp : new Date();

    return {
      filename: filePath.split('/').pop() || filePath,
      fileSize: stats.size,
      packetCount: filteredPackets.length,
      captureStartTime,
      captureEndTime,
      captureDuration: captureEndTime.getTime() - captureStartTime.getTime(),
      totalBytes: filteredPackets.reduce((sum, pkt) => sum + pkt.length, 0),
      protocolStats,
      conversations,
      endpoints,
      dnsQueries,
      httpRequests,
      alerts,
      packets: options.includePackets ? filteredPackets : undefined,
    };
  }

  /**
   * Parse a single packet
   * @param packet The packet data
   * @param number Packet number
   * @param linkType PCAP link layer type (1=Ethernet, 101=Raw IP, 113=Linux SLL)
   */
  private parsePacket(packet: PcapPacket, number: number, linkType: number): ParsedPacket {
    const data = packet.data;
    const protocols: string[] = [];
    let source = '';
    let destination = '';
    let sourcePort: number | undefined;
    let destPort: number | undefined;
    let info = '';

    // Determine offset to IP header based on link type
    let ipOffset = 0;
    let etherType = 0;

    if (linkType === 1) {
      // Standard Ethernet - 14 byte header
      if (data.length < 14) {
        return {
          number,
          timestamp: packet.timestamp,
          length: packet.length,
          protocols: ['INVALID'],
          source: '',
          destination: '',
          info: 'Packet too short for Ethernet',
          data,
        };
      }
      protocols.push('Ethernet');
      etherType = data.readUInt16BE(12);
      ipOffset = 14;
    } else if (linkType === 101) {
      // Raw IP - no link layer header, starts directly with IP
      if (data.length < 20) {
        return {
          number,
          timestamp: packet.timestamp,
          length: packet.length,
          protocols: ['INVALID'],
          source: '',
          destination: '',
          info: 'Packet too short for IP',
          data,
        };
      }
      // Check IP version
      const version = (data[0] >> 4) & 0x0F;
      if (version === 4) {
        etherType = 0x0800; // IPv4
      } else if (version === 6) {
        etherType = 0x86DD; // IPv6
      }
      ipOffset = 0;
    } else if (linkType === 113) {
      // Linux cooked capture - 16 byte header
      if (data.length < 16) {
        return {
          number,
          timestamp: packet.timestamp,
          length: packet.length,
          protocols: ['INVALID'],
          source: '',
          destination: '',
          info: 'Packet too short for Linux SLL',
          data,
        };
      }
      protocols.push('Linux SLL');
      etherType = data.readUInt16BE(14);
      ipOffset = 16;
    } else {
      // Unknown link type, try to detect
      if (data.length >= 14) {
        const possibleEtherType = data.readUInt16BE(12);
        if (possibleEtherType === 0x0800 || possibleEtherType === 0x86DD || possibleEtherType === 0x0806) {
          protocols.push('Ethernet');
          etherType = possibleEtherType;
          ipOffset = 14;
        } else if (data.length >= 20 && ((data[0] >> 4) & 0x0F) === 4) {
          // Looks like raw IPv4
          etherType = 0x0800;
          ipOffset = 0;
        }
      }
    }

    // Now parse IP layer
    if (etherType === 0x0800 && data.length >= ipOffset + 20) {
      protocols.push('IPv4');

      const ipHeader = data.slice(ipOffset);
      const version = (ipHeader[0] >> 4) & 0x0F;
      const ihl = (ipHeader[0] & 0x0F) * 4; // Internet Header Length in bytes
      const protocol = ipHeader[9];

      source = `${ipHeader[12]}.${ipHeader[13]}.${ipHeader[14]}.${ipHeader[15]}`;
      destination = `${ipHeader[16]}.${ipHeader[17]}.${ipHeader[18]}.${ipHeader[19]}`;

      // TCP
      if (protocol === 6 && data.length >= ipOffset + ihl + 20) {
        protocols.push('TCP');
        const tcpHeader = data.slice(ipOffset + ihl);
        sourcePort = tcpHeader.readUInt16BE(0);
        destPort = tcpHeader.readUInt16BE(2);
        const flags = tcpHeader[13];
        const flagsStr = this.formatTcpFlags(flags);

        info = `${sourcePort} → ${destPort} [${flagsStr}]`;

        // Check for HTTP
        const dataOffset = ((tcpHeader[12] >> 4) & 0x0F) * 4;
        const payload = tcpHeader.slice(dataOffset);

        if (payload.length > 0) {
          const payloadStr = payload.toString('ascii', 0, Math.min(100, payload.length));
          if (payloadStr.startsWith('HTTP/') ||
              payloadStr.startsWith('GET ') ||
              payloadStr.startsWith('POST ') ||
              payloadStr.startsWith('PUT ') ||
              payloadStr.startsWith('DELETE ')) {
            protocols.push('HTTP');
            const firstLine = payloadStr.split('\r\n')[0];
            info = `${sourcePort} → ${destPort} [${flagsStr}] ${firstLine}`;
          }
        }
      }
      // UDP
      else if (protocol === 17 && data.length >= ipOffset + ihl + 8) {
        protocols.push('UDP');
        const udpHeader = data.slice(ipOffset + ihl);
        sourcePort = udpHeader.readUInt16BE(0);
        destPort = udpHeader.readUInt16BE(2);

        info = `${sourcePort} → ${destPort}`;

        // Check for DNS (port 53)
        if (sourcePort === 53 || destPort === 53) {
          protocols.push('DNS');
          const dnsPayload = udpHeader.slice(8);
          if (dnsPayload.length >= 12) {
            const flags = dnsPayload.readUInt16BE(2);
            const isResponse = (flags & 0x8000) !== 0;
            info = `${sourcePort} → ${destPort} ${isResponse ? 'Response' : 'Query'}`;
          }
        }
      }
      // ICMP
      else if (protocol === 1 && data.length >= ipOffset + ihl + 8) {
        protocols.push('ICMP');
        const icmpHeader = data.slice(ipOffset + ihl);
        const type = icmpHeader[0];
        const code = icmpHeader[1];
        info = `Type ${type} Code ${code}`;
      }
    }
    // IPv6
    else if (etherType === 0x86DD && data.length >= ipOffset + 40) {
      protocols.push('IPv6');
      const ipv6Header = data.slice(ipOffset);
      source = this.formatIpv6(ipv6Header.slice(8, 24));
      destination = this.formatIpv6(ipv6Header.slice(24, 40));
      info = `${source} → ${destination}`;
    }
    // ARP (only for Ethernet)
    else if (etherType === 0x0806 && ipOffset > 0 && data.length >= ipOffset + 28) {
      protocols.push('ARP');
      const arpHeader = data.slice(ipOffset);
      const opcode = arpHeader.readUInt16BE(6);
      const senderIp = `${arpHeader[14]}.${arpHeader[15]}.${arpHeader[16]}.${arpHeader[17]}`;
      const targetIp = `${arpHeader[24]}.${arpHeader[25]}.${arpHeader[26]}.${arpHeader[27]}`;
      info = opcode === 1 ? `Who has ${targetIp}? Tell ${senderIp}` :
                            `${senderIp} is at ${this.formatMac(arpHeader.slice(8, 14))}`;
    }

    return {
      number,
      timestamp: packet.timestamp,
      length: packet.length,
      protocols,
      source,
      destination,
      sourcePort,
      destPort,
      info,
      data,
    };
  }

  /**
   * Apply display filter to packets
   */
  private applyFilter(packets: ParsedPacket[], filter: DisplayFilter): ParsedPacket[] {
    return packets.filter(pkt => {
      if (filter.protocol && !pkt.protocols.includes(filter.protocol.toUpperCase())) {
        return false;
      }
      if (filter.sourceIp && pkt.source !== filter.sourceIp) {
        return false;
      }
      if (filter.destIp && pkt.destination !== filter.destIp) {
        return false;
      }
      if (filter.sourcePort && pkt.sourcePort !== filter.sourcePort) {
        return false;
      }
      if (filter.destPort && pkt.destPort !== filter.destPort) {
        return false;
      }
      if (filter.port && pkt.sourcePort !== filter.port && pkt.destPort !== filter.port) {
        return false;
      }
      return true;
    });
  }

  /**
   * Calculate protocol statistics
   */
  private calculateProtocolStats(packets: ParsedPacket[]): ProtocolStats[] {
    const stats = new Map<string, { packets: number; bytes: number }>();
    const totalBytes = packets.reduce((sum, pkt) => sum + pkt.length, 0);

    for (const packet of packets) {
      // Count highest level protocol
      const protocol = packet.protocols[packet.protocols.length - 1] || 'Unknown';
      const existing = stats.get(protocol) || { packets: 0, bytes: 0 };
      stats.set(protocol, {
        packets: existing.packets + 1,
        bytes: existing.bytes + packet.length,
      });
    }

    const result: ProtocolStats[] = [];
    for (const [protocol, data] of stats.entries()) {
      result.push({
        protocol,
        packets: data.packets,
        bytes: data.bytes,
        percentage: totalBytes > 0 ? (data.bytes / totalBytes) * 100 : 0,
      });
    }

    return result.sort((a, b) => b.bytes - a.bytes);
  }

  /**
   * Extract conversation (flow) statistics
   */
  private extractConversations(packets: ParsedPacket[]): ConversationStats[] {
    const conversations = new Map<string, ConversationStats>();

    for (const packet of packets) {
      if (!packet.sourcePort || !packet.destPort) continue;

      const protocol = packet.protocols.includes('TCP') ? 'TCP' :
                      packet.protocols.includes('UDP') ? 'UDP' : 'Unknown';

      // Create bidirectional conversation key
      const key1 = `${protocol}:${packet.source}:${packet.sourcePort}-${packet.destination}:${packet.destPort}`;
      const key2 = `${protocol}:${packet.destination}:${packet.destPort}-${packet.source}:${packet.sourcePort}`;

      const existingKey = conversations.has(key1) ? key1 : conversations.has(key2) ? key2 : key1;

      const existing = conversations.get(existingKey);
      if (existing) {
        existing.packets++;
        existing.bytes += packet.length;
        existing.endTime = packet.timestamp;
        existing.duration = existing.endTime.getTime() - existing.startTime.getTime();
      } else {
        conversations.set(existingKey, {
          protocol,
          sourceAddr: packet.source,
          sourcePort: packet.sourcePort,
          destAddr: packet.destination,
          destPort: packet.destPort,
          packets: 1,
          bytes: packet.length,
          startTime: packet.timestamp,
          endTime: packet.timestamp,
          duration: 0,
        });
      }
    }

    return Array.from(conversations.values())
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 50); // Top 50 conversations
  }

  /**
   * Calculate endpoint statistics
   */
  private calculateEndpointStats(packets: ParsedPacket[]): Map<string, EndpointStats> {
    const endpoints = new Map<string, EndpointStats>();

    for (const packet of packets) {
      // Source endpoint
      if (packet.source) {
        const src = endpoints.get(packet.source) || {
          address: packet.source,
          packets: 0,
          bytes: 0,
          ports: new Set<number>(),
        };
        src.packets++;
        src.bytes += packet.length;
        if (packet.sourcePort) src.ports.add(packet.sourcePort);
        endpoints.set(packet.source, src);
      }

      // Destination endpoint
      if (packet.destination) {
        const dst = endpoints.get(packet.destination) || {
          address: packet.destination,
          packets: 0,
          bytes: 0,
          ports: new Set<number>(),
        };
        dst.packets++;
        dst.bytes += packet.length;
        if (packet.destPort) dst.ports.add(packet.destPort);
        endpoints.set(packet.destination, dst);
      }
    }

    return endpoints;
  }

  /**
   * Extract DNS queries
   */
  private extractDnsQueries(packets: ParsedPacket[]): DnsQuery[] {
    const queries: DnsQuery[] = [];

    for (const packet of packets) {
      if (!packet.protocols.includes('DNS')) continue;

      // Parse DNS query from UDP payload
      // This is a simplified parser
      const dnsPayload = this.extractDnsPayload(packet.data);
      if (dnsPayload && dnsPayload.length >= 12) {
        const flags = dnsPayload.readUInt16BE(2);
        const isQuery = (flags & 0x8000) === 0;

        if (isQuery) {
          // Try to parse the query name
          const queryName = this.parseDnsName(dnsPayload, 12);
          if (queryName) {
            queries.push({
              timestamp: packet.timestamp,
              query: queryName,
              type: 'A', // Simplified - would need to parse QTYPE
              source: packet.source,
            });
          }
        }
      }
    }

    return queries;
  }

  /**
   * Extract HTTP requests
   */
  private extractHttpRequests(packets: ParsedPacket[]): HttpRequest[] {
    const requests: HttpRequest[] = [];

    for (const packet of packets) {
      if (!packet.protocols.includes('HTTP')) continue;

      const payload = this.extractHttpPayload(packet.data);
      if (!payload) continue;

      const payloadStr = payload.toString('utf8');
      const lines = payloadStr.split('\r\n');

      if (lines.length === 0) continue;

      const requestLine = lines[0];
      const match = requestLine.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) (.+) HTTP\//);

      if (match) {
        const method = match[1];
        const path = match[2];

        // Extract Host header
        let host = '';
        let userAgent = '';
        for (const line of lines.slice(1)) {
          if (line.toLowerCase().startsWith('host:')) {
            host = line.substring(5).trim();
          } else if (line.toLowerCase().startsWith('user-agent:')) {
            userAgent = line.substring(11).trim();
          }
        }

        requests.push({
          timestamp: packet.timestamp,
          method,
          host: host || packet.destination,
          path,
          source: packet.source,
          userAgent: userAgent || undefined,
        });
      }
    }

    return requests;
  }

  /**
   * Detect anomalies and generate alerts
   */
  private detectAnomalies(packets: ParsedPacket[]): string[] {
    const alerts: string[] = [];

    // Port scan detection
    const portScans = this.detectPortScans(packets);
    alerts.push(...portScans);

    // Large number of DNS queries
    const dnsPackets = packets.filter(p => p.protocols.includes('DNS'));
    if (dnsPackets.length > 100) {
      alerts.push(`High DNS activity: ${dnsPackets.length} DNS packets detected`);
    }

    // Check for common malicious ports
    const suspiciousPorts = [4444, 5555, 31337, 12345, 6666, 6667];
    for (const packet of packets) {
      if (packet.sourcePort && suspiciousPorts.includes(packet.sourcePort)) {
        alerts.push(`Suspicious source port detected: ${packet.sourcePort} from ${packet.source}`);
      }
      if (packet.destPort && suspiciousPorts.includes(packet.destPort)) {
        alerts.push(`Suspicious destination port detected: ${packet.destPort} to ${packet.destination}`);
      }
    }

    // Unencrypted HTTP traffic
    const httpPackets = packets.filter(p => p.protocols.includes('HTTP'));
    if (httpPackets.length > 10) {
      alerts.push(`Unencrypted HTTP traffic detected: ${httpPackets.length} packets`);
    }

    return [...new Set(alerts)]; // Remove duplicates
  }

  /**
   * Detect port scans
   */
  private detectPortScans(packets: ParsedPacket[]): string[] {
    const alerts: string[] = [];
    const sourceDestPorts = new Map<string, Set<number>>();

    for (const packet of packets) {
      if (!packet.destPort) continue;

      const key = `${packet.source}->${packet.destination}`;
      const ports = sourceDestPorts.get(key) || new Set<number>();
      ports.add(packet.destPort);
      sourceDestPorts.set(key, ports);
    }

    for (const [key, ports] of sourceDestPorts.entries()) {
      if (ports.size > 20) {
        const [source, dest] = key.split('->');
        alerts.push(`Possible port scan: ${source} → ${dest} (${ports.size} ports)`);
      }
    }

    return alerts;
  }

  /**
   * Format MAC address
   */
  private formatMac(buffer: Buffer): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':');
  }

  /**
   * Format IPv6 address
   */
  private formatIpv6(buffer: Buffer): string {
    const parts: string[] = [];
    for (let i = 0; i < 16; i += 2) {
      parts.push(buffer.readUInt16BE(i).toString(16));
    }
    return parts.join(':');
  }

  /**
   * Format TCP flags
   */
  private formatTcpFlags(flags: number): string {
    const flagStr: string[] = [];
    if (flags & 0x02) flagStr.push('SYN');
    if (flags & 0x10) flagStr.push('ACK');
    if (flags & 0x01) flagStr.push('FIN');
    if (flags & 0x04) flagStr.push('RST');
    if (flags & 0x08) flagStr.push('PSH');
    if (flags & 0x20) flagStr.push('URG');
    return flagStr.join(',') || 'NONE';
  }

  /**
   * Extract DNS payload from packet
   * Handles both Ethernet and Raw IP formats
   */
  private extractDnsPayload(data: Buffer): Buffer | null {
    // Try to detect IP header start
    let ipOffset = 0;

    // Check if it starts with IP (version 4 or 6)
    const firstByte = data[0];
    const version = (firstByte >> 4) & 0x0F;

    if (version === 4) {
      // Starts with IPv4, no link layer
      ipOffset = 0;
    } else if (data.length >= 14) {
      // Assume Ethernet
      const etherType = data.readUInt16BE(12);
      if (etherType === 0x0800) {
        ipOffset = 14;
      } else if (data.length >= 16 && data.readUInt16BE(14) === 0x0800) {
        // Linux SLL
        ipOffset = 16;
      } else {
        return null;
      }
    } else {
      return null;
    }

    if (data.length < ipOffset + 28) return null;

    // Variable IP header length
    const ipHeader = data.slice(ipOffset);
    const ihl = (ipHeader[0] & 0x0F) * 4;

    const udpStart = ipOffset + ihl;
    if (data.length < udpStart + 8) return null;

    return data.slice(udpStart + 8);
  }

  /**
   * Parse DNS name from DNS packet
   */
  private parseDnsName(buffer: Buffer, offset: number): string | null {
    try {
      const parts: string[] = [];
      let pos = offset;

      while (pos < buffer.length) {
        const len = buffer[pos];
        if (len === 0) break;
        if (len > 63) break; // Probably a pointer, skip for now

        pos++;
        if (pos + len > buffer.length) break;

        parts.push(buffer.toString('utf8', pos, pos + len));
        pos += len;
      }

      return parts.length > 0 ? parts.join('.') : null;
    } catch {
      return null;
    }
  }

  /**
   * Extract HTTP payload from packet
   * Handles both Ethernet and Raw IP formats
   */
  private extractHttpPayload(data: Buffer): Buffer | null {
    // Try to detect IP header start
    let ipOffset = 0;

    // Check if it starts with IP (version 4 or 6)
    const firstByte = data[0];
    const version = (firstByte >> 4) & 0x0F;

    if (version === 4) {
      // Starts with IPv4, no link layer
      ipOffset = 0;
    } else if (data.length >= 14) {
      // Assume Ethernet
      const etherType = data.readUInt16BE(12);
      if (etherType === 0x0800) {
        ipOffset = 14;
      } else if (data.length >= 16 && data.readUInt16BE(14) === 0x0800) {
        // Linux SLL
        ipOffset = 16;
      } else {
        return null;
      }
    } else {
      return null;
    }

    if (data.length < ipOffset + 40) return null;

    const ipHeader = data.slice(ipOffset);
    const ihl = (ipHeader[0] & 0x0F) * 4;

    const tcpStart = ipOffset + ihl;
    if (data.length < tcpStart + 20) return null;

    const tcpHeader = data.slice(tcpStart);
    const dataOffset = ((tcpHeader[12] >> 4) & 0x0F) * 4;

    const payloadStart = tcpStart + dataOffset;
    if (data.length <= payloadStart) return null;

    return data.slice(payloadStart);
  }
}