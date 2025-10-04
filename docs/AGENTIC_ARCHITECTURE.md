# Agentic Architecture Documentation

## Overview

Cyber Claude now features a **true autonomous agent** with multi-step planning, adaptive execution, and self-correction capabilities. This transforms it from a simple tool-calling interface into an intelligent agent that can autonomously complete complex security tasks.

## What Makes It Agentic?

Unlike traditional chatbots that simply call tools based on user requests, Cyber Claude's agentic system:

1. **Plans** - Breaks down high-level tasks into executable steps
2. **Executes** - Runs tools with proper sequencing and parallelization
3. **Reflects** - Analyzes results and determines next actions
4. **Adapts** - Modifies plans based on discoveries
5. **Self-corrects** - Retries failed steps and handles errors intelligently

## Architecture Components

### 1. Core System (`src/agent/core/`)

#### **AgenticCore** (`agentic.ts`)
The main orchestration engine that ties everything together.

**Key Features:**
- Autonomous execution loop
- Progress monitoring and streaming
- Timeout and safety controls
- Approval gates for high-risk operations

**Usage:**
```typescript
import { AgenticCore } from './agent/core/agentic.js';

const agent = new AgenticCore({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5',
  maxSteps: 20,
  maxDuration: 600000,
  autoApprove: false,
});

const result = await agent.executeTask('scan example.com for vulnerabilities');
```

#### **TaskPlanner** (`planner.ts`)
AI-powered planning that converts natural language tasks into structured execution plans.

**Capabilities:**
- Breaks tasks into concrete steps
- Selects appropriate tools from registry
- Defines success criteria per step
- Manages dependencies between steps
- Supports both Claude and Gemini models

**Example Plan:**
```json
{
  "reasoning": "For scanning example.com, start with recon, then vulnerability scan...",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Perform web reconnaissance",
      "tool": "httpx",
      "parameters": { "target": "example.com" },
      "successCriteria": ["Server responds", "Technology detected"],
      "riskLevel": "low"
    },
    {
      "stepNumber": 2,
      "description": "Scan for vulnerabilities",
      "tool": "nuclei",
      "parameters": { "target": "https://example.com", "severity": "medium" },
      "successCriteria": ["Scan completes", "Vulnerabilities identified"],
      "dependencies": ["1"],
      "riskLevel": "medium"
    }
  ]
}
```

#### **ReflectionEngine** (`reflection.ts`)
Analyzes step results and makes adaptive decisions.

**Reflection Actions:**
- `continue` - Move to next step
- `retry` - Retry failed step (with backoff)
- `adjust` - Modify plan based on discoveries
- `complete` - Task finished successfully
- `abort` - Critical failure, stop execution

**Example Reflection:**
```json
{
  "reasoning": "Step found WordPress, should add WPScan",
  "success": true,
  "confidence": 0.95,
  "nextAction": "adjust",
  "adjustments": {
    "modifyPlan": true,
    "additionalSteps": [{
      "tool": "wpscan",
      "description": "Scan WordPress for vulnerabilities",
      "parameters": { "url": "https://example.com" }
    }]
  }
}
```

#### **ContextManager** (`context.ts`)
Maintains execution state and emits progress updates.

**Features:**
- Tracks completed steps and results
- Stores security findings
- Manages errors and retries
- Emits real-time progress events
- Supports context export/import for persistence

### 2. Tool System (`src/agent/tools/`)

#### **Tool Registry** (`registry.ts`)
Complete metadata for all 20+ available tools.

**Tool Categories:**
- **Scanning** - nuclei, nmap, sslscan, sqlmap, wpscan, mobsf, masscan
- **Reconnaissance** - httpx, katana, amass, ffuf, gowitness, cero
- **Analysis** - http-headers, pcap, harden
- **Utility** - Custom analysis tools

**Tool Definition:**
```typescript
{
  name: 'nuclei',
  description: 'Fast vulnerability scanner',
  category: 'scanning',
  parameters: [
    { name: 'target', type: 'string', required: true },
    { name: 'severity', type: 'string', required: false, default: 'medium' }
  ],
  capabilities: ['CVE detection', 'misconfigurations', 'exposed panels'],
  requiresApproval: true,
  estimatedDuration: 45000,
  riskLevel: 'medium',
  examples: [...]
}
```

#### **ToolExecutor** (`executor.ts`)
Unified execution layer for all tools.

**Features:**
- Executes both built-in commands and MCP tools
- Parameter validation
- Timeout enforcement
- Parallel and sequential execution
- Automatic retry with exponential backoff

**Built-in Tools:**
- `scan` - Comprehensive security scan
- `webscan` - Web application testing
- `mobilescan` - Mobile app analysis
- `pcap` - Network traffic analysis
- `recon` - OSINT reconnaissance
- `harden` - Security hardening

**MCP Tools:**
All 14 MCP security tools integrated via Model Context Protocol.

### 3. Prompts (`src/agent/prompts/`)

#### **Agentic Prompts** (`agentic.ts`)
Specialized prompts for autonomous operation.

