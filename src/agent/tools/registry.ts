/**
 * Tool Registry - Complete metadata for all available tools
 * This is the source of truth for autonomous tool selection
 */

import { ToolDefinition } from '../types.js';

/**
 * Built-in security tools
 */
export const BUILTIN_TOOLS: ToolDefinition[] = [
  {
    name: 'scan',
    description: 'Comprehensive security scan (network + web + vulnerabilities)',
    category: 'scanning',
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Target IP, domain, or URL to scan',
        required: true,
      },
      {
        name: 'mode',
        type: 'string',
        description: 'Scan mode: quick, normal, deep',
        required: false,
        default: 'normal',
      },
    ],
    capabilities: [
      'port scanning',
      'service detection',
      'vulnerability assessment',
      'SSL/TLS analysis',
      'web security headers',
    ],
    requiresApproval: true,
    estimatedDuration: 60000,
    riskLevel: 'medium',
    examples: [
      {
        description: 'Quick scan of a web application',
        parameters: { target: 'https://example.com', mode: 'quick' },
      },
      {
        description: 'Deep security audit of internal server',
        parameters: { target: '192.168.1.10', mode: 'deep' },
      },
    ],
  },
  {
    name: 'webscan',
    description: 'Specialized web application security testing',
    category: 'scanning',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Target web application URL',
        required: true,
      },
      {
        name: 'depth',
        type: 'number',
        description: 'Crawl depth (1-5)',
        required: false,
        default: 2,
      },
      {
        name: 'aggressive',
        type: 'boolean',
        description: 'Enable aggressive testing',
        required: false,
        default: false,
      },
    ],
    capabilities: [
      'XSS detection',
      'SQL injection testing',
      'CSRF vulnerability checking',
      'security misconfiguration detection',
      'sensitive data exposure analysis',
    ],
    requiresApproval: true,
    estimatedDuration: 90000,
    riskLevel: 'high',
    examples: [
      {
        description: 'Standard web app security scan',
        parameters: { url: 'https://webapp.example.com', depth: 2 },
      },
      {
        description: 'Aggressive penetration test',
        parameters: { url: 'https://staging.example.com', depth: 3, aggressive: true },
      },
    ],
  },
  {
    name: 'mobilescan',
    description: 'Mobile application security analysis (Android/iOS)',
    category: 'scanning',
    parameters: [
      {
        name: 'file',
        type: 'string',
        description: 'Path to APK or IPA file',
        required: true,
      },
      {
        name: 'scanType',
        type: 'string',
        description: 'Scan type: static or dynamic',
        required: false,
        default: 'static',
      },
    ],
    capabilities: [
      'static code analysis',
      'permission analysis',
      'hardcoded secret detection',
      'insecure data storage detection',
      'binary analysis',
    ],
    requiresApproval: false,
    estimatedDuration: 120000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Analyze Android APK for vulnerabilities',
        parameters: { file: '/path/to/app.apk', scanType: 'static' },
      },
    ],
  },
  {
    name: 'pcap',
    description: 'Network traffic analysis from PCAP files',
    category: 'analysis',
    parameters: [
      {
        name: 'file',
        type: 'string',
        description: 'Path to PCAP file',
        required: true,
      },
      {
        name: 'filter',
        type: 'string',
        description: 'BPF filter expression',
        required: false,
      },
    ],
    capabilities: [
      'protocol analysis',
      'malicious traffic detection',
      'credential extraction',
      'suspicious pattern detection',
      'network forensics',
    ],
    requiresApproval: false,
    estimatedDuration: 30000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Analyze captured network traffic',
        parameters: { file: '/path/to/capture.pcap' },
      },
      {
        description: 'Filter HTTP traffic only',
        parameters: { file: '/path/to/capture.pcap', filter: 'tcp port 80' },
      },
    ],
  },
  {
    name: 'recon',
    description: 'OSINT and reconnaissance on targets',
    category: 'reconnaissance',
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Domain, IP, email, or identifier to investigate',
        required: true,
      },
      {
        name: 'depth',
        type: 'string',
        description: 'Recon depth: surface, standard, deep',
        required: false,
        default: 'standard',
      },
    ],
    capabilities: [
      'subdomain enumeration',
      'DNS reconnaissance',
      'WHOIS lookup',
      'email harvesting',
      'social media discovery',
      'exposed credentials search',
    ],
    requiresApproval: false,
    estimatedDuration: 45000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Gather intel on a domain',
        parameters: { target: 'example.com', depth: 'standard' },
      },
      {
        description: 'Deep OSINT investigation',
        parameters: { target: 'target-company.com', depth: 'deep' },
      },
    ],
  },
  {
    name: 'harden',
    description: 'Security hardening recommendations for systems',
    category: 'analysis',
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'System or service to analyze for hardening',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Type: linux, windows, macos, web, database',
        required: false,
      },
    ],
    capabilities: [
      'configuration audit',
      'security best practice recommendations',
      'compliance checking',
      'vulnerability mitigation guidance',
    ],
    requiresApproval: false,
    estimatedDuration: 20000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Harden Linux server',
        parameters: { target: 'ubuntu-server', type: 'linux' },
      },
    ],
  },
];

