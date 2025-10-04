/**
 * External Tool Manager
 * Detects and manages external CLI security tools (nmap, nuclei, ffuf, etc.)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export interface ExternalTool {
  name: string;
  command: string;
  description: string;
  category: 'scanning' | 'reconnaissance' | 'exploitation' | 'analysis';
  available: boolean;
  version?: string;
  installInstructions?: string;
}

export class ExternalToolManager {
  private static toolRegistry: Map<string, ExternalTool> = new Map();
  private static scanned: boolean = false;

  /**
   * Define external tools
   */
  private static tools: Omit<ExternalTool, 'available' | 'version'>[] = [
    {
      name: 'nmap',
      command: 'nmap',
      description: 'Network port scanner and service detector',
      category: 'scanning',
      installInstructions: 'https://nmap.org/download.html',
    },
    {
      name: 'nuclei',
      command: 'nuclei',
      description: 'Fast vulnerability scanner with 5000+ templates',
      category: 'scanning',
      installInstructions: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
    },
    {
      name: 'ffuf',
      command: 'ffuf',
      description: 'Fast web fuzzer for content discovery',
      category: 'reconnaissance',
      installInstructions: 'go install github.com/ffuf/ffuf/v2@latest',
    },
    {
      name: 'sqlmap',
      command: 'sqlmap',
      description: 'Automated SQL injection detection and exploitation',
      category: 'exploitation',
      installInstructions: 'https://sqlmap.org/',
    },
    {
      name: 'wpscan',
      command: 'wpscan',
      description: 'WordPress vulnerability scanner',
      category: 'scanning',
      installInstructions: 'gem install wpscan',
    },
    {
      name: 'testssl',
      command: 'testssl.sh',
      description: 'SSL/TLS vulnerability scanner',
      category: 'scanning',
      installInstructions: 'https://testssl.sh/',
    },
    {
      name: 'gobuster',
      command: 'gobuster',
      description: 'Directory/file and DNS brute forcing tool',
      category: 'reconnaissance',
      installInstructions: 'go install github.com/OJ/gobuster/v3@latest',
    },
    {
      name: 'amass',
      command: 'amass',
      description: 'In-depth attack surface mapping and asset discovery',
      category: 'reconnaissance',
      installInstructions: 'go install -v github.com/owasp-amass/amass/v4/...@master',
    },
    {
      name: 'masscan',
      command: 'masscan',
      description: 'Fast TCP port scanner',
      category: 'scanning',
      installInstructions: 'https://github.com/robertdavidgraham/masscan',
    },
    {
      name: 'subfinder',
      command: 'subfinder',
      description: 'Fast passive subdomain enumeration tool',
      category: 'reconnaissance',
      installInstructions: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
    },
    {
      name: 'httpx',
      command: 'httpx',
      description: 'Fast HTTP toolkit for probing',
      category: 'reconnaissance',
      installInstructions: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
    },
    {
      name: 'katana',
      command: 'katana',
      description: 'Next-generation crawling and spidering framework',
      category: 'reconnaissance',
      installInstructions: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
    },
  ];

  /**
   * Scan system for available external tools
   */
  static async scan(): Promise<Map<string, ExternalTool>> {
    if (this.scanned) {
      return this.toolRegistry;
    }

    logger.info('Scanning for external security tools...');

    for (const toolDef of this.tools) {
      const tool = await this.checkTool(toolDef);
      this.toolRegistry.set(tool.name, tool);
    }

    this.scanned = true;
    const availableCount = Array.from(this.toolRegistry.values()).filter(t => t.available).length;
    logger.info(`Found ${availableCount}/${this.tools.length} external tools`);

    return this.toolRegistry;
  }

  /**
   * Check if a specific tool is available
   */
  private static async checkTool(
    toolDef: Omit<ExternalTool, 'available' | 'version'>
  ): Promise<ExternalTool> {
    try {
      // Try to get version (most tools support --version or -v)
      const versionCommands = ['--version', '-v', '-V', 'version'];

      for (const versionFlag of versionCommands) {
        try {
          const { stdout, stderr } = await execAsync(`${toolDef.command} ${versionFlag}`, {
            timeout: 5000,
          });

          const output = (stdout || stderr).trim();

          if (output) {
            // Extract version number from output
            const versionMatch = output.match(/v?(\d+\.\d+\.?\d*)/);
            const version = versionMatch ? versionMatch[0] : output.split('\n')[0];

            logger.debug(`Found ${toolDef.name} v${version}`);

            return {
              ...toolDef,
              available: true,
              version,
            };
          }
        } catch {}
      }

      // If version check failed, try 'which' command
      await execAsync(`which ${toolDef.command}`);

      return {
        ...toolDef,
        available: true,
        version: 'unknown',
      };

    } catch {
      logger.debug(`${toolDef.name} not found`);
      return {
        ...toolDef,
        available: false,
      };
    }
  }

  /**
   * Get all available tools
   */
  static async getAvailable(): Promise<ExternalTool[]> {
    if (!this.scanned) {
      await this.scan();
    }

    return Array.from(this.toolRegistry.values()).filter(t => t.available);
  }

  /**
   * Get all unavailable tools
   */
  static async getUnavailable(): Promise<ExternalTool[]> {
    if (!this.scanned) {
      await this.scan();
    }

    return Array.from(this.toolRegistry.values()).filter(t => !t.available);
  }

  /**
   * Get tool by name
   */
  static async getTool(name: string): Promise<ExternalTool | undefined> {
    if (!this.scanned) {
      await this.scan();
    }

    return this.toolRegistry.get(name);
  }

  /**
   * Check if a specific tool is available
   */
  static async isAvailable(name: string): Promise<boolean> {
    const tool = await this.getTool(name);
    return tool?.available || false;
  }

  /**
   * Get tools by category
   */
  static async getByCategory(
    category: 'scanning' | 'reconnaissance' | 'exploitation' | 'analysis'
  ): Promise<ExternalTool[]> {
    if (!this.scanned) {
      await this.scan();
    }

    return Array.from(this.toolRegistry.values()).filter(t => t.category === category);
  }

  /**
   * Execute a tool with arguments
   */
  static async execute(
    toolName: string,
    args: string[],
    options: { timeout?: number; maxBuffer?: number } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const tool = await this.getTool(toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found in registry`);
    }

    if (!tool.available) {
      throw new Error(`Tool ${toolName} is not installed. Install it from: ${tool.installInstructions}`);
    }

    logger.info(`Executing ${toolName} ${args.join(' ')}`);

    try {
      const command = `${tool.command} ${args.join(' ')}`;
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 300000, // 5 minutes default
        maxBuffer: options.maxBuffer || 10 * 1024 * 1024, // 10MB
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };

    } catch (error: any) {
      logger.error(`Tool ${toolName} execution failed:`, error);

      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Generate installation guide for missing tools
   */
  static async generateInstallGuide(): Promise<string> {
    const unavailable = await this.getUnavailable();

    if (unavailable.length === 0) {
      return '✅ All external security tools are installed!';
    }

    const lines: string[] = [];
    lines.push(`\n🔧 Missing Security Tools (${unavailable.length})\n`);
    lines.push('The following external tools are not installed but can enhance Cyber Claude:\n');

    const byCategory = {
      scanning: unavailable.filter(t => t.category === 'scanning'),
      reconnaissance: unavailable.filter(t => t.category === 'reconnaissance'),
      exploitation: unavailable.filter(t => t.category === 'exploitation'),
      analysis: unavailable.filter(t => t.category === 'analysis'),
    };

    for (const [category, tools] of Object.entries(byCategory)) {
      if (tools.length === 0) continue;

      lines.push(`${category.toUpperCase()}:`);
      for (const tool of tools) {
        lines.push(`  • ${tool.name} - ${tool.description}`);
        if (tool.installInstructions) {
          lines.push(`    📦 Install: ${tool.installInstructions}`);
        }
        lines.push('');
      }
    }

    lines.push('\n💡 Tip: These tools are optional. Cyber Claude works without them using built-in capabilities.');

    return lines.join('\n');
  }

  /**
   * Generate status report
   */
  static async generateStatusReport(): Promise<string> {
    const available = await this.getAvailable();
    const unavailable = await this.getUnavailable();

    const lines: string[] = [];
    lines.push(`\n🛠️  External Security Tools Status\n`);

    lines.push(`✅ Available: ${available.length}`);
    lines.push(`❌ Not Installed: ${unavailable.length}`);
    lines.push(`📊 Total: ${available.length + unavailable.length}\n`);

    if (available.length > 0) {
      lines.push('INSTALLED TOOLS:');
      for (const tool of available) {
        const version = tool.version || 'unknown version';
        lines.push(`  ✅ ${tool.name} (${version}) - ${tool.description}`);
      }
      lines.push('');
    }

    if (unavailable.length > 0) {
      lines.push('NOT INSTALLED:');
      for (const tool of unavailable) {
        lines.push(`  ❌ ${tool.name} - ${tool.description}`);
      }
      lines.push('');
      lines.push('💡 Run `cyber-claude tools --install-guide` for installation instructions');
    }

    return lines.join('\n');
  }

  /**
   * Reset scan cache (force re-scan)
   */
  static reset(): void {
    this.scanned = false;
    this.toolRegistry.clear();
  }
}