**Prompt Types:**
1. **Planning Prompt** - Guides AI to create execution plans
2. **Reflection Prompt** - Analyzes results and determines actions
3. **Tool Selection Prompt** - Chooses best tool for context
4. **Synthesis Prompt** - Combines findings into reports

**Planning Principles:**
- Start broad, get specific (recon → targeted scans)
- Adapt to discoveries (if WordPress found, use wpscan)
- Chain logically (use output from step N in step N+1)
- Minimize steps (combine when possible)
- Safety first (passive over active)

### 4. Type System (`src/agent/types.ts`)

**Core Types:**
```typescript
Task       // User's high-level task
Plan       // AI-generated execution plan
Step       // Single operation in plan
StepResult // Execution result
Reflection // AI's analysis of result
AgenticContext // Complete execution state
ToolDefinition // Tool metadata
ProgressUpdate // Real-time progress events
```

## CLI Usage

### Autonomous Command

```bash
# Basic usage
cyber-claude auto "scan example.com for vulnerabilities"

# Red team mode
cyber-claude auto "find attack paths in staging.myapp.com" \
  --mode redteam \
  --verbose

# Blue team mode
cyber-claude auto "analyze logs for IOCs in /var/log/auth.log" \
  --mode blueteam

# Web pentest mode
cyber-claude auto "audit my WordPress site at blog.example.com" \
  --mode webpentest \
  --model claude-sonnet-4-5 \
  --max-steps 15

# OSINT mode
cyber-claude auto "gather intel on target-company.com" \
  --mode osint

# Extended thinking for complex tasks
cyber-claude auto "perform comprehensive security assessment of myapp.com" \
  --thinking \
  --verbose

# Export context for later analysis
cyber-claude auto "scan 192.168.1.0/24 network" \
  --export ./scan-context.json
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode` | Agent mode: base, redteam, blueteam, desktopsecurity, webpentest, osint | base |
| `--model` | AI model (claude-sonnet-4-5, gemini-2.0-flash-exp) | claude-sonnet-4-5 |
| `--thinking` | Enable extended thinking for planning | false |
| `--max-steps` | Maximum steps to execute | 20 |
| `--max-duration` | Max duration in milliseconds | 600000 (10 min) |
| `--auto-approve` | Auto-approve all operations (⚠️ USE WITH CAUTION) | false |
| `--verbose` | Show detailed progress | false |
| `--export` | Export context to JSON file | - |

## Execution Flow

```
┌─────────────────────────────────────┐
│ 1. User provides high-level task   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ 2. TaskPlanner creates execution    │
│    plan with AI (planning prompt)   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ 3. ContextManager initialized       │
│    Progress monitoring started      │
└─────────────────┬───────────────────┘
                  │
    ┌─────────────▼─────────────┐
    │  EXECUTION LOOP           │
    │ ┌──────────────────────┐  │
    │ │ Get next step(s)     │  │
    │ └──────────┬───────────┘  │
    │            │              │
    │            ▼              │
    │ ┌──────────────────────┐  │
    │ │ Execute with         │  │
    │ │ ToolExecutor         │  │
    │ └──────────┬───────────┘  │
    │            │              │
    │            ▼              │
    │ ┌──────────────────────┐  │
    │ │ Reflect with         │  │
    │ │ ReflectionEngine     │  │
    │ └──────────┬───────────┘  │
    │            │              │
    │      ┌─────┴─────┐        │
    │      │           │        │
    │   continue    adjust      │
    │      │           │        │
    │      │     ┌─────┴─────┐  │
    │      │     │ Modify    │  │
    │      │     │ Plan      │  │
    │      │     └─────┬─────┘  │
    │      └───────────┘        │
    │                           │
    │ Until: complete/abort     │
    └───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ 4. Results returned with:           │
│    - Execution summary              │
│    - Security findings              │
│    - Errors (if any)                │
│    - Complete context               │
└─────────────────────────────────────┘
```

## Real-World Examples

### Example 1: Web Application Audit

**Task:** "Audit the security of https://staging.myapp.com"

**Generated Plan:**
1. httpx - Probe web server
2. katana - Crawl for endpoints
3. nuclei - Vulnerability scan
4. sslscan - SSL/TLS analysis
5. http-headers - Security headers check

**Adaptive Behavior:**
- If WordPress detected → Insert wpscan step
- If SQL injection found → Add sqlmap for exploitation
- If API endpoints found → Adjust nuclei templates

### Example 2: Network Reconnaissance

**Task:** "Perform reconnaissance on example.com"

**Generated Plan:**
1. amass - Passive subdomain enumeration
2. cero - Certificate transparency lookup
3. httpx - Probe discovered hosts
4. gowitness - Screenshot websites
5. nmap - Port scan live hosts

### Example 3: Mobile App Security

**Task:** "Analyze security of app.apk"

**Generated Plan:**
1. mobilescan - Static analysis with MobSF
2. Extract findings
3. Generate remediation report

## Safety and Approval

### Risk Levels

