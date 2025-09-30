# 🔌 MCP Integration Roadmap for Cyber-Claude

## Overview

Integration with [MCP for Security](https://github.com/cyproxio/mcp-for-security) servers will transform Cyber-Claude into a comprehensive security testing platform with access to industry-standard penetration testing tools.

---

## 🎯 Integration Architecture

### Current: Cyber-Claude (Standalone)
```
User → Cyber-Claude → [Built-in Tools] → AI Analysis → Reports
```

### Future: Cyber-Claude + MCP Servers
```
User → Cyber-Claude → [Built-in Tools + MCP Servers] → AI Analysis → Reports
                            ↓
                    ┌───────┴────────┐
                    │  MCP Protocol  │
                    └───────┬────────┘
                            ↓
            ┌───────────────┼───────────────┐
            │               │               │
        [Nuclei]       [Nmap]       [SQLmap]
        [SSLScan]      [Httpx]      [Katana]
```

---

## 📦 Proposed Integrations

### Phase 1: Web Security Enhancement (Priority)

#### 1. **Nuclei MCP** ⭐⭐⭐⭐⭐
**Integration Point**: `webscan` command

**Capabilities:**
- 5000+ vulnerability templates
- CVE detection
- OWASP Top 10 coverage
- Custom template support

**Implementation:**
```bash
# Enhanced webscan with Nuclei
cyber-claude webscan https://example.com --with-nuclei

# Use specific templates
cyber-claude webscan https://example.com --nuclei-templates "cves,owasp"
```

**Benefits:**
- ✅ Professional-grade vulnerability detection
- ✅ CVE discovery and reporting
- ✅ Complements AI analysis with template-based scanning
- ✅ Results feed into IOC extraction and MITRE mapping

---

#### 2. **HTTP Headers Security MCP** ⭐⭐⭐⭐⭐
**Integration Point**: `HeaderAnalyzer` in webscan

**Capabilities:**
- OWASP security header validation
- Best practice enforcement
- Header recommendations

**Implementation:**
```typescript
// Enhance HeaderAnalyzer.ts
import { MCPHeaderSecurity } from './mcp/clients/headers.js';

async analyzeHeaders(headers: Headers): Promise<HeaderAnalysis> {
  // Existing analysis
  const basicAnalysis = this.existingAnalysis(headers);

  // MCP-enhanced analysis
  const mcpAnalysis = await MCPHeaderSecurity.analyze(headers);

  return {
    ...basicAnalysis,
    owaspCompliance: mcpAnalysis.compliance,
    recommendations: mcpAnalysis.recommendations,
  };
}
```

**Benefits:**
- ✅ OWASP compliance checking
- ✅ Industry best practices
- ✅ Enhanced reporting

---

#### 3. **SSLScan MCP** ⭐⭐⭐⭐⭐
**Integration Point**: New `webscan --tls` option

**Capabilities:**
- SSL/TLS version detection
- Cipher suite analysis
- Certificate validation
- Vulnerability detection (Heartbleed, POODLE, etc.)

**Implementation:**
```bash
# TLS security analysis
cyber-claude webscan https://example.com --tls

# Include in full scan
cyber-claude webscan https://example.com --full --tls
```

**Benefits:**
- ✅ Addresses TLS certificate inspection gap
- ✅ Critical for HTTPS security assessment
- ✅ CVE mapping for SSL/TLS vulnerabilities

---

#### 4. **SQLmap MCP** ⭐⭐⭐⭐
**Integration Point**: `webscan --full` mode

**Capabilities:**
- SQL injection detection
- Database fingerprinting
- Exploitation (ethical mode only)

**Implementation:**
```bash
# Deep SQL injection testing
cyber-claude webscan https://example.com --sqlmap

# Target specific parameters
cyber-claude webscan https://example.com --sqlmap --params "id,user"
```

**Benefits:**
- ✅ Professional SQL injection testing
- ✅ Database security assessment
- ✅ MITRE T1190 technique evidence

---

### Phase 2: Network Security Enhancement

#### 5. **Nmap MCP** ⭐⭐⭐⭐
**Integration Point**: `scan --network` command

**Capabilities:**
- Port scanning
- Service detection
- OS fingerprinting
- NSE script support

**Implementation:**
```bash
# Enhanced network scan
cyber-claude scan --network --with-nmap

# Target specific hosts
cyber-claude scan --network --target 192.168.1.0/24 --nmap
```

**Benefits:**
- ✅ Professional network reconnaissance
- ✅ Service enumeration
- ✅ MITRE T1046 technique mapping

---

#### 6. **Masscan MCP** ⭐⭐⭐
**Integration Point**: Fast network discovery

**Capabilities:**
- Ultra-fast port scanning
- Large network ranges
- Internet-wide scanning capability

**Implementation:**
```bash
# Fast network discovery
cyber-claude scan --network --masscan --fast
```

---

### Phase 3: Reconnaissance & OSINT

#### 7. **Katana MCP** ⭐⭐⭐⭐
**Integration Point**: Pre-scan reconnaissance

**Capabilities:**
- JavaScript parsing
- Endpoint discovery
- API detection

**Implementation:**
```bash
# Discover attack surface
cyber-claude recon https://example.com --crawl

# Then scan discovered endpoints
cyber-claude webscan https://example.com --from-recon
```

---

#### 8. **Httpx MCP** ⭐⭐⭐
**Integration Point**: Bulk URL analysis

**Capabilities:**
- Technology detection
- HTTP probing
- Title extraction

---

#### 9. **Amass/Crt.sh MCPs** ⭐⭐⭐
**Integration Point**: Subdomain enumeration

**Capabilities:**
- Passive subdomain discovery
- Certificate transparency logs
- DNS enumeration

**Implementation:**
```bash
# Discover all subdomains
cyber-claude recon example.com --subdomains

# Scan all discovered subdomains
cyber-claude webscan example.com --scan-subdomains
```

---

## 🔧 Technical Implementation

### 1. MCP Client Layer

```typescript
// src/mcp/client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export class MCPClient {
  private clients: Map<string, Client>;

  constructor() {
    this.clients = new Map();
  }

  async connect(serverName: string, transport: StdioClientTransport): Promise<void> {
    const client = new Client({
      name: 'cyber-claude',
      version: '0.4.0',
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    this.clients.set(serverName, client);
  }

  async callTool(server: string, tool: string, args: any): Promise<any> {
    const client = this.clients.get(server);
    if (!client) {
      throw new Error(`MCP server ${server} not connected`);
    }

    return await client.callTool({ name: tool, arguments: args });
  }
}
```

### 2. Configuration System

```typescript
// src/mcp/config.ts
export interface MCPServerConfig {
  name: string;
  enabled: boolean;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: 'nuclei',
    enabled: true,
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-nuclei'],
    env: { NUCLEI_TEMPLATES_PATH: '/path/to/templates' },
  },
  {
    name: 'sslscan',
    enabled: true,
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-sslscan'],
  },
  {
    name: 'nmap',
    enabled: false, // Requires installation
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-nmap'],
  },
];
```

### 3. Enhanced WebScanner Integration

```typescript
// src/agent/tools/web/WebScanner.ts
import { MCPClient } from '../../mcp/client.js';

export class WebScanner {
  private mcpClient: MCPClient;

  async scanWithNuclei(url: string): Promise<NucleiResults> {
    const results = await this.mcpClient.callTool('nuclei', 'scan', {
      target: url,
      templates: ['cves', 'owasp'],
      severity: ['critical', 'high', 'medium'],
    });

    return this.parseNucleiResults(results);
  }

  async scanTLS(url: string): Promise<TLSResults> {
    const results = await this.mcpClient.callTool('sslscan', 'scan', {
      host: new URL(url).hostname,
      port: 443,
    });

    return this.parseSSLScanResults(results);
  }
}
```

### 4. CLI Integration

```bash
# .env configuration
MCP_NUCLEI_ENABLED=true
MCP_SSLSCAN_ENABLED=true
MCP_NMAP_ENABLED=false
```

```bash
# New commands
cyber-claude webscan https://example.com --with-mcp
cyber-claude webscan https://example.com --nuclei --sslscan
cyber-claude scan --network --nmap
```

---

## 📊 Value Proposition

### Current Cyber-Claude Capabilities
✅ AI-powered analysis
✅ Built-in scanning (basic)
✅ IOC extraction
✅ MITRE ATT&CK mapping
✅ Evidence preservation

### With MCP Integration
✅ **ALL OF THE ABOVE** +
✅ Professional penetration testing tools
✅ 5000+ Nuclei vulnerability templates
✅ Industry-standard network scanning (Nmap)
✅ Professional SQL injection testing (SQLmap)
✅ TLS/SSL security analysis (SSLScan)
✅ Web crawling and recon (Katana, Amass)
✅ Automated vulnerability discovery
✅ CVE detection and reporting

---

## 🚀 Implementation Priority

### **Week 1: Core MCP Framework**
- [ ] MCP client implementation
- [ ] Configuration system
- [ ] Connection management
- [ ] Error handling

### **Week 2: Web Security MCPs**
- [ ] Nuclei integration
- [ ] HTTP Headers Security
- [ ] SSLScan integration
- [ ] Enhanced webscan command

### **Week 3: Network Security**
- [ ] Nmap integration
- [ ] Enhanced scan command
- [ ] Network reconnaissance

### **Week 4: Testing & Documentation**
- [ ] Integration testing
- [ ] User documentation
- [ ] Example workflows
- [ ] Performance optimization

---

## 🎯 Example: Complete Workflow

```bash
# Step 1: Reconnaissance
cyber-claude recon example.com --subdomains --crawl

# Step 2: Comprehensive scan with MCP tools
cyber-claude webscan https://example.com \\
  --full \\
  --nuclei \\
  --sslscan \\
  --sqlmap \\
  --extract-iocs \\
  --mitre \\
  --preserve-evidence \\
  --analyst "Your Name" \\
  --case-number "PENTEST-2025-001"

# Output:
# ✅ Built-in header analysis
# ✅ Nuclei: 5000+ vuln templates
# ✅ SSLScan: TLS/SSL analysis
# ✅ SQLmap: SQL injection testing
# ✅ IOC extraction (IPs, domains, CVEs)
# ✅ MITRE ATT&CK mapping
# ✅ Evidence preservation with hashes
# ✅ AI-powered threat analysis
# ✅ Professional report generation
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "@cyproxio/mcp-nuclei": "latest",
    "@cyproxio/mcp-sslscan": "latest",
    "@cyproxio/mcp-nmap": "latest",
    "@cyproxio/mcp-sqlmap": "latest",
    "@cyproxio/mcp-httpx": "latest",
    "@cyproxio/mcp-katana": "latest"
  }
}
```

---

## 🔐 Security Considerations

1. **Authorization**: All MCP tools respect existing authorization framework
2. **Blocklists**: Domain blocklists apply to MCP scans
3. **Rate Limiting**: Configurable rate limits for MCP operations
4. **Logging**: All MCP calls logged for audit trail
5. **Ethical Use**: Tools only used in defensive/authorized contexts

---

## 📚 Benefits Summary

| Feature | Without MCP | With MCP |
|---------|-------------|----------|
| Vulnerability Templates | Basic | 5000+ (Nuclei) |
| Network Scanning | Limited | Professional (Nmap) |
| SQL Injection Testing | Detection only | Full testing (SQLmap) |
| TLS/SSL Analysis | None | Complete (SSLScan) |
| Web Crawling | None | Advanced (Katana) |
| Subdomain Discovery | None | Comprehensive (Amass) |
| CVE Detection | Limited | Automated (Nuclei) |

---

## 🤝 Next Steps

1. **Install MCP SDK**: `npm install @modelcontextprotocol/sdk`
2. **Create MCP client layer**: Implement connection management
3. **Integrate Nuclei**: Start with web vulnerability scanning
4. **Add SSLScan**: Enable TLS/SSL analysis
5. **Enhance webscan**: Combine built-in + MCP tools
6. **Test & Document**: Ensure reliability and usability

---

**Status**: Design Complete - Ready for Implementation
**Expected Timeline**: 4 weeks
**Impact**: Transforms Cyber-Claude into enterprise penetration testing platform