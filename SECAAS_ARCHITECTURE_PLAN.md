# Cyber Claude: Security-as-a-Service (SECaaS) Architecture Plan

**Version:** 1.0
**Date:** December 2024
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Approach 1: REST API Layer](#approach-1-rest-api-layer)
4. [Approach 2: Job Queue Architecture](#approach-2-job-queue-architecture)
5. [Approach 3: Multi-Tenant SaaS Platform](#approach-3-multi-tenant-saas-platform)
6. [Approach 4: Microservices Architecture](#approach-4-microservices-architecture)
7. [Approach 5: Serverless/Edge Functions](#approach-5-serverlessedge-functions)
8. [Approach 6: Hybrid Model](#approach-6-hybrid-model)
9. [Feature Comparison Matrix](#feature-comparison-matrix)
10. [Monetization Strategies](#monetization-strategies)
11. [Infrastructure & Deployment](#infrastructure--deployment)
12. [Security Considerations](#security-considerations)
13. [Recommended Path Forward](#recommended-path-forward)

---

## Executive Summary

Cyber Claude is a mature, well-architected security toolkit with 30,000+ lines of TypeScript code. It currently operates as a CLI application but has excellent foundations for API exposure:

**Strengths for API Conversion:**
- Provider-agnostic AI system (Claude, OpenAI, Gemini, Ollama)
- Complete tool registry with metadata
- Strong TypeScript types for serialization
- All tools return structured data (JSON-exportable)
- Existing daemon infrastructure for background jobs
- Progress callback patterns already implemented

**Current Capabilities (15+ Security Services):**
- Web Application Scanning (OWASP Top 10)
- Smart Contract Auditing (11 vulnerability detectors)
- OSINT Reconnaissance (10 zero-API-key tools)
- Network Traffic Analysis (PCAP)
- System Hardening Assessment
- Dependency Vulnerability Scanning
- SSL/TLS Analysis
- Log Analysis & Threat Hunting
- CVE Database Lookup
- AI-Powered Security Chat

---

## Current State Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                          │
│                     (src/cli/index.ts)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                     18 CLI Commands                              │
│  scan │ webscan │ recon │ web3 │ pcap │ harden │ deps │ ...    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                      Tool Layer                                  │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ WebScanner   │ OSINT Tools  │ Web3 Scanner │ PcapAnalyzer │  │
│  │ (6 classes)  │ (10 tools)   │ (11 detectors│ (1 class)    │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                     AI Provider Layer                            │
│  ┌─────────┬─────────┬─────────┬─────────────────────────────┐  │
│  │ Claude  │ OpenAI  │ Gemini  │ Ollama (Local)              │  │
│  └─────────┴─────────┴─────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Existing Serialization Points

All major tools already support JSON output:
- `WebScanResult` - Complete web scan data
- `OSINTResult` - OSINT investigation findings
- `Web3ScanResult` - Smart contract vulnerabilities
- `SecurityFinding` - Universal finding format
- `ScanResult` - Generic scan results with summary

### Daemon Infrastructure

The existing `Daemon` class (`src/daemon/Daemon.ts`) provides:
- Job scheduling with cron expressions
- Job persistence
- Execution tracking
- Status monitoring

This can be extended for API-driven job management.

---

## Approach 1: REST API Layer

### Overview

Add a lightweight HTTP server that wraps existing tools with REST endpoints. This is the **fastest path to market** with minimal architectural changes.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Express/Fastify)                 │
│                       Port 3000                                  │
├─────────────────────────────────────────────────────────────────┤
│  Auth Middleware │ Rate Limiter │ Request Validator │ CORS      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                       Route Handlers                             │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/v1/scan/web        → WebScanner.scan()               │
│  POST /api/v1/scan/web3       → SmartContractScanner.scan()     │
│  POST /api/v1/scan/desktop    → DesktopScanner.scan()           │
│  POST /api/v1/recon/osint     → OSINTOrchestrator.investigate() │
│  POST /api/v1/analyze/pcap    → PcapAnalyzer.analyze()          │
│  POST /api/v1/analyze/logs    → LogAnalyzer.analyze()           │
│  POST /api/v1/analyze/ssl     → SSLAnalyzer.analyze()           │
│  POST /api/v1/analyze/deps    → DependencyScanner.scan()        │
│  POST /api/v1/chat            → CyberAgent.chat()               │
│  GET  /api/v1/tools           → ToolRegistry.list()             │
│  GET  /api/v1/cve/:id         → CVELookup.get()                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Foundation (Week 1-2)

**New Files:**
```
src/
├── api/
│   ├── server.ts              # Fastify/Express server setup
│   ├── middleware/
│   │   ├── auth.ts            # API key authentication
│   │   ├── rateLimit.ts       # Rate limiting per API key
│   │   ├── validator.ts       # Request validation (Zod)
│   │   └── errorHandler.ts    # Centralized error handling
│   ├── routes/
│   │   ├── index.ts           # Route aggregator
│   │   ├── scan.ts            # /scan/* endpoints
│   │   ├── recon.ts           # /recon/* endpoints
│   │   ├── analyze.ts         # /analyze/* endpoints
│   │   ├── chat.ts            # /chat endpoint
│   │   └── tools.ts           # /tools endpoint
│   ├── services/
│   │   └── apiKeyService.ts   # API key management
│   └── types/
│       └── api.ts             # API request/response types
```

**Dependencies to Add:**
```json
{
  "fastify": "^4.25.0",
  "@fastify/cors": "^8.5.0",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/swagger": "^8.12.0",
  "zod": "^3.22.0"
}
```

**Server Entry Point:**
```typescript
// src/api/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { scanRoutes } from './routes/scan.js';
import { reconRoutes } from './routes/recon.js';
import { analyzeRoutes } from './routes/analyze.js';
import { chatRoutes } from './routes/chat.js';

export async function createServer() {
  const app = Fastify({ logger: true });

  // Middleware
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Routes
  await app.register(scanRoutes, { prefix: '/api/v1/scan' });
  await app.register(reconRoutes, { prefix: '/api/v1/recon' });
  await app.register(analyzeRoutes, { prefix: '/api/v1/analyze' });
  await app.register(chatRoutes, { prefix: '/api/v1/chat' });

  return app;
}
```

#### Phase 2: Authentication (Week 2-3)

**API Key System:**
```typescript
// src/api/middleware/auth.ts
interface ApiKey {
  key: string;
  userId: string;
  tier: 'free' | 'pro' | 'enterprise';
  rateLimit: number;
  scansRemaining: number;
  expiresAt: Date | null;
  permissions: string[];
}

// Middleware
export async function authenticate(req: FastifyRequest) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) throw new UnauthorizedError('API key required');

  const keyData = await validateApiKey(apiKey);
  if (!keyData) throw new UnauthorizedError('Invalid API key');

  req.apiKey = keyData;
}
```

**Permission Levels:**
| Tier | Scans/Month | Features |
|------|-------------|----------|
| Free | 10 | Quick scans only, basic OSINT |
| Pro | 500 | Full scans, all OSINT tools, Web3 audits |
| Enterprise | Unlimited | Aggressive scans, priority queue, custom AI models |

#### Phase 3: Scan Endpoints (Week 3-4)

**Web Scan Route:**
```typescript
// src/api/routes/scan.ts
import { WebScanner } from '../../agent/tools/web/WebScanner.js';
import { SmartContractScanner } from '../../agent/tools/web3/SmartContractScanner.js';

export async function scanRoutes(app: FastifyInstance) {
  // Web Application Scan
  app.post('/web', {
    schema: {
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', format: 'uri' },
          level: { type: 'string', enum: ['quick', 'full', 'aggressive'] },
          timeout: { type: 'number', default: 60000 }
        }
      }
    }
  }, async (req, reply) => {
    const { url, level = 'quick', timeout } = req.body;
    const scanner = new WebScanner();

    const scanMethod = {
      quick: scanner.quickScan,
      full: scanner.fullScan,
      aggressive: scanner.aggressiveScan
    }[level];

    const result = await scanMethod.call(scanner, url, { timeout });

    return {
      success: true,
      data: result,
      meta: {
        scanId: generateScanId(),
        timestamp: new Date().toISOString(),
        duration: result.duration
      }
    };
  });

  // Smart Contract Audit
  app.post('/web3', {
    schema: {
      body: {
        type: 'object',
        required: ['source'],
        properties: {
          source: { type: 'string' },
          contractName: { type: 'string' },
          level: { type: 'string', enum: ['quick', 'full', 'aggressive'] }
        }
      }
    }
  }, async (req, reply) => {
    const { source, contractName, level = 'full' } = req.body;
    const scanner = new SmartContractScanner();

    const result = await scanner.scan(source, { level, contractName });

    return {
      success: true,
      data: result,
      meta: {
        scanId: generateScanId(),
        timestamp: new Date().toISOString()
      }
    };
  });
}
```

**OSINT Route:**
```typescript
// src/api/routes/recon.ts
import { OSINTOrchestrator } from '../../agent/tools/osint/orchestrator.js';

export async function reconRoutes(app: FastifyInstance) {
  app.post('/osint', {
    schema: {
      body: {
        type: 'object',
        required: ['target'],
        properties: {
          target: { type: 'string' },
          tools: {
            type: 'array',
            items: { type: 'string' },
            default: ['dns', 'whois', 'subdomains', 'tech']
          },
          depth: { type: 'string', enum: ['surface', 'standard', 'deep'] }
        }
      }
    }
  }, async (req, reply) => {
    const { target, tools, depth = 'standard' } = req.body;
    const orchestrator = new OSINTOrchestrator();

    const result = await orchestrator.investigate(target, { tools, depth });

    return { success: true, data: result };
  });
}
```

#### Phase 4: Documentation & Testing (Week 4-5)

**OpenAPI/Swagger Documentation:**
```typescript
// Automatic API documentation
await app.register(swagger, {
  openapi: {
    info: {
      title: 'Cyber Claude API',
      description: 'Security-as-a-Service API',
      version: '1.0.0'
    },
    servers: [{ url: 'https://api.cybercloud.io/v1' }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header'
        }
      }
    }
  }
});
```

### API Endpoint Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/v1/scan/web` | POST | Web application security scan | Yes |
| `/api/v1/scan/web3` | POST | Smart contract audit | Yes |
| `/api/v1/scan/desktop` | POST | Desktop security assessment | Yes |
| `/api/v1/scan/deps` | POST | Dependency vulnerability scan | Yes |
| `/api/v1/recon/osint` | POST | OSINT investigation | Yes |
| `/api/v1/analyze/pcap` | POST | Network traffic analysis | Yes |
| `/api/v1/analyze/logs` | POST | Log file analysis | Yes |
| `/api/v1/analyze/ssl` | POST | SSL/TLS analysis | Yes |
| `/api/v1/cve/:id` | GET | CVE lookup | Yes |
| `/api/v1/chat` | POST | AI security assistant | Yes |
| `/api/v1/tools` | GET | List available tools | No |
| `/api/v1/health` | GET | Health check | No |

### Pros & Cons

**Pros:**
- Fastest implementation (2-4 weeks)
- Minimal code changes
- Easy to test and iterate
- Simple deployment (single container)
- Works with existing tool implementations

**Cons:**
- Synchronous execution limits long-running scans
- No built-in progress tracking
- Harder to scale horizontally
- Timeout issues for aggressive scans (>60s)

### Best For:
- MVP/proof of concept
- Quick scans and OSINT
- Simple integrations
- Small-scale deployments

---

## Approach 2: Job Queue Architecture

### Overview

Implement an asynchronous job system for long-running operations. Clients submit jobs and poll for results or receive webhook notifications.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│              (Web App, CLI, CI/CD, Third-party)                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway                                   │
│           POST /jobs → Create Job → Returns job_id              │
│           GET /jobs/:id → Get Status/Results                    │
│           WS /jobs/:id/stream → Real-time Progress              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Redis     │   │ PostgreSQL  │   │    S3       │
│  Job Queue  │   │  Job Store  │   │  Results    │
│   (BullMQ)  │   │  + History  │   │  Storage    │
└──────┬──────┘   └─────────────┘   └─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Worker Pool                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Worker  │  │ Worker  │  │ Worker  │  │ Worker  │           │
│  │   #1    │  │   #2    │  │   #3    │  │   #4    │           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                         │                                        │
│              ┌──────────┴──────────┐                            │
│              ▼                     ▼                            │
│       ┌─────────────┐      ┌─────────────┐                     │
│       │  Security   │      │  External   │                     │
│       │   Tools     │      │   Tools     │                     │
│       │ (Built-in)  │      │ (nmap,etc)  │                     │
│       └─────────────┘      └─────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Queue Infrastructure (Week 1-2)

**New Dependencies:**
```json
{
  "bullmq": "^5.0.0",
  "ioredis": "^5.3.0",
  "@supabase/supabase-js": "^2.39.0"
}
```

**Job Queue Setup:**
```typescript
// src/api/queue/jobQueue.ts
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// Job types
type JobType =
  | 'web-scan'
  | 'web3-audit'
  | 'osint-recon'
  | 'pcap-analysis'
  | 'log-analysis'
  | 'dependency-scan';

interface SecurityJob {
  type: JobType;
  userId: string;
  params: Record<string, any>;
  priority?: number;
  webhook?: string;
}

// Create queue
export const securityQueue = new Queue<SecurityJob>('security-scans', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400 }, // 24 hours
    removeOnFail: { age: 604800 }     // 7 days
  }
});

// Job priorities
export const PRIORITIES = {
  enterprise: 1,   // Highest
  pro: 5,
  free: 10         // Lowest
};
```

**Worker Implementation:**
```typescript
// src/api/queue/worker.ts
import { Worker, Job } from 'bullmq';
import { WebScanner } from '../../agent/tools/web/WebScanner.js';
import { SmartContractScanner } from '../../agent/tools/web3/SmartContractScanner.js';
import { OSINTOrchestrator } from '../../agent/tools/osint/orchestrator.js';

const worker = new Worker<SecurityJob>('security-scans', async (job: Job) => {
  const { type, params } = job.data;

  // Update progress
  await job.updateProgress({ status: 'starting', percentage: 0 });

  switch (type) {
    case 'web-scan': {
      const scanner = new WebScanner();
      const result = await scanner.fullScan(params.url, {
        onProgress: async (msg) => {
          await job.updateProgress({
            status: msg,
            percentage: calculateProgress(msg)
          });
        }
      });
      return result;
    }

    case 'web3-audit': {
      const scanner = new SmartContractScanner();
      const result = await scanner.scan(params.source, {
        level: params.level || 'full',
        onProgress: async (msg) => {
          await job.updateProgress({ status: msg });
        }
      });
      return result;
    }

    case 'osint-recon': {
      const orchestrator = new OSINTOrchestrator();
      const result = await orchestrator.investigate(params.target, {
        tools: params.tools,
        depth: params.depth,
        onProgress: async (msg) => {
          await job.updateProgress({ status: msg });
        }
      });
      return result;
    }

    // ... other job types
  }
}, { connection, concurrency: 5 });

worker.on('completed', async (job, result) => {
  // Store result in PostgreSQL/S3
  await storeResult(job.id, result);

  // Send webhook if configured
  if (job.data.webhook) {
    await sendWebhook(job.data.webhook, {
      jobId: job.id,
      status: 'completed',
      result
    });
  }
});
```

#### Phase 2: Job API Endpoints (Week 2-3)

```typescript
// src/api/routes/jobs.ts
export async function jobRoutes(app: FastifyInstance) {
  // Create a new job
  app.post('/', async (req, reply) => {
    const { type, params, webhook } = req.body;
    const { userId, tier } = req.apiKey;

    const job = await securityQueue.add(type, {
      type,
      userId,
      params,
      webhook
    }, {
      priority: PRIORITIES[tier]
    });

    return {
      jobId: job.id,
      status: 'queued',
      estimatedWait: await getEstimatedWait(tier),
      statusUrl: `/api/v1/jobs/${job.id}`,
      streamUrl: `/api/v1/jobs/${job.id}/stream`
    };
  });

  // Get job status
  app.get('/:id', async (req, reply) => {
    const job = await securityQueue.getJob(req.params.id);

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId: job.id,
      status: state,
      progress,
      createdAt: job.timestamp,
      result: state === 'completed' ? await getJobResult(job.id) : null
    };
  });

  // Stream job progress via WebSocket
  app.get('/:id/stream', { websocket: true }, (connection, req) => {
    const jobId = req.params.id;

    // Subscribe to job events
    const subscriber = new Redis(process.env.REDIS_URL);
    subscriber.subscribe(`job:${jobId}:progress`);

    subscriber.on('message', (channel, message) => {
      connection.socket.send(message);
    });

    connection.socket.on('close', () => {
      subscriber.unsubscribe();
      subscriber.quit();
    });
  });

  // Cancel a job
  app.delete('/:id', async (req, reply) => {
    const job = await securityQueue.getJob(req.params.id);

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    await job.remove();
    return { status: 'cancelled' };
  });

  // List user's jobs
  app.get('/', async (req, reply) => {
    const { userId } = req.apiKey;
    const { status, limit = 20, offset = 0 } = req.query;

    const jobs = await getUserJobs(userId, { status, limit, offset });
    return { jobs, total: jobs.length };
  });
}
```

#### Phase 3: Result Storage (Week 3-4)

**Database Schema (PostgreSQL/Supabase):**
```sql
-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'queued',
  params JSONB NOT NULL,
  result_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT
);

-- Job results (for smaller results)
CREATE TABLE job_results (
  job_id UUID PRIMARY KEY REFERENCES jobs(id),
  result JSONB NOT NULL,
  findings_count INTEGER,
  severity_summary JSONB
);

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own jobs"
  ON jobs FOR SELECT USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
```

**S3 Storage for Large Results:**
```typescript
// src/api/storage/resultStorage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function storeResult(jobId: string, result: any) {
  const resultJson = JSON.stringify(result);

  // Store small results in DB, large ones in S3
  if (resultJson.length < 100000) {
    await supabase.from('job_results').insert({ job_id: jobId, result });
  } else {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.RESULTS_BUCKET,
      Key: `results/${jobId}.json`,
      Body: resultJson,
      ContentType: 'application/json'
    }));

    await supabase.from('jobs').update({
      result_url: `s3://${process.env.RESULTS_BUCKET}/results/${jobId}.json`
    }).eq('id', jobId);
  }
}
```

#### Phase 4: Webhooks & Notifications (Week 4-5)

```typescript
// src/api/notifications/webhook.ts
import axios from 'axios';
import crypto from 'crypto';

export async function sendWebhook(url: string, payload: any) {
  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': Date.now().toString()
      },
      timeout: 10000
    });
  } catch (error) {
    // Queue for retry
    await webhookRetryQueue.add('retry', { url, payload, attempt: 1 });
  }
}
```

### Job Flow Diagram

```
Client                    API                    Queue                   Worker
  │                        │                       │                       │
  │  POST /jobs            │                       │                       │
  │───────────────────────>│                       │                       │
  │                        │  Add Job              │                       │
  │                        │──────────────────────>│                       │
  │                        │                       │  Dispatch             │
  │                        │                       │──────────────────────>│
  │  { jobId, statusUrl }  │                       │                       │
  │<───────────────────────│                       │                       │
  │                        │                       │                       │
  │  WS /jobs/:id/stream   │                       │                       │
  │───────────────────────>│                       │  Progress Events      │
  │                        │<──────────────────────│<──────────────────────│
  │  Progress Updates      │                       │                       │
  │<───────────────────────│                       │                       │
  │                        │                       │  Complete + Result    │
  │                        │                       │<──────────────────────│
  │  Completion Event      │                       │                       │
  │<───────────────────────│  Webhook              │                       │
  │                        │──────────────────────>│                       │
  │                        │                       │                       │
  │  GET /jobs/:id         │                       │                       │
  │───────────────────────>│                       │                       │
  │  { result }            │                       │                       │
  │<───────────────────────│                       │                       │
```

### Pros & Cons

**Pros:**
- Handles long-running scans (5-30+ minutes)
- Scalable worker pool
- Real-time progress updates
- Built-in retry logic
- Priority queues for tier differentiation
- Webhook support for integrations

**Cons:**
- More complex infrastructure
- Requires Redis + PostgreSQL
- Higher operational overhead
- More complex client implementation

### Best For:
- Full/aggressive web scans
- OSINT deep investigations
- Smart contract audits
- CI/CD integrations
- Production deployments

---

## Approach 3: Multi-Tenant SaaS Platform

### Overview

A complete platform with user management, billing, dashboards, and team collaboration. This is the **full product vision**.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Application                         │
│                  (Next.js / React + Tailwind)                   │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard │ Scan History │ Reports │ Team Mgmt │ Integrations │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                    API Gateway / BFF                             │
│            (Next.js API Routes or Express)                      │
├─────────────────────────────────────────────────────────────────┤
│  Auth (Supabase) │ Rate Limit │ Usage Tracking │ Billing (Stripe)│
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                    Core Services Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Scan Service  │  │ OSINT Service │  │ Report Service│       │
│  │ (Job Queue)   │  │ (Job Queue)   │  │ (Generator)   │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Web3 Service  │  │ Chat Service  │  │ Alert Service │       │
│  │ (Job Queue)   │  │ (Streaming)   │  │ (Webhooks)    │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                     Data Layer                                   │
├─────────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL) │ Redis │ S3 │ Vector DB (pgvector)     │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Database Schema (Week 1-2)

```sql
-- Core tables for multi-tenant SaaS

-- Organizations (for team features)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(64) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL, -- For display "cc_****1234"
  name VARCHAR(255),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  permissions JSONB DEFAULT '["read", "scan"]',
  rate_limit INTEGER DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan Targets (saved for recurring scans)
CREATE TABLE targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'web', 'domain', 'contract', 'api'
  target VARCHAR(500) NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scans
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  target_id UUID REFERENCES targets(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  params JSONB NOT NULL,
  result_summary JSONB,
  result_url TEXT,
  findings_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Findings (denormalized for fast querying)
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  cwe VARCHAR(20),
  owasp VARCHAR(50),
  evidence JSONB,
  remediation TEXT,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'resolved', 'false_positive', 'accepted'
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Scans
CREATE TABLE scheduled_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  target_id UUID REFERENCES targets(id),
  name VARCHAR(255) NOT NULL,
  scan_type VARCHAR(50) NOT NULL,
  cron_expression VARCHAR(100) NOT NULL,
  params JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  month DATE NOT NULL, -- First day of month
  scans_count INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  ai_tokens INTEGER DEFAULT 0,
  UNIQUE(organization_id, month)
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scans_org_status ON scans(organization_id, status);
CREATE INDEX idx_scans_org_created ON scans(organization_id, created_at DESC);
CREATE INDEX idx_findings_org_severity ON findings(organization_id, severity);
CREATE INDEX idx_findings_scan ON findings(scan_id);
CREATE INDEX idx_usage_org_month ON usage(organization_id, month);
CREATE INDEX idx_audit_org_created ON audit_log(organization_id, created_at DESC);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- Policies (examples)
CREATE POLICY "Users can view their org's scans"
  ON scans FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));
```

#### Phase 2: Authentication & Authorization (Week 2-3)

**Supabase Auth Integration:**
```typescript
// src/api/auth/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Auth middleware
export async function authMiddleware(req: FastifyRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new UnauthorizedError('Missing token');
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError('Invalid token');
  }

  // Get user with organization
  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single();

  req.user = profile;
}
```

**RBAC System:**
```typescript
// src/api/auth/rbac.ts
type Permission =
  | 'scan:create' | 'scan:read' | 'scan:delete'
  | 'target:create' | 'target:read' | 'target:update' | 'target:delete'
  | 'team:invite' | 'team:remove' | 'team:admin'
  | 'billing:view' | 'billing:manage'
  | 'api_key:create' | 'api_key:delete';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ['*'], // All permissions
  admin: [
    'scan:create', 'scan:read', 'scan:delete',
    'target:*', 'team:*', 'api_key:*', 'billing:view'
  ],
  member: [
    'scan:create', 'scan:read',
    'target:read', 'api_key:create'
  ],
  viewer: ['scan:read', 'target:read']
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;

  // Check wildcard (e.g., 'target:*')
  const [resource] = permission.split(':');
  return perms.includes(`${resource}:*` as Permission);
}
```

#### Phase 3: Billing Integration (Week 3-4)

**Stripe Integration:**
```typescript
// src/api/billing/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = {
  free: {
    scansPerMonth: 10,
    users: 1,
    features: ['quick_scan', 'basic_osint']
  },
  pro: {
    priceId: 'price_xxx',
    scansPerMonth: 500,
    users: 5,
    features: ['full_scan', 'aggressive_scan', 'all_osint', 'web3_audit', 'api_access']
  },
  enterprise: {
    priceId: 'price_yyy',
    scansPerMonth: -1, // Unlimited
    users: -1,
    features: ['*', 'custom_ai', 'priority_support', 'sso', 'audit_log']
  }
};