/**
 * MCP-based external tools
 * These will be populated when actual working MCP packages are found
 */
export const MCP_TOOLS: ToolDefinition[] = [
  // MCP tool definitions will be added here
];

/*
// Placeholder for future MCP tools
  {
    name: 'nuclei',
    description: 'Fast vulnerability scanner with extensive template library',
    category: 'scanning',
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Target URL or IP',
        required: true,
      },
      {
        name: 'templates',
        type: 'string[]',
        description: 'Specific templates to run',
        required: false,
      },
      {
        name: 'severity',
        type: 'string',
        description: 'Minimum severity: info, low, medium, high, critical',
        required: false,
        default: 'medium',
      },
    ],
    capabilities: [
      'CVE detection',
      'misconfigurations',
      'exposed panels',
      'vulnerable software detection',
    ],
    requiresApproval: true,
    estimatedDuration: 45000,
    riskLevel: 'medium',
    examples: [
      {
        description: 'Scan for critical vulnerabilities',
        parameters: { target: 'https://example.com', severity: 'critical' },
      },
    ],
  },
  {
    name: 'nmap',
    description: 'Network port scanner and service detector',
    category: 'scanning',
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'IP address or hostname',
        required: true,
      },
      {
        name: 'ports',
        type: 'string',
        description: 'Port range (e.g., "1-1000", "80,443")',
        required: false,
        default: 'top-1000',
      },
      {
        name: 'serviceDetection',
        type: 'boolean',
        description: 'Enable service version detection',
        required: false,
        default: true,
      },
    ],
    capabilities: [
      'port scanning',
      'service version detection',
      'OS fingerprinting',
      'NSE script scanning',
    ],
    requiresApproval: true,
    estimatedDuration: 30000,
    riskLevel: 'medium',
    examples: [
      {
        description: 'Scan common ports',
        parameters: { target: '192.168.1.1', ports: 'top-1000' },
      },
    ],
  },
  {
    name: 'sslscan',
    description: 'SSL/TLS configuration and vulnerability scanner',
    category: 'scanning',
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Hostname or IP with SSL/TLS',
        required: true,
      },
      {
        name: 'port',
        type: 'number',
        description: 'Port number',
        required: false,
        default: 443,
      },
    ],
    capabilities: [
      'cipher suite analysis',
      'certificate validation',
      'protocol version checking',
      'Heartbleed detection',
    ],
    requiresApproval: false,
    estimatedDuration: 15000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Analyze SSL/TLS configuration',
        parameters: { target: 'example.com', port: 443 },
      },
    ],
  },
  {
    name: 'sqlmap',
    description: 'Automated SQL injection detection and exploitation',
    category: 'scanning',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Target URL with parameters',
        required: true,
      },
      {
        name: 'data',
        type: 'string',
        description: 'POST data',
        required: false,
      },
      {
        name: 'level',
        type: 'number',
        description: 'Test level (1-5)',
        required: false,
        default: 1,
      },
    ],
    capabilities: [
      'SQL injection detection',
      'database fingerprinting',
      'data extraction',
      'authentication bypass',
    ],
    requiresApproval: true,
    estimatedDuration: 60000,
    riskLevel: 'high',
    examples: [
      {
        description: 'Test for SQL injection',
        parameters: { url: 'https://example.com/page?id=1', level: 1 },
      },
    ],
  },
  {
    name: 'ffuf',
    description: 'Fast web fuzzer for content discovery',
    category: 'reconnaissance',
    parameters: [
      {
        name: 'target',
        type: 'string',
        description: 'Base URL with FUZZ keyword',
        required: true,
      },
      {
        name: 'wordlist',
        type: 'string',
        description: 'Path to wordlist',
        required: false,
      },
      {
        name: 'extensions',
        type: 'string[]',
        description: 'File extensions to test',
        required: false,
      },
    ],
    capabilities: [
      'directory discovery',
      'file discovery',
      'parameter fuzzing',
      'virtual host discovery',
    ],
    requiresApproval: true,
    estimatedDuration: 40000,
    riskLevel: 'medium',
    examples: [
      {
        description: 'Discover hidden directories',
        parameters: { target: 'https://example.com/FUZZ', extensions: ['php', 'html'] },
      },
    ],
  },
  {
    name: 'wpscan',
    description: 'WordPress vulnerability scanner',
    category: 'scanning',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'WordPress site URL',
        required: true,
      },
      {
        name: 'enumerate',
        type: 'string[]',
        description: 'What to enumerate: vp (plugins), vt (themes), u (users)',
        required: false,
        default: ['vp', 'vt'],
      },
      {
        name: 'apiToken',
        type: 'string',
        description: 'WPScan API token for vulnerability data',
        required: false,
      },
    ],
    capabilities: [
      'WordPress version detection',
      'plugin vulnerability scanning',
      'theme vulnerability scanning',
      'user enumeration',
    ],
    requiresApproval: true,
    estimatedDuration: 35000,
    riskLevel: 'medium',
    examples: [
      {
        description: 'Scan WordPress site',
        parameters: { url: 'https://wordpress-site.com', enumerate: ['vp', 'vt', 'u'] },
      },
    ],
  },
  {
    name: 'mobsf',
    description: 'Mobile Security Framework for app analysis',
    category: 'scanning',
    parameters: [
      {
        name: 'file',
        type: 'string',
        description: 'Path to APK or IPA file',
        required: true,
      },
      {
        name: 'scanType',
        type: 'string',
        description: 'static or dynamic',
        required: false,
        default: 'static',
      },
    ],
    capabilities: [
      'mobile app vulnerability detection',
      'permission analysis',
      'code quality assessment',
      'malware detection',
    ],
    requiresApproval: false,
    estimatedDuration: 90000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Static analysis of Android app',
        parameters: { file: '/path/to/app.apk', scanType: 'static' },
      },
    ],
  },
  {
    name: 'gowitness',
    description: 'Web screenshot and visual reconnaissance',
    category: 'reconnaissance',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Target URL to screenshot',
        required: true,
      },
      {
        name: 'fullPage',
        type: 'boolean',
        description: 'Capture full page screenshot',
        required: false,
        default: false,
      },
    ],
    capabilities: [
      'web screenshots',
      'technology detection',
      'visual reconnaissance',
      'asset discovery',
    ],
    requiresApproval: false,
    estimatedDuration: 10000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Capture screenshot of website',
        parameters: { url: 'https://example.com', fullPage: true },
      },
    ],
  },
  {
    name: 'cero',
    description: 'Certificate transparency subdomain discovery',
    category: 'reconnaissance',
    parameters: [
      {
        name: 'domain',
        type: 'string',
        description: 'Target domain',
        required: true,
      },
      {
        name: 'includeExpired',
        type: 'boolean',
        description: 'Include expired certificates',
        required: false,
        default: false,
      },
    ],
    capabilities: [
      'subdomain enumeration',
      'certificate analysis',
      'domain reconnaissance',
      'SSL certificate tracking',
    ],
    requiresApproval: false,
    estimatedDuration: 20000,
    riskLevel: 'low',
    examples: [
      {
        description: 'Discover subdomains via CT logs',
        parameters: { domain: 'example.com' },
      },
    ],
  },
]; */

