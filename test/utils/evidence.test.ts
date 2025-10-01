import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EvidenceManager, EvidenceReport, type EvidenceMetadata } from '../../src/utils/evidence.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('EvidenceManager', () => {
  let testDir: string;
  let testFilePath: string;
  const testContent = 'This is test evidence content for hashing';

  beforeEach(async () => {
    // Create temporary directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cyber-claude-test-'));
    testFilePath = path.join(testDir, 'test-evidence.txt');
    await fs.writeFile(testFilePath, testContent);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('calculateHashes', () => {
    it('should calculate MD5, SHA1, and SHA256 hashes', async () => {
      const hashes = await EvidenceManager.calculateHashes(testFilePath);

      expect(hashes.md5).toBeDefined();
      expect(hashes.sha1).toBeDefined();
      expect(hashes.sha256).toBeDefined();

      // Check hash format
      expect(hashes.md5).toMatch(/^[a-f0-9]{32}$/);
      expect(hashes.sha1).toMatch(/^[a-f0-9]{40}$/);
      expect(hashes.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes for same content', async () => {
      const hashes1 = await EvidenceManager.calculateHashes(testFilePath);
      const hashes2 = await EvidenceManager.calculateHashes(testFilePath);

      expect(hashes1.md5).toBe(hashes2.md5);
      expect(hashes1.sha1).toBe(hashes2.sha1);
      expect(hashes1.sha256).toBe(hashes2.sha256);
    });

    it('should produce different hashes for different content', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');

      await fs.writeFile(file1, 'Content 1');
      await fs.writeFile(file2, 'Content 2');

      const hashes1 = await EvidenceManager.calculateHashes(file1);
      const hashes2 = await EvidenceManager.calculateHashes(file2);

      expect(hashes1.md5).not.toBe(hashes2.md5);
      expect(hashes1.sha1).not.toBe(hashes2.sha1);
      expect(hashes1.sha256).not.toBe(hashes2.sha256);
    });
  });

  describe('createEvidence', () => {
    it('should create evidence metadata with all required fields', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Network capture',
        collectedBy: 'Analyst 1',
        caseNumber: 'CASE-2023-001',
        description: 'Test evidence file',
      });

      expect(evidence.id).toMatch(/^EV-/);
      expect(evidence.filename).toBe('test-evidence.txt');
      expect(evidence.filepath).toBe(testFilePath);
      expect(evidence.fileSize).toBe(testContent.length);
      expect(evidence.collectionDate).toBeInstanceOf(Date);
      expect(evidence.collectionMethod).toBe('Network capture');
      expect(evidence.collectedBy).toBe('Analyst 1');
      expect(evidence.caseNumber).toBe('CASE-2023-001');
      expect(evidence.description).toBe('Test evidence file');
    });

    it('should calculate and store hashes', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Disk imaging',
        collectedBy: 'Analyst 2',
      });

      expect(evidence.hashes.md5).toBeDefined();
      expect(evidence.hashes.sha1).toBeDefined();
      expect(evidence.hashes.sha256).toBeDefined();
    });

    it('should initialize chain of custody', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Memory dump',
        collectedBy: 'Analyst 3',
      });

      expect(evidence.chainOfCustody).toHaveLength(1);
      expect(evidence.chainOfCustody[0].action).toBe('collected');
      expect(evidence.chainOfCustody[0].performedBy).toBe('Analyst 3');
      expect(evidence.chainOfCustody[0].hashVerified).toBe(true);
    });

    it('should generate unique evidence IDs', async () => {
      const evidence1 = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      const evidence2 = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      expect(evidence1.id).not.toBe(evidence2.id);
    });

    it('should handle optional fields', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      expect(evidence.caseNumber).toBeUndefined();
      expect(evidence.description).toBeUndefined();
    });
  });

  describe('verifyEvidence', () => {
    it('should verify unmodified evidence', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      const verification = await EvidenceManager.verifyEvidence(evidence);

      expect(verification.valid).toBe(true);
      expect(verification.message).toContain('integrity verified');
    });

    it('should detect modified evidence', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      // Modify the file
      await fs.appendFile(testFilePath, '\nModified content');

      const verification = await EvidenceManager.verifyEvidence(evidence);

      expect(verification.valid).toBe(false);
      expect(verification.message).toContain('COMPROMISED');
    });

    it('should return current hashes', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      const verification = await EvidenceManager.verifyEvidence(evidence);

      expect(verification.currentHashes.md5).toBe(evidence.hashes.md5);
      expect(verification.currentHashes.sha1).toBe(evidence.hashes.sha1);
      expect(verification.currentHashes.sha256).toBe(evidence.hashes.sha256);
    });

    it('should handle missing files gracefully', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      // Delete the file
      await fs.unlink(testFilePath);

      const verification = await EvidenceManager.verifyEvidence(evidence);

      expect(verification.valid).toBe(false);
      expect(verification.message).toContain('failed');
    });
  });

  describe('addChainOfCustodyEntry', () => {
    it('should add new entry to chain of custody', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst 1',
      });

      const updated = EvidenceManager.addChainOfCustodyEntry(evidence, {
        action: 'analyzed',
        performedBy: 'Analyst 2',
        location: 'Lab A',
        notes: 'Initial analysis completed',
        hashVerified: true,
      });

      expect(updated.chainOfCustody).toHaveLength(2);
      expect(updated.chainOfCustody[1].action).toBe('analyzed');
      expect(updated.chainOfCustody[1].performedBy).toBe('Analyst 2');
      expect(updated.chainOfCustody[1].location).toBe('Lab A');
      expect(updated.chainOfCustody[1].timestamp).toBeInstanceOf(Date);
    });

    it('should support all action types', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      const actions: Array<'collected' | 'analyzed' | 'transferred' | 'stored' | 'exported'> = [
        'analyzed',
        'transferred',
        'stored',
        'exported',
      ];

      for (const action of actions) {
        EvidenceManager.addChainOfCustodyEntry(evidence, {
          action,
          performedBy: 'Analyst',
        });
      }

      expect(evidence.chainOfCustody).toHaveLength(5); // 1 initial + 4 added
    });
  });

  describe('exportMetadata', () => {
    it('should export metadata to JSON file', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
        caseNumber: 'CASE-001',
      });

      const exportPath = path.join(testDir, 'metadata.json');
      await EvidenceManager.exportMetadata(evidence, exportPath);

      const exported = await fs.readFile(exportPath, 'utf-8');
      const parsed = JSON.parse(exported);

      expect(parsed.id).toBe(evidence.id);
      expect(parsed.caseNumber).toBe('CASE-001');
      expect(parsed.hashes.sha256).toBe(evidence.hashes.sha256);
    });

    it('should create valid JSON', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      const exportPath = path.join(testDir, 'metadata.json');
      await EvidenceManager.exportMetadata(evidence, exportPath);

      const content = await fs.readFile(exportPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('formatMetadata', () => {
    it('should format metadata for display', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Packet capture',
        collectedBy: 'SOC Analyst',
        caseNumber: 'INC-2023-042',
        description: 'Suspicious network traffic',
      });

      const formatted = EvidenceManager.formatMetadata(evidence);

      expect(formatted).toContain('Evidence Metadata');
      expect(formatted).toContain(evidence.id);
      expect(formatted).toContain('test-evidence.txt');
      expect(formatted).toContain('Packet capture');
      expect(formatted).toContain('SOC Analyst');
      expect(formatted).toContain('INC-2023-042');
      expect(formatted).toContain('Suspicious network traffic');
      expect(formatted).toContain('Cryptographic Hashes');
      expect(formatted).toContain('Chain of Custody');
    });

    it('should include all hash values', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst',
      });

      const formatted = EvidenceManager.formatMetadata(evidence);

      expect(formatted).toContain(evidence.hashes.md5);
      expect(formatted).toContain(evidence.hashes.sha1);
      expect(formatted).toContain(evidence.hashes.sha256);
    });

    it('should show chain of custody entries', async () => {
      const evidence = await EvidenceManager.createEvidence(testFilePath, {
        collectionMethod: 'Test',
        collectedBy: 'Analyst 1',
      });

      EvidenceManager.addChainOfCustodyEntry(evidence, {
        action: 'analyzed',
        performedBy: 'Analyst 2',
        location: 'Lab',
        notes: 'Analysis complete',
      });

      const formatted = EvidenceManager.formatMetadata(evidence);

      expect(formatted).toContain('COLLECTED');
      expect(formatted).toContain('ANALYZED');
      expect(formatted).toContain('Analyst 2');
      expect(formatted).toContain('Lab');
      expect(formatted).toContain('Analysis complete');
    });
  });
});

