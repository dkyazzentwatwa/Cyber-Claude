/**
 * IP Geolocation and Reverse IP Lookup Tool
 * Uses free APIs (no API keys required)
 */

import axios from 'axios';
import dns from 'dns';
import { promisify } from 'util';
import { IPGeolocation, ReverseIPResult } from './types.js';
import { logger } from '../../../utils/logger.js';

const reverse = promisify(dns.reverse);

export class IPLookup {
  /**
   * Get geolocation information for an IP address
   * Uses ip-api.com (free, no API key required, 45 requests/minute)
   */
  async geolocate(ip: string): Promise<IPGeolocation> {
    logger.info(`Getting geolocation for IP: ${ip}`);

    try {
      const response = await axios.get(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Cyber-Claude-OSINT/1.0',
          },
        }
      );

      const data = response.data;

      if (data.status === 'fail') {
        throw new Error(data.message || 'Geolocation lookup failed');
      }

      const result: IPGeolocation = {
        ip: data.query || ip,
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName || data.region,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        asn: data.as,
      };

      logger.debug(`Geolocation found: ${result.city}, ${result.country}`);
      return result;
    } catch (error) {
      logger.error(`Geolocation lookup failed for ${ip}:`, error);
      throw new Error(
        `Geolocation lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch geolocate multiple IPs
   */
  async geolocateBatch(ips: string[]): Promise<IPGeolocation[]> {
    const results: IPGeolocation[] = [];

    // Process in small batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (ip) => {
          try {
            return await this.geolocate(ip);
          } catch (error) {
            logger.error(`Failed to geolocate ${ip}:`, error);
            return null;
          }
        })
      );

      results.push(
        ...batchResults.filter((r): r is IPGeolocation => r !== null)
      );

      // Small delay between batches
      if (i + batchSize < ips.length) {
        await this.delay(2000); // 2 second delay to respect rate limits
      }
    }

    return results;
  }

  /**
   * Reverse DNS lookup (get hostnames for IP)
   */
  async reverseDNS(ip: string): Promise<string[]> {
    logger.info(`Performing reverse DNS lookup for: ${ip}`);

    try {
      const hostnames = await reverse(ip);
      logger.debug(`Found ${hostnames.length} hostname(s) for ${ip}`);
      return hostnames;
    } catch (error) {
      logger.debug(`No reverse DNS found for ${ip}`);
      return [];
    }
  }

  /**
   * Reverse IP lookup (find other domains hosted on same IP)
   * Uses HackerTarget API (free, no API key required, limited requests)
   */
  async reverseIP(ip: string): Promise<ReverseIPResult> {
    logger.info(`Performing reverse IP lookup for: ${ip}`);

    try {
      const response = await axios.get(
        `https://api.hackertarget.com/reverseiplookup/?q=${ip}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Cyber-Claude-OSINT/1.0',
          },
        }
      );

      const data = response.data;

      // Check for errors
      if (data.includes('error')) {
        logger.debug(`Reverse IP lookup returned error: ${data}`);
        return {
          ip,
          domains: [],
          total: 0,
          source: 'HackerTarget',
        };
      }

      // Parse domains (newline separated)
      const domains = data
        .split('\n')
        .map((d: string) => d.trim())
        .filter((d: string) => d.length > 0 && !d.includes('API'));

      logger.info(`Found ${domains.length} domains for IP ${ip}`);

      return {
        ip,
        domains,
        total: domains.length,
        source: 'HackerTarget',
      };
    } catch (error) {
      logger.error(`Reverse IP lookup failed for ${ip}:`, error);
      return {
        ip,
        domains: [],
        total: 0,
        source: 'HackerTarget',
      };
    }
  }

  /**
   * Check if IP is in a specific country
   */
  async isInCountry(ip: string, countryCode: string): Promise<boolean> {
    try {
      const geo = await this.geolocate(ip);
      return geo.countryCode?.toUpperCase() === countryCode.toUpperCase();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get ASN information for IP
   */
  async getASN(ip: string): Promise<{
    asn: string;
    org: string;
    isp: string;
  } | null> {
    try {
      const geo = await this.geolocate(ip);
      return {
        asn: geo.asn || 'Unknown',
        org: geo.org || 'Unknown',
        isp: geo.isp || 'Unknown',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if IP is a known hosting provider
   */
  async isHostingProvider(ip: string): Promise<{
    isHosting: boolean;
    provider?: string;
  }> {
    try {
      const geo = await this.geolocate(ip);
      const org = (geo.org || '').toLowerCase();
      const isp = (geo.isp || '').toLowerCase();

      const hostingProviders = [
        'amazon',
        'aws',
        'google',
        'microsoft',
        'azure',
        'digitalocean',
        'linode',
        'vultr',
        'ovh',
        'hetzner',
        'cloudflare',
        'akamai',
        'fastly',
        'godaddy',
        'bluehost',
        'hostgator',
        'dreamhost',
        'rackspace',
      ];

      for (const provider of hostingProviders) {
        if (org.includes(provider) || isp.includes(provider)) {
          return {
            isHosting: true,
            provider: provider.charAt(0).toUpperCase() + provider.slice(1),
          };
        }
      }

      return { isHosting: false };
    } catch (error) {
      return { isHosting: false };
    }
  }

  /**
   * Check if IP is a VPN/Proxy
   * Note: This is a basic check based on ISP/Org names
   */
  async isVPNOrProxy(ip: string): Promise<{
    isVPN: boolean;
    provider?: string;
  }> {
    try {
      const geo = await this.geolocate(ip);
      const org = (geo.org || '').toLowerCase();
      const isp = (geo.isp || '').toLowerCase();

      const vpnProviders = [
        'vpn',
        'proxy',
        'nordvpn',
        'expressvpn',
        'privateinternetaccess',
        'pia',
        'mullvad',
        'protonvpn',
        'surfshark',
        'cyberghost',
        'ipvanish',
        'windscribe',
        'tunnelbear',
      ];

      for (const provider of vpnProviders) {
        if (org.includes(provider) || isp.includes(provider)) {
          return {
            isVPN: true,
            provider: geo.org || geo.isp,
          };
        }
      }

      return { isVPN: false };
    } catch (error) {
      return { isVPN: false };
    }
  }

  /**
   * Analyze IP for security insights
   */
  async analyzeIP(ip: string): Promise<{
    geolocation: IPGeolocation;
    reverseDNS: string[];
    reverseIP: ReverseIPResult;
    insights: {
      isHosting: boolean;
      hostingProvider?: string;
      isVPN: boolean;
      vpnProvider?: string;
      sharedHosting: boolean;
      totalDomainsOnIP: number;
    };
  }> {
    logger.info(`Performing comprehensive IP analysis for: ${ip}`);

    const [geolocation, reverseDNS, reverseIP, hosting, vpn] =
      await Promise.all([
        this.geolocate(ip),
        this.reverseDNS(ip),
        this.reverseIP(ip),
        this.isHostingProvider(ip),
        this.isVPNOrProxy(ip),
      ]);

    return {
      geolocation,
      reverseDNS,
      reverseIP,
      insights: {
        isHosting: hosting.isHosting,
        hostingProvider: hosting.provider,
        isVPN: vpn.isVPN,
        vpnProvider: vpn.provider,
        sharedHosting: reverseIP.total > 1,
        totalDomainsOnIP: reverseIP.total,
      },
    };
  }

  /**
   * Get my own IP address
   */
  async getMyIP(): Promise<string> {
    try {
      const response = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000,
      });
      return response.data.ip;
    } catch (error) {
      logger.error('Failed to get own IP:', error);
      throw new Error('Failed to get own IP address');
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate IP address format
   */
  isValidIP(ip: string): boolean {
    // IPv4 pattern
    const ipv4Pattern =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
  }

  /**
   * Check if IP is private/internal
   */
  isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map((p) => parseInt(p, 10));

    if (parts.length !== 4) return false;

    // 10.0.0.0/8
    if (parts[0] === 10) return true;

    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true;

    return false;
  }
}