- **Low** - Read-only, passive operations (recon, analysis)
- **Medium** - Active scanning, non-destructive (nmap, nuclei)
- **High** - Aggressive testing, potential impact (sqlmap with --risk)

### Approval Gates

High-risk operations require user approval:

```
⚠️  Step 3 requires approval:

   Description: Test for SQL injection vulnerabilities
   Tool: sqlmap
   Risk Level: HIGH
   Parameters: {
     "url": "https://example.com/login",
     "level": 3,
     "risk": 2
   }

   Approve this step? (yes/no):
```

### Auto-Approve Mode

```bash
# ⚠️ CAUTION: Only use on systems you own
cyber-claude auto "full pentest of testlab.local" --auto-approve
```

## Advanced Features

### Extended Thinking

For complex tasks, enable extended thinking:

```bash
cyber-claude auto "design and execute multi-stage attack simulation" --thinking
```

The AI will use more deliberation to plan the approach.

### Context Export/Import

Export execution context for analysis:

```bash
cyber-claude auto "scan production.example.com" --export scan-results.json
```

Context includes:
- Complete execution plan
- All step results
- Security findings
- Timing data
- Errors and retries

### Progress Streaming

With `--verbose`, see real-time updates:

```
[████████████░░░░░░░░ 60%] Starting step 4: SSL/TLS analysis
💭 Reflection: Certificate expires in 7 days, flagging as finding
[████████████████░░░░ 80%] Step 4 completed successfully
```

## Comparison: Traditional vs Agentic

### Traditional Tool-Calling Bot

```
User: "Scan example.com"
Bot: [Calls nmap]
Bot: "Here are the open ports"
User: "Now check for vulnerabilities"
Bot: [Calls nuclei]
Bot: "Found 3 vulnerabilities"
User: "Check SSL configuration"
Bot: [Calls sslscan]
...
```

**Issues:**
- User must orchestrate every step
- No adaptation to findings
- No multi-step planning
- Manual error handling

### Cyber Claude Agentic System

```
User: "Audit example.com for security issues"

Agent:
  1. Plans comprehensive audit (6 steps)
  2. Executes steps with dependencies
  3. Discovers WordPress during recon
  4. Adapts plan to add wpscan
  5. Finds vulnerability, increases scan depth
  6. Synthesizes findings into report
  7. Returns complete assessment

All autonomous, no user intervention needed.
```

## Technical Implementation

### File Structure

```
src/agent/
├── core/
│   ├── agentic.ts       # Main orchestration
│   ├── planner.ts       # AI-powered planning
│   ├── reflection.ts    # Result analysis
│   ├── context.ts       # State management
│   └── index.ts         # Exports
├── tools/
│   ├── registry.ts      # Tool metadata
│   ├── executor.ts      # Unified execution
│   └── index.ts         # Exports
├── prompts/
│   └── agentic.ts       # AI prompts
└── types.ts             # TypeScript types

src/cli/commands/
└── auto.ts              # CLI command
```

### Integration with Existing System

The agentic system **integrates seamlessly** with existing features:

- All 20+ tools available (built-in + MCP)
- Works with both Claude and Gemini
- Uses existing security finding types
- Compatible with all agent modes
- Reuses MCP tool adapters

## Future Enhancements

Potential additions (not yet implemented):

1. **Multi-agent collaboration** - Multiple agents working together
2. **Learning from history** - Improve plans based on past executions
3. **Custom workflows** - User-defined task templates
4. **Interactive mode integration** - `/auto <task>` command
5. **Safety validator** - Pre-execution risk assessment
6. **Report generator** - Professional PDF reports
7. **Continuous monitoring** - Scheduled autonomous scans

## Contributing

To add new capabilities:

1. **Add tool to registry** (`registry.ts`)
2. **Create executor** (`executor.ts`)
3. **Update types** (if needed)
4. **Test autonomous usage**

Example:

```typescript
// 1. Add to registry
{
  name: 'new_tool',
  description: 'Does something cool',
  category: 'scanning',
  parameters: [...],
  capabilities: [...],
  requiresApproval: false,
  estimatedDuration: 30000,
  riskLevel: 'low',
  examples: [...]
}

// 2. Add executor
new_tool: async (params, options) => {
  return await NewToolMCP.scan(params);
}
```

## Troubleshooting

### Common Issues

**Issue:** "Planning failed"
- **Fix:** Check API key is valid
- **Fix:** Ensure model supports function calling

**Issue:** "Tool executor not found"
- **Fix:** Verify tool is in registry
- **Fix:** Check MCP server is configured

**Issue:** "Timeout exceeded"
- **Fix:** Increase `--max-duration`
- **Fix:** Reduce `--max-steps`

### Debug Mode

```bash
DEBUG=* cyber-claude auto "task" --verbose
```

## References

- [Agent Modes Documentation](./AGENT_MODES.md)
- [CLI Commands Reference](./CLI_COMMANDS.md)
- [MCP Configuration](./MCP_SETUP.md)

---

**Built with Claude Sonnet 4.5 and Gemini 2.0 Flash** - The models that power the agent's intelligence.