/**
 * Complete tool registry
 */
export const ALL_TOOLS: ToolDefinition[] = [...BUILTIN_TOOLS, ...MCP_TOOLS];

/**
 * Get tool by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(
  category: ToolDefinition['category']
): ToolDefinition[] {
  return ALL_TOOLS.filter((tool) => tool.category === category);
}

/**
 * Get tools by risk level
 */
export function getToolsByRisk(
  riskLevel: ToolDefinition['riskLevel']
): ToolDefinition[] {
  return ALL_TOOLS.filter((tool) => tool.riskLevel === riskLevel);
}

/**
 * Search tools by capability
 */
export function searchByCapability(capability: string): ToolDefinition[] {
  const lowerCapability = capability.toLowerCase();
  return ALL_TOOLS.filter((tool) =>
    tool.capabilities.some((cap) => cap.toLowerCase().includes(lowerCapability))
  );
}

/**
 * Generate formatted registry for AI prompts
 */
export function generateToolRegistryPrompt(): string {
  const sections = ALL_TOOLS.map((tool) => {
    const params = tool.parameters
      .map((p) => {
        const req = p.required ? 'REQUIRED' : 'optional';
        const def = p.default ? ` (default: ${JSON.stringify(p.default)})` : '';
        return `    - ${p.name} (${p.type}, ${req})${def}: ${p.description}`;
      })
      .join('\n');

    const caps = tool.capabilities.map((c) => `    • ${c}`).join('\n');
    const risk = tool.riskLevel.toUpperCase();
    const approval = tool.requiresApproval ? 'YES' : 'NO';

    return `
### ${tool.name}
**Category:** ${tool.category}
**Description:** ${tool.description}
**Risk Level:** ${risk}
**Requires Approval:** ${approval}
**Estimated Duration:** ${tool.estimatedDuration}ms

**Parameters:**
${params}

**Capabilities:**
${caps}

**Example:**
${JSON.stringify(tool.examples[0].parameters, null, 2)}
`;
  }).join('\n---\n');

  return `# Available Security Tools\n\n${sections}`;
}
