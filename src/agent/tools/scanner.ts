import si from 'systeminformation';
import { SecurityFinding, ToolResult } from '../types.js';
import { logger } from '../../utils/logger.js';

export class DesktopScanner {
  /**
   * Scan system information and identify potential security issues
   */
  async scanSystem(): Promise<ToolResult> {
    try {
      logger.info('Starting desktop security scan');

      const [
        osInfo,
        system,
        processes,
        services,
        networkConnections,
        fsSize,
        users,
      ] = await Promise.all([
        si.osInfo(),
        si.system(),
        si.processes(),
        si.services('*'),
        si.networkConnections(),
        si.fsSize(),
        si.users(),
      ]);

      const scanData = {
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          kernel: osInfo.kernel,
          arch: osInfo.arch,
        },
        system: {
          manufacturer: system.manufacturer,
          model: system.model,
          version: system.version,
        },
        processes: {
          all: processes.all,
          running: processes.running,
          list: processes.list.slice(0, 50).map(p => ({
            name: p.name,
            pid: p.pid,
            cpu: p.cpu,
            mem: p.mem,
            user: p.user,
          })),
        },
        services: {
          total: services.length,
          running: services.filter(s => s.running).length,
          services: services.map(s => ({
            name: s.name,
            running: s.running,
            startmode: s.startmode,
          })),
        },
        network: {
          connections: networkConnections.length,
          established: networkConnections.filter(c => c.state === 'ESTABLISHED').length,
          listening: networkConnections.filter(c => c.state === 'LISTEN').length,
          activeConnections: networkConnections
            .filter(c => c.state === 'ESTABLISHED' || c.state === 'LISTEN')
            .map(c => ({
              protocol: c.protocol,
              localAddress: c.localAddress,
              localPort: c.localPort,
              peerAddress: c.peerAddress,
              peerPort: c.peerPort,
              state: c.state,
            })),
        },
        storage: fsSize.map(fs => ({
          fs: fs.fs,
          type: fs.type,
          size: fs.size,
          used: fs.used,
          available: fs.available,
          use: fs.use,
          mount: fs.mount,
        })),
        users: users.map(u => ({
          user: u.user,
          tty: u.tty,
          date: u.date,
          time: u.time,
        })),
      };

      logger.info('Desktop security scan completed');

      return {
        success: true,
        data: scanData,
        message: 'System scan completed successfully',
      };
    } catch (error) {
      logger.error('Error during system scan:', error);
      return {
        success: false,
        error: `Scan failed: ${error}`,
      };
    }
  }

  /**
   * Get detailed network information
   */
  async scanNetwork(): Promise<ToolResult> {
    try {
      const [networkInterfaces, networkStats, networkConnections] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats(),
        si.networkConnections(),
      ]);

      return {
        success: true,
        data: {
          interfaces: networkInterfaces,
          stats: networkStats,
          connections: networkConnections,
        },
        message: 'Network scan completed',
      };
    } catch (error) {
      logger.error('Error during network scan:', error);
      return {
        success: false,
        error: `Network scan failed: ${error}`,
      };
    }
  }

  /**
   * Quick security health check
   */
  async quickCheck(): Promise<ToolResult> {
    try {
      const [osInfo, processes, networkConnections] = await Promise.all([
        si.osInfo(),
        si.processes(),
        si.networkConnections(),
      ]);

      const findings: SecurityFinding[] = [];

      // Check for suspicious high CPU processes
      const highCpuProcesses = processes.list
        .filter(p => p.cpu > 50)
        .slice(0, 5);

      if (highCpuProcesses.length > 0) {
        findings.push({
          id: 'HIGH_CPU_PROCESS',
          severity: 'info',
          title: 'High CPU Usage Detected',
          description: `Found ${highCpuProcesses.length} processes with >50% CPU usage`,
          category: 'performance',
          timestamp: new Date(),
        });
      }

      // Check for unusual listening ports
      const listeningPorts = networkConnections
        .filter(c => c.state === 'LISTEN')
        .map(c => typeof c.localPort === 'string' ? parseInt(c.localPort, 10) : c.localPort);

      const uncommonPorts = listeningPorts.filter(p =>
        p && typeof p === 'number' && p > 1024 && p < 49152 && ![3000, 5000, 8000, 8080, 9000].includes(p)
      );

      if (uncommonPorts.length > 10) {
        findings.push({
          id: 'MANY_LISTENING_PORTS',
          severity: 'low',
          title: 'Multiple Listening Ports Detected',
          description: `Found ${uncommonPorts.length} uncommon listening ports`,
          remediation: 'Review active services and close unnecessary ports',
          category: 'network',
          timestamp: new Date(),
        });
      }

      // Check established external connections
      const externalConnections = networkConnections
        .filter(c =>
          c.state === 'ESTABLISHED' &&
          c.peerAddress &&
          !c.peerAddress.startsWith('127.') &&
          !c.peerAddress.startsWith('192.168.') &&
          !c.peerAddress.startsWith('10.')
        );

      if (externalConnections.length > 0) {
        findings.push({
          id: 'EXTERNAL_CONNECTIONS',
          severity: 'info',
          title: 'Active External Connections',
          description: `${externalConnections.length} active connections to external IPs`,
          category: 'network',
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: {
          findings,
          summary: {
            os: `${osInfo.distro} ${osInfo.release}`,
            processes: processes.running,
            connections: networkConnections.length,
            timestamp: new Date(),
          },
        },
        message: 'Quick security check completed',
      };
    } catch (error) {
      logger.error('Error during quick check:', error);
      return {
        success: false,
        error: `Quick check failed: ${error}`,
      };
    }
  }
}