export async function createCheckoutSession(orgId: string, plan: string) {
  const org = await getOrganization(orgId);

  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { organization_id: orgId }
    });
    customerId = customer.id;
    await updateOrganization(orgId, { stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      price: PLANS[plan].priceId,
      quantity: 1
    }],
    success_url: `${process.env.APP_URL}/billing/success`,
    cancel_url: `${process.env.APP_URL}/billing/cancel`
  });

  return session;
}

// Webhook handler
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await activateSubscription(session);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionStatus(subscription);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleFailedPayment(invoice);
      break;
    }
  }
}
```

#### Phase 4: Dashboard Frontend (Week 4-6)

**Tech Stack:**
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- React Query for data fetching
- Recharts for visualizations

**Key Pages:**
```
/dashboard
  - Overview with security score
  - Recent scans
  - Critical findings alert
  - Usage stats

/scans
  - Scan history with filters
  - New scan wizard
  - Scan detail view with findings

/targets
  - Saved targets management
  - Scheduled scans

/findings
  - All findings across scans
  - Filter by severity/status
  - Bulk actions (resolve, false positive)

/reports
  - Generate PDF/Markdown reports
  - Compliance templates (SOC 2, ISO 27001)
  - Executive summaries

/team
  - Team member management
  - Invite members
  - Role assignment

