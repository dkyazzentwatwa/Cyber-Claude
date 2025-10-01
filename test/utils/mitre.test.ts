import { describe, it, expect } from 'vitest';
import { MitreMapper } from '../../src/utils/mitre.js';

describe('MitreMapper', () => {
  let mapper: MitreMapper;

  beforeEach(() => {
    mapper = new MitreMapper();
  });

  describe('Technique Retrieval', () => {
    it('should get technique by ID', () => {
      const technique = MitreMapper.getTechnique('T1190');

      expect(technique).toBeDefined();
      expect(technique?.id).toBe('T1190');
      expect(technique?.name).toBe('Exploit Public-Facing Application');
      expect(technique?.tactics).toContain('Initial Access');
    });

    it('should return undefined for invalid technique ID', () => {
      const technique = MitreMapper.getTechnique('T9999');
      expect(technique).toBeUndefined();
    });

    it('should get techniques by tactic', () => {
      const techniques = MitreMapper.getTechniquesByTactic('Command and Control');

      expect(techniques.length).toBeGreaterThan(0);
      techniques.forEach(t => {
        expect(t.tactics).toContain('Command and Control');
      });
    });
  });

  describe('XSS/Injection Mapping', () => {
    it('should map XSS vulnerabilities to correct techniques', () => {
      const mappings = mapper.mapFinding(
        'Cross-Site Scripting',
        'XSS vulnerability found in user input field',
        'Injection'
      );

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings.some(m => m.technique.id === 'T1059')).toBe(true);
      expect(mappings.find(m => m.technique.id === 'T1059')?.confidence).toBe('high');
    });

    it('should map SQL injection vulnerabilities', () => {
      const mappings = mapper.mapFinding(
        'SQL Injection',
        'SQL injection vulnerability detected in login form',
        'Injection'
      );

      expect(mappings.some(m => m.technique.id === 'T1190')).toBe(true);
      expect(mappings.some(m => m.technique.id === 'T1552')).toBe(true);
    });
  });

  describe('Security Header Mapping', () => {
    it('should map missing security headers', () => {
      const mappings = mapper.mapFinding(
        'Missing Security Headers',
        'Missing X-Frame-Options header',
        'Configuration'
      );

      expect(mappings.some(m => m.technique.id === 'T1562')).toBe(true);
      expect(mappings.find(m => m.technique.id === 'T1562')?.evidence).toContain('security headers');
    });
  });

  describe('Brute Force Mapping', () => {
    it('should map brute force vulnerabilities', () => {
      const mappings = mapper.mapFinding(
        'No Rate Limiting',
        'Login endpoint lacks brute force protection',
        'Authentication'
      );

      expect(mappings.some(m => m.technique.id === 'T1110')).toBe(true);
      expect(mappings.find(m => m.technique.id === 'T1110')?.confidence).toBe('high');
    });
  });

  describe('CSRF Mapping', () => {
    it('should map CSRF vulnerabilities', () => {
      const mappings = mapper.mapFinding(
        'CSRF Vulnerability',
        'Cross-site request forgery token missing',
        'Session Management'
      );

      expect(mappings.some(m => m.technique.id === 'T1190')).toBe(true);
    });
  });

  describe('Network Scanning Mapping', () => {
    it('should map port scanning activity', () => {
      const mappings = mapper.mapFinding(
        'Port Scan Detected',
        'Systematic port scanning from external IP',
        'Network'
      );

      expect(mappings.some(m => m.technique.id === 'T1046')).toBe(true);
      expect(mappings.some(m => m.technique.id === 'T1018')).toBe(true);
    });
  });

  describe('Browser Hijacker Mapping', () => {
    it('should map browser hijacker/adware', () => {
      const mappings = mapper.mapFinding(
        'Browser Hijacker',
        'Malicious browser extension detected',
        'Malware'
      );

      expect(mappings.some(m => m.technique.id === 'T1176')).toBe(true);
      expect(mappings.some(m => m.technique.id === 'T1071')).toBe(true);
    });
  });

  describe('Unencrypted Traffic Mapping', () => {
    it('should map unencrypted traffic risks', () => {
      const mappings = mapper.mapFinding(
        'Unencrypted HTTP Traffic',
        'Sensitive data transmitted over plaintext HTTP',
        'Network'
      );

      expect(mappings.some(m => m.technique.id === 'T1557')).toBe(true);
      expect(mappings.find(m => m.technique.id === 'T1557')?.evidence).toContain('adversary-in-the-middle');
    });
  });

  describe('C2 Communication Mapping', () => {
    it('should map C2 indicators', () => {
      const mappings = mapper.mapFinding(
        'C2 Communication',
        'Command and control beacon detected',
        'Network'
      );

      expect(mappings.some(m => m.technique.id === 'T1071')).toBe(true);
      expect(mappings.some(m => m.technique.id === 'T1041')).toBe(true);
    });
  });

  describe('Obfuscation Mapping', () => {
    it('should map obfuscated data', () => {
      const mappings = mapper.mapFinding(
        'Obfuscated Payload',
        'Base64 encoded malicious script detected',
        'Evasion'
      );

      expect(mappings.some(m => m.technique.id === 'T1140')).toBe(true);
    });
  });

  describe('Data Exfiltration Mapping', () => {
    it('should map exfiltration activity', () => {
      const mappings = mapper.mapFinding(
        'Data Exfiltration',
        'Large volume of data sent to external server',
        'Network'
      );

      expect(mappings.some(m => m.technique.id === 'T1048')).toBe(true);
    });
  });

  describe('Confidence Levels', () => {
    it('should assign appropriate confidence levels', () => {
      const mappings = mapper.mapFinding(
        'SQL Injection',
        'Confirmed SQL injection vulnerability',
        'Injection'
      );

      expect(mappings.some(m => m.confidence === 'high')).toBe(true);
    });

    it('should include evidence in mappings', () => {
      const mappings = mapper.mapFinding(
        'Port Scan',
        'Network scanning detected',
        'Discovery'
      );

      mappings.forEach(m => {
        expect(m.evidence).toBeDefined();
        expect(m.evidence.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Mapping Formatting', () => {
    it('should format mappings for display', () => {
      const mappings = mapper.mapFinding(
        'XSS Vulnerability',
        'Cross-site scripting found',
        'Injection'
      );

      const formatted = MitreMapper.formatMappings(mappings);

      expect(formatted).toContain('MITRE ATT&CK Mapping');
      expect(formatted).toContain('T1059');
      expect(formatted).toContain('Tactics:');
      expect(formatted).toContain('Confidence:');
      expect(formatted).toContain('Evidence:');
      expect(formatted).toContain('Reference:');
    });

    it('should return empty string for no mappings', () => {
      const formatted = MitreMapper.formatMappings([]);
      expect(formatted).toBe('');
    });

    it('should use confidence emojis', () => {
      const mappings = mapper.mapFinding('SQL Injection', 'Test', 'Injection');
      const formatted = MitreMapper.formatMappings(mappings);

      // Should contain high confidence emoji
      expect(formatted).toMatch(/[🔴🟡🟢]/);
    });
  });

  describe('Multiple Technique Mapping', () => {
    it('should return multiple techniques for complex findings', () => {
      const mappings = mapper.mapFinding(
        'SQL Injection with C2',
        'SQL injection used for command and control',
        'Injection'
      );

      // Should map both SQL injection and C2 techniques
      expect(mappings.length).toBeGreaterThan(2);
    });
  });

  describe('Case Insensitivity', () => {
    it('should match regardless of case', () => {
      const lower = mapper.mapFinding('xss vulnerability', 'test', 'injection');
      const upper = mapper.mapFinding('XSS VULNERABILITY', 'TEST', 'INJECTION');
      const mixed = mapper.mapFinding('XsS VuLnErAbIlItY', 'TeSt', 'InJeCtIoN');

      expect(lower.length).toBe(upper.length);
      expect(lower.length).toBe(mixed.length);
    });
  });
});