describe('EvidenceReport', () => {
  let testDir: string;
  let testFilePath: string;
  let evidence: EvidenceMetadata;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cyber-claude-test-'));
    testFilePath = path.join(testDir, 'evidence.pcap');
    await fs.writeFile(testFilePath, 'Mock PCAP data');

    evidence = await EvidenceManager.createEvidence(testFilePath, {
      collectionMethod: 'Network tap',
      collectedBy: 'Network Analyst',
      caseNumber: 'SEC-2023-100',
      description: 'Captured during incident response',
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  describe('generateReport', () => {
    it('should generate complete forensic report', () => {
      const analysisResults = '## Analysis\n\nSuspicious activity detected.';
      const report = EvidenceReport.generateReport(evidence, analysisResults);

      expect(report).toContain('# Forensic Evidence Report');
      expect(report).toContain('**Report Generated:**');
      expect(report).toContain('## Evidence Information');
      expect(report).toContain('## Cryptographic Hashes');
      expect(report).toContain('## Chain of Custody');
      expect(report).toContain('## Analysis Results');
    });

    it('should include evidence metadata', () => {
      const report = EvidenceReport.generateReport(evidence, 'Analysis results');

      expect(report).toContain(evidence.id);
      expect(report).toContain(evidence.filename);
      expect(report).toContain('Network tap');
      expect(report).toContain('Network Analyst');
      expect(report).toContain('SEC-2023-100');
    });

    it('should include all hash values', () => {
      const report = EvidenceReport.generateReport(evidence, 'Analysis results');

      expect(report).toContain(evidence.hashes.md5);
      expect(report).toContain(evidence.hashes.sha1);
      expect(report).toContain(evidence.hashes.sha256);
    });

    it('should include chain of custody', () => {
      EvidenceManager.addChainOfCustodyEntry(evidence, {
        action: 'transferred',
        performedBy: 'Lead Analyst',
        location: 'Secure Storage',
      });

      const report = EvidenceReport.generateReport(evidence, 'Results');

      expect(report).toContain('COLLECTED');
      expect(report).toContain('TRANSFERRED');
      expect(report).toContain('Lead Analyst');
      expect(report).toContain('Secure Storage');
    });

    it('should include analysis results', () => {
      const analysis = 'Malware detected in packet stream';
      const report = EvidenceReport.generateReport(evidence, analysis);

      expect(report).toContain(analysis);
    });

    it('should be valid markdown', () => {
      const report = EvidenceReport.generateReport(evidence, '# Test Analysis');

      expect(report).toMatch(/^# /m); // Has header
      expect(report).toContain('##'); // Has subheaders
      expect(report).toContain('|'); // Has table
      expect(report).toContain('```'); // Has code block
    });
  });
});