/settings
  - Organization settings
  - API keys management
  - Integrations (Slack, Jira, PagerDuty)
  - Webhooks

/billing
  - Current plan
  - Usage dashboard
  - Upgrade/downgrade
  - Invoice history
```

**Dashboard Component Example:**
```tsx
// app/dashboard/page.tsx
export default async function Dashboard() {
  const org = await getCurrentOrganization();
  const stats = await getSecurityStats(org.id);
  const recentScans = await getRecentScans(org.id, 5);
  const criticalFindings = await getCriticalFindings(org.id, 10);

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle>Security Score</CardTitle>
        </CardHeader>
        <CardContent>
          <SecurityScoreGauge score={stats.securityScore} />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Scans" value={stats.totalScans} />
        <StatCard
          title="Critical Findings"
          value={stats.criticalCount}
          variant="danger"
        />
        <StatCard title="Open Issues" value={stats.openFindings} />
        <StatCard title="Resolved This Month" value={stats.resolvedThisMonth} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <ScanList scans={recentScans} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Critical Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <FindingsList findings={criticalFindings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### Phase 5: Integrations (Week 6-8)

**Slack Integration:**
```typescript
// src/api/integrations/slack.ts
import { WebClient } from '@slack/web-api';

export async function sendSlackAlert(
  webhookUrl: string,
  finding: SecurityFinding
) {
  const client = new WebClient();

  const severityEmoji = {
    critical: ':rotating_light:',
    high: ':warning:',
    medium: ':large_yellow_circle:',
    low: ':information_source:'
  }[finding.severity];

  await client.chat.postMessage({
    channel: webhookUrl,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji} ${finding.severity.toUpperCase()}: ${finding.title}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: finding.description
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Finding' },
            url: `${process.env.APP_URL}/findings/${finding.id}`
          }
        ]
      }
    ]
  });
}
```

**CI/CD Integrations:**
```yaml
# GitHub Actions Example
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Cyber Claude Scan
        uses: cyber-claude/action@v1
        with:
          api-key: ${{ secrets.CYBER_CLAUDE_API_KEY }}
          scan-type: deps,web
          fail-on: high
          target: ${{ github.server_url }}/${{ github.repository }}
```

### Feature Matrix

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Scans/month | 10 | 500 | Unlimited |
| Team members | 1 | 5 | Unlimited |
| Quick scans | Yes | Yes | Yes |
| Full scans | No | Yes | Yes |
| Aggressive scans | No | No | Yes |
| Web3 audits | No | Yes | Yes |
| Full OSINT | No | Yes | Yes |
| API access | No | Yes | Yes |
| Scheduled scans | No | Yes | Yes |
| Integrations | No | Slack | All |
| Reports | Basic | PDF | Custom + Compliance |
| Support | Community | Email | Priority + Dedicated |
| SSO/SAML | No | No | Yes |
| Audit logs | No | 7 days | Unlimited |
| Custom AI models | No | No | Yes |

### Pros & Cons

**Pros:**
- Complete product offering
- Multiple revenue streams
- Team collaboration features
- Sticky platform (high retention)
- Enterprise sales opportunity

**Cons:**
- Longest development time (2-3 months)
- Highest infrastructure costs
- Requires frontend development
- More complex operations
- Customer support overhead

### Best For:
- Long-term product vision
- B2B sales
- Team-based security assessments
- Recurring revenue model

---

## Approach 4: Microservices Architecture

### Overview

Split the monolith into independent services for maximum scalability and team independence.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       API Gateway                                │
│                    (Kong / AWS API GW)                          │
│              Auth │ Rate Limit │ Routing │ Logging              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Web Scan  │   │   OSINT     │   │   Web3      │
│   Service   │   │   Service   │   │   Service   │
│             │   │             │   │             │
│  Port 3001  │   │  Port 3002  │   │  Port 3003  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    Shared Infrastructure                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Message │  │ Service │  │ Config  │  │ Secrets │           │
│  │ Queue   │  │ Mesh    │  │ Store   │  │ Manager │           │
│  │ (NATS)  │  │ (Istio) │  │ (etcd)  │  │ (Vault) │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Service Breakdown

```
services/
├── gateway/              # API Gateway
│   ├── src/
│   ├── Dockerfile
│   └── k8s/
│
├── web-scan-service/     # Web application scanning
│   ├── src/
│   │   ├── scanner/      # WebScanner, HeaderAnalyzer
│   │   ├── api/          # REST endpoints
│   │   └── queue/        # Job consumer
│   ├── Dockerfile
│   └── k8s/
│
├── osint-service/        # OSINT reconnaissance
│   ├── src/
│   │   ├── tools/        # 10 OSINT tools
│   │   ├── orchestrator/
│   │   └── api/
│   ├── Dockerfile
│   └── k8s/
│
├── web3-service/         # Smart contract auditing
│   ├── src/
│   │   ├── detectors/    # 11 vulnerability detectors
│   │   ├── parser/
│   │   └── api/
│   ├── Dockerfile
│   └── k8s/
│
├── analysis-service/     # PCAP, logs, SSL analysis
│   ├── src/
│   ├── Dockerfile
│   └── k8s/
│
├── ai-service/           # AI provider orchestration
│   ├── src/
│   │   ├── providers/    # Claude, OpenAI, Gemini, Ollama
│   │   └── chat/
│   ├── Dockerfile
│   └── k8s/
│
├── report-service/       # Report generation
│   ├── src/
│   ├── Dockerfile
│   └── k8s/
│
└── notification-service/ # Webhooks, emails, Slack
    ├── src/
    ├── Dockerfile
    └── k8s/
```

### Inter-Service Communication

```typescript
// Using NATS for event-driven communication
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: process.env.NATS_URL });
const sc = StringCodec();

// Publish scan completion event
await nc.publish('scan.completed', sc.encode(JSON.stringify({
  scanId: 'xxx',
  organizationId: 'yyy',
  findingsCount: 5,
  severity: { critical: 1, high: 2, medium: 2 }
})));

// Subscribe to events
const sub = nc.subscribe('scan.completed');
for await (const msg of sub) {
  const data = JSON.parse(sc.decode(msg.data));
  // Trigger notifications, update dashboards, etc.
}
```

### Kubernetes Deployment

```yaml
# k8s/web-scan-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-scan-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-scan-service
  template:
    metadata:
      labels:
        app: web-scan-service
    spec:
      containers:
      - name: web-scan
        image: cybercloud/web-scan-service:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-scan-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-scan-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Pros & Cons

**Pros:**
- Independent scaling per service
- Technology flexibility per service
- Team independence
- Fault isolation
- Easy to add new services

**Cons:**
- Significant operational complexity
- Network latency between services
- Data consistency challenges
- Debugging across services is harder
- Higher infrastructure costs
- Overkill for early stage

### Best For:
- Large engineering teams
- Very high scale requirements
- Multiple product lines
- Enterprise deployments

---

## Approach 5: Serverless/Edge Functions

### Overview

Deploy scanning capabilities as serverless functions for zero-infrastructure management and pay-per-use pricing.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CDN / Edge Network                           │
│                  (Cloudflare / Vercel Edge)                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                   Edge Functions (Fast)                          │
├─────────────────────────────────────────────────────────────────┤
│  SSL Check │ Header Analysis │ DNS Lookup │ Tech Detection      │
└─────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                Lambda / Cloud Functions (Heavy)                  │
├─────────────────────────────────────────────────────────────────┤
│  Full Web Scan │ OSINT │ Web3 Audit │ PCAP Analysis │ Log Parse │
└─────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                     Managed Services                             │
├─────────────────────────────────────────────────────────────────┤
│  Supabase (DB) │ Upstash (Redis) │ R2/S3 (Storage) │ Queues    │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

**Vercel Edge Function (Fast operations):**
```typescript
// api/edge/ssl-check.ts
import { NextRequest } from 'next/server';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest) {
  const { host } = await req.json();

  // Simple SSL check (edge-compatible)
  const response = await fetch(`https://${host}`, {
    method: 'HEAD',
    headers: { 'User-Agent': 'CyberClaude/1.0' }
  });

  const cert = response.headers.get('ssl-info'); // Simplified

  return new Response(JSON.stringify({
    valid: response.ok,
    headers: Object.fromEntries(response.headers),
    // Add more SSL details
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**AWS Lambda (Heavy operations):**
```typescript
// lambdas/full-web-scan/handler.ts
import { Handler } from 'aws-lambda';
import { WebScanner } from './scanner';

export const handler: Handler = async (event) => {
  const { url, level } = JSON.parse(event.body);

  const scanner = new WebScanner();
  const result = await scanner.fullScan(url, { level });

  // Store result in S3
  await s3.putObject({
    Bucket: process.env.RESULTS_BUCKET,
    Key: `scans/${event.requestContext.requestId}.json`,
    Body: JSON.stringify(result)
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      scanId: event.requestContext.requestId,
      result
    })
  };
};
```

**Serverless Framework Config:**
```yaml
# serverless.yml
service: cyber-claude-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  timeout: 300 # 5 minutes max
  memorySize: 1024

functions:
  web-scan:
    handler: lambdas/web-scan/handler.handler
    events:
      - http:
          path: /scan/web
          method: post
    timeout: 300
    memorySize: 2048

  osint:
    handler: lambdas/osint/handler.handler
    events:
      - http:
          path: /recon/osint
          method: post
    timeout: 300

  web3:
    handler: lambdas/web3/handler.handler
    events:
      - http:
          path: /scan/web3
          method: post
    timeout: 120
    memorySize: 1024

  # Quick operations
  ssl-check:
    handler: lambdas/ssl/handler.handler
    events:
      - http:
          path: /check/ssl
          method: post
    timeout: 30
    memorySize: 256

  header-check:
    handler: lambdas/headers/handler.handler
    events:
      - http:
          path: /check/headers
          method: post
    timeout: 30
    memorySize: 256
```

### Pros & Cons

**Pros:**
- Zero server management
- Auto-scaling to zero (cost efficient)
- Pay only for execution time
- Global edge deployment
- Fast cold starts for edge functions

**Cons:**
- 15-minute max execution (Lambda)
- Cold start latency
- Limited to stateless operations
- Complex for long-running scans
- Vendor lock-in
- Bundle size limits

### Best For:
- Quick checks (SSL, headers, DNS)
- Stateless operations
- Variable/unpredictable traffic
- Cost-sensitive deployments
- Global low-latency requirements

---

## Approach 6: Hybrid Model

### Overview

Combine the best of multiple approaches: Edge for fast checks, API for medium operations, Job queue for heavy scans.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Clients                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────────┐
│                    Smart Router (API Gateway)                    │
│         Routes based on operation type and expected duration    │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │    FAST     │    │   MEDIUM    │    │    SLOW     │
    │  (< 5 sec)  │    │ (5-60 sec)  │    │  (> 60 sec) │
    ├─────────────┤    ├─────────────┤    ├─────────────┤
    │ Edge/Lambda │    │  REST API   │    │  Job Queue  │
    │             │    │ (Synchronous)│    │ (Async)     │
    ├─────────────┤    ├─────────────┤    ├─────────────┤
    │ • SSL Check │    │ • Quick Scan │   │ • Full Scan │
    │ • Headers   │    │ • Basic OSINT│   │ • Aggressive│
    │ • DNS       │    │ • CVE Lookup │   │ • Deep OSINT│
    │ • Tech Det  │    │ • Deps Scan  │   │ • Web3 Audit│
    │             │    │              │   │ • PCAP      │
    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Shared Data   │
                    │    Layer        │
                    │ (Supabase/Redis)│
                    └─────────────────┘
```

### Implementation

**Smart Router:**
```typescript
// src/api/router/smartRouter.ts
interface RouteDecision {
  handler: 'edge' | 'sync' | 'async';
  estimatedDuration: number;
  endpoint: string;
}

const ROUTE_CONFIG: Record<string, RouteDecision> = {
  'ssl-check': { handler: 'edge', estimatedDuration: 2000, endpoint: '/edge/ssl' },
  'header-check': { handler: 'edge', estimatedDuration: 1000, endpoint: '/edge/headers' },
  'dns-lookup': { handler: 'edge', estimatedDuration: 3000, endpoint: '/edge/dns' },
  'tech-detect': { handler: 'sync', estimatedDuration: 10000, endpoint: '/api/tech' },
  'quick-scan': { handler: 'sync', estimatedDuration: 30000, endpoint: '/api/scan/quick' },
  'cve-lookup': { handler: 'sync', estimatedDuration: 5000, endpoint: '/api/cve' },
  'deps-scan': { handler: 'sync', estimatedDuration: 15000, endpoint: '/api/deps' },
  'full-scan': { handler: 'async', estimatedDuration: 120000, endpoint: '/jobs' },
  'aggressive-scan': { handler: 'async', estimatedDuration: 300000, endpoint: '/jobs' },
  'deep-osint': { handler: 'async', estimatedDuration: 180000, endpoint: '/jobs' },
  'web3-audit': { handler: 'async', estimatedDuration: 120000, endpoint: '/jobs' },
  'pcap-analysis': { handler: 'async', estimatedDuration: 60000, endpoint: '/jobs' }
};

export function routeRequest(operation: string): RouteDecision {
  return ROUTE_CONFIG[operation] || { handler: 'sync', estimatedDuration: 30000, endpoint: '/api/generic' };
}
```

**Unified Response Format:**
```typescript
// All handlers return the same format
interface ScanResponse {
  // Immediate results (for sync/edge)
  result?: any;

  // Job reference (for async)
  jobId?: string;
  statusUrl?: string;
  webhookConfigured?: boolean;

  // Common metadata
  meta: {
    operation: string;
    handler: 'edge' | 'sync' | 'async';
    duration?: number;
    estimatedCompletion?: Date;
    cached?: boolean;
  };
}
```

### Pros & Cons

**Pros:**
- Optimal performance per operation type
- Cost-efficient (edge for cheap, workers for heavy)
- Best user experience
- Flexible scaling
- Graceful degradation

**Cons:**
- Most complex implementation
- Multiple deployment targets
- Testing across environments
- Monitoring complexity

### Best For:
- Production SaaS
- Mixed workload patterns
- Cost optimization at scale

---

## Feature Comparison Matrix

| Feature | REST API | Job Queue | Full SaaS | Microservices | Serverless | Hybrid |
|---------|----------|-----------|-----------|---------------|------------|--------|
| **Implementation Time** | 2-4 weeks | 4-6 weeks | 8-12 weeks | 12-16 weeks | 3-5 weeks | 6-8 weeks |
| **Infrastructure Cost** | $ | $$ | $$$ | $$$$ | $ | $$ |
| **Operational Complexity** | Low | Medium | High | Very High | Low | Medium |
| **Scalability** | Medium | High | High | Very High | Very High | High |
| **Long-running Support** | Poor | Excellent | Excellent | Excellent | Poor | Excellent |
| **Real-time Updates** | No | Yes | Yes | Yes | No | Yes |
| **Multi-tenant** | Manual | Manual | Built-in | Built-in | Manual | Built-in |
| **Team Features** | No | No | Yes | Yes | No | Yes |
| **Best For** | MVP | Production | Full Product | Enterprise | Low Traffic | Production |

---

## Monetization Strategies

### 1. Subscription Tiers

| Tier | Price | Scans | Features |
|------|-------|-------|----------|
| **Free** | $0/mo | 10 | Quick scans, basic OSINT |
| **Starter** | $29/mo | 100 | + Full scans, API access |
| **Pro** | $99/mo | 500 | + Aggressive, Web3, integrations |
| **Team** | $299/mo | 2000 | + 5 users, scheduled scans |
| **Enterprise** | Custom | Unlimited | + SSO, audit, priority support |

### 2. Usage-Based Pricing

| Operation | Credits | Typical Price |
|-----------|---------|---------------|
| Quick Scan | 1 | $0.10 |
| Full Scan | 5 | $0.50 |
| Aggressive Scan | 15 | $1.50 |
| OSINT (surface) | 2 | $0.20 |
| OSINT (deep) | 10 | $1.00 |
| Web3 Audit | 20 | $2.00 |
| PCAP Analysis | 5 | $0.50 |
| AI Chat (per message) | 1 | $0.10 |

**Credit Packages:**
- 100 credits: $8 ($0.08/credit)
- 500 credits: $35 ($0.07/credit)
- 2000 credits: $120 ($0.06/credit)

### 3. Enterprise Licensing

- **Annual License**: $10,000-50,000/year
- **On-premise deployment**: +50% premium
- **Custom integrations**: $5,000-20,000 setup
- **Training & support**: $2,000-5,000/year

### 4. Marketplace Listings

- **AWS Marketplace**: SaaS or AMI
- **Azure Marketplace**: Container or SaaS
- **Vercel/Netlify**: Integration apps

### 5. API Reseller Program

Allow partners to resell API access:
- 70/30 revenue split
- White-label reports
- Custom branding

---

## Infrastructure & Deployment

### Recommended Stack

| Component | Service | Why |
|-----------|---------|-----|
| **Database** | Supabase | Postgres + Auth + RLS + Real-time |
| **Cache/Queue** | Upstash Redis | Serverless Redis, BullMQ compatible |
| **Storage** | Cloudflare R2 | S3-compatible, no egress fees |
| **API Hosting** | Railway / Render | Simple container hosting |
| **Edge Functions** | Cloudflare Workers | Global, fast, cheap |
| **Monitoring** | Axiom / Datadog | Log aggregation + APM |
| **Error Tracking** | Sentry | Exception monitoring |
| **Payments** | Stripe | Subscriptions + usage billing |

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/cybercloud
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - db
      - redis

  worker:
    build: .
    command: npm run worker
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/cybercloud
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - db
      - redis

  db:
    image: supabase/postgres:15.1.0.117
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Production Deployment (Railway)

```toml
# railway.toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300

[[services]]
name = "api"
[services.deploy]
replicas = 2

[[services]]
name = "worker"
[services.deploy]
replicas = 3
```

### Cost Estimates

| Tier | Users | Monthly Cost | Services |
|------|-------|--------------|----------|
| **Starter** | 0-100 | $50-100 | Supabase Free, Upstash Free, Railway Hobby |
| **Growth** | 100-1000 | $200-500 | Supabase Pro, Upstash Pay-go, Railway Pro |
| **Scale** | 1000-10000 | $1000-3000 | Supabase Team, Dedicated Redis, Multiple workers |
| **Enterprise** | 10000+ | $5000+ | Self-hosted / Cloud enterprise tiers |

---

## Security Considerations

### API Security

```typescript
// Security middleware stack
app.register(helmet);              // Security headers
app.register(cors, {               // CORS
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
});
app.register(rateLimit, {          // Rate limiting
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
});

// Input validation (Zod)
const ScanRequestSchema = z.object({
  url: z.string().url().refine(
    (url) => !isBlockedDomain(url),
    'This domain cannot be scanned'
  ),
  level: z.enum(['quick', 'full', 'aggressive']).default('quick')
});

// Output sanitization
function sanitizeResult(result: any): any {
  // Remove internal paths, IPs, etc.
  return omit(result, ['internalPath', 'workerIp', 'debugInfo']);
}
```

### Domain Blocklist

Prevent scanning sensitive targets:
```typescript
const BLOCKED_DOMAINS = [
  // Government
  /\.gov$/,
  /\.mil$/,
  // Financial
  /\.bank$/,
  /paypal\.com$/,
  /stripe\.com$/,
  // Critical infrastructure
  /\.edu$/,
  // Add more...
];

function isBlockedDomain(url: string): boolean {
  const hostname = new URL(url).hostname;
  return BLOCKED_DOMAINS.some(pattern =>
    pattern instanceof RegExp
      ? pattern.test(hostname)
      : hostname.includes(pattern)
  );
}
```

### Audit Logging

```typescript
// Log all security-relevant actions
async function auditLog(event: AuditEvent) {
  await supabase.from('audit_log').insert({
    organization_id: event.orgId,
    user_id: event.userId,
    action: event.action,
    resource_type: event.resourceType,
    resource_id: event.resourceId,
    details: event.details,
    ip_address: event.ip,
    user_agent: event.userAgent
  });
}

// Usage
await auditLog({
  orgId: req.user.organization_id,
  userId: req.user.id,
  action: 'scan.created',
  resourceType: 'scan',
  resourceId: scan.id,
  details: { target: scan.target, level: scan.level },
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

---

## Recommended Path Forward

### Phase 1: MVP (Weeks 1-4)
**Goal:** Validate market demand

1. **Implement REST API** (Approach 1)
   - Core endpoints: `/scan/web`, `/recon/osint`, `/scan/web3`
   - API key authentication
   - Basic rate limiting
   - OpenAPI documentation

2. **Simple Landing Page**
   - Waitlist signup
   - API documentation
   - Pricing preview

3. **Initial Users**
   - Beta program with 10-20 users
   - Collect feedback

### Phase 2: Production (Weeks 5-8)
**Goal:** Handle real workloads

1. **Add Job Queue** (Approach 2)
   - BullMQ for long-running scans
   - WebSocket progress updates
   - Webhook notifications

2. **User Dashboard**
   - Basic Next.js dashboard
   - Scan history
   - API key management

3. **Billing Integration**
   - Stripe subscriptions
   - Usage tracking

### Phase 3: Full Platform (Weeks 9-16)
**Goal:** Complete SaaS offering

1. **Multi-tenant features** (Approach 3)
   - Team management
   - Role-based access
   - Scheduled scans

2. **Integrations**
   - Slack/Discord notifications
   - GitHub Actions
   - Jira/Linear

3. **Advanced Features**
   - Compliance reports
   - Trend analysis
   - Custom AI models

### Phase 4: Scale (Weeks 17+)
**Goal:** Enterprise readiness

1. **Hybrid Architecture** (Approach 6)
   - Edge functions for quick checks
   - Optimized routing

2. **Enterprise Features**
   - SSO/SAML
   - On-premise option
   - SLA guarantees

---

## Next Steps

1. **Choose initial approach** based on your timeline and resources
2. **Set up infrastructure** (Supabase, Redis, hosting)
3. **Create API foundation** (`src/api/` directory structure)
4. **Implement core endpoints** starting with highest-value tools
5. **Deploy MVP** and gather feedback
6. **Iterate** based on user needs

---

## Appendix: File Structure for API

```
src/
├── api/
│   ├── server.ts                 # Fastify server setup
│   ├── middleware/
│   │   ├── auth.ts               # API key validation
│   │   ├── rateLimit.ts          # Per-key rate limiting
│   │   ├── validator.ts          # Zod request validation
│   │   ├── errorHandler.ts       # Centralized errors
│   │   └── audit.ts              # Audit logging
│   ├── routes/
│   │   ├── index.ts              # Route aggregator
│   │   ├── scan.ts               # POST /scan/*
│   │   ├── recon.ts              # POST /recon/*
│   │   ├── analyze.ts            # POST /analyze/*
│   │   ├── chat.ts               # POST /chat
│   │   ├── jobs.ts               # Job management
│   │   ├── tools.ts              # GET /tools
│   │   └── health.ts             # GET /health
│   ├── queue/
│   │   ├── jobQueue.ts           # BullMQ setup
│   │   ├── worker.ts             # Job processor
│   │   └── types.ts              # Job types
│   ├── services/
│   │   ├── apiKeyService.ts      # Key management
│   │   ├── usageService.ts       # Usage tracking
│   │   └── webhookService.ts     # Webhook delivery
│   ├── storage/
│   │   └── resultStorage.ts      # S3/DB result storage
│   └── types/
│       ├── api.ts                # API types
│       └── responses.ts          # Response schemas
├── cli/                          # Existing CLI (unchanged)
├── agent/                        # Existing agent (unchanged)
└── utils/                        # Existing utils (unchanged)
```

---

*Document generated for Cyber Claude SECaaS planning*
