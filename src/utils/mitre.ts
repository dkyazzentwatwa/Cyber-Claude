/**
 * MITRE ATT&CK Framework Integration
 * Maps security findings to ATT&CK techniques
 */

export interface MitreTechnique {
  id: string; // e.g., "T1566"
  name: string;
  tactics: string[]; // Initial Access, Execution, etc.
  description: string;
  url: string;
  subtechniques?: MitreTechnique[];
}

export interface MitreMapping {
  technique: MitreTechnique;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

/**
 * MITRE ATT&CK Mapper
 * Maps security findings to ATT&CK techniques
 */
export class MitreMapper {
  private static readonly TECHNIQUES: Record<string, MitreTechnique> = {
    // Initial Access
    T1190: {
      id: 'T1190',
      name: 'Exploit Public-Facing Application',
      tactics: ['Initial Access'],
      description: 'Adversaries may attempt to exploit a weakness in an Internet-facing host or system.',
      url: 'https://attack.mitre.org/techniques/T1190/',
    },
    T1566: {
      id: 'T1566',
      name: 'Phishing',
      tactics: ['Initial Access'],
      description: 'Adversaries may send phishing messages to gain access to victim systems.',
      url: 'https://attack.mitre.org/techniques/T1566/',
    },

    // Execution
    T1059: {
      id: 'T1059',
      name: 'Command and Scripting Interpreter',
      tactics: ['Execution'],
      description: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.',
      url: 'https://attack.mitre.org/techniques/T1059/',
    },
    T1203: {
      id: 'T1203',
      name: 'Exploitation for Client Execution',
      tactics: ['Execution'],
      description: 'Adversaries may exploit software vulnerabilities in client applications to execute code.',
      url: 'https://attack.mitre.org/techniques/T1203/',
    },

    // Persistence
    T1176: {
      id: 'T1176',
      name: 'Browser Extensions',
      tactics: ['Persistence'],
      description: 'Adversaries may abuse Internet browser extensions to establish persistent access.',
      url: 'https://attack.mitre.org/techniques/T1176/',
    },
    T1543: {
      id: 'T1543',
      name: 'Create or Modify System Process',
      tactics: ['Persistence', 'Privilege Escalation'],
      description: 'Adversaries may create or modify system-level processes to repeatedly execute malicious payloads.',
      url: 'https://attack.mitre.org/techniques/T1543/',
    },

    // Defense Evasion
    T1140: {
      id: 'T1140',
      name: 'Deobfuscate/Decode Files or Information',
      tactics: ['Defense Evasion'],
      description: 'Adversaries may use obfuscated files or information to hide artifacts of an intrusion.',
      url: 'https://attack.mitre.org/techniques/T1140/',
    },
    T1562: {
      id: 'T1562',
      name: 'Impair Defenses',
      tactics: ['Defense Evasion'],
      description: 'Adversaries may maliciously modify components of a victim environment to hinder or disable defensive mechanisms.',
      url: 'https://attack.mitre.org/techniques/T1562/',
    },

    // Credential Access
    T1110: {
      id: 'T1110',
      name: 'Brute Force',
      tactics: ['Credential Access'],
      description: 'Adversaries may use brute force techniques to gain access to accounts.',
      url: 'https://attack.mitre.org/techniques/T1110/',
    },
    T1552: {
      id: 'T1552',
      name: 'Unsecured Credentials',
      tactics: ['Credential Access'],
      description: 'Adversaries may search compromised systems to find and obtain insecurely stored credentials.',
      url: 'https://attack.mitre.org/techniques/T1552/',
    },

    // Discovery
    T1046: {
      id: 'T1046',
      name: 'Network Service Discovery',
      tactics: ['Discovery'],
      description: 'Adversaries may attempt to get a listing of services running on remote hosts and local network infrastructure devices.',
      url: 'https://attack.mitre.org/techniques/T1046/',
    },
    T1018: {
      id: 'T1018',
      name: 'Remote System Discovery',
      tactics: ['Discovery'],
      description: 'Adversaries may attempt to get a listing of other systems by IP address, hostname, or other logical identifier.',
      url: 'https://attack.mitre.org/techniques/T1018/',
    },

    // Collection
    T1113: {
      id: 'T1113',
      name: 'Screen Capture',
      tactics: ['Collection'],
      description: 'Adversaries may attempt to take screen captures of the desktop to gather information.',
      url: 'https://attack.mitre.org/techniques/T1113/',
    },
    T1557: {
      id: 'T1557',
      name: 'Adversary-in-the-Middle',
      tactics: ['Collection', 'Credential Access'],
      description: 'Adversaries may attempt to position themselves between two or more networked devices.',
      url: 'https://attack.mitre.org/techniques/T1557/',
    },

    // Command and Control
    T1071: {
      id: 'T1071',
      name: 'Application Layer Protocol',
      tactics: ['Command and Control'],
      description: 'Adversaries may communicate using OSI application layer protocols to avoid detection.',
      url: 'https://attack.mitre.org/techniques/T1071/',
    },
    T1573: {
      id: 'T1573',
      name: 'Encrypted Channel',
      tactics: ['Command and Control'],
      description: 'Adversaries may employ a known encryption algorithm to conceal command and control traffic.',
      url: 'https://attack.mitre.org/techniques/T1573/',
    },
    T1095: {
      id: 'T1095',
      name: 'Non-Application Layer Protocol',
      tactics: ['Command and Control'],
      description: 'Adversaries may use an OSI non-application layer protocol for communication.',
      url: 'https://attack.mitre.org/techniques/T1095/',
    },

    // Exfiltration
    T1041: {
      id: 'T1041',
      name: 'Exfiltration Over C2 Channel',
      tactics: ['Exfiltration'],
      description: 'Adversaries may steal data by exfiltrating it over an existing command and control channel.',
      url: 'https://attack.mitre.org/techniques/T1041/',
    },
    T1048: {
      id: 'T1048',
      name: 'Exfiltration Over Alternative Protocol',
      tactics: ['Exfiltration'],
      description: 'Adversaries may steal data by exfiltrating it over a different protocol than that of the existing command and control channel.',
      url: 'https://attack.mitre.org/techniques/T1048/',
    },

    // Impact
    T1486: {
      id: 'T1486',
      name: 'Data Encrypted for Impact',
      tactics: ['Impact'],
      description: 'Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability.',
      url: 'https://attack.mitre.org/techniques/T1486/',
    },
    T1498: {
      id: 'T1498',
      name: 'Network Denial of Service',
      tactics: ['Impact'],
      description: 'Adversaries may perform Network Denial of Service (DoS) attacks to degrade or block the availability of targeted resources.',
      url: 'https://attack.mitre.org/techniques/T1498/',
    },
  };

  /**
   * Map a finding to MITRE ATT&CK techniques
   */
  mapFinding(findingTitle: string, findingDescription: string, category?: string): MitreMapping[] {
    const mappings: MitreMapping[] = [];
    const searchText = `${findingTitle} ${findingDescription} ${category || ''}`.toLowerCase();

    // XSS / Injection vulnerabilities
    if (searchText.includes('xss') || searchText.includes('cross-site scripting') || searchText.includes('injection')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1059,
        confidence: 'high',
        evidence: 'Code injection vulnerability allows arbitrary script execution',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1203,
        confidence: 'medium',
        evidence: 'Client-side exploitation possible through injected code',
      });
    }

    // Missing security headers / Weak configuration
    if (searchText.includes('missing') && searchText.includes('header')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1562,
        confidence: 'medium',
        evidence: 'Missing security headers weaken defensive capabilities',
      });
    }

    // SQL Injection
    if (searchText.includes('sql') && searchText.includes('injection')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1190,
        confidence: 'high',
        evidence: 'SQL injection allows exploitation of public-facing application',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1552,
        confidence: 'high',
        evidence: 'Database credentials may be accessible through SQL injection',
      });
    }

    // Brute force vulnerabilities
    if (searchText.includes('brute') || searchText.includes('rate limit')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1110,
        confidence: 'high',
        evidence: 'Lack of rate limiting enables brute force attacks',
      });
    }

    // CSRF
    if (searchText.includes('csrf') || searchText.includes('cross-site request')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1190,
        confidence: 'medium',
        evidence: 'CSRF vulnerability allows unauthorized actions',
      });
    }

    // Port scanning
    if (searchText.includes('port scan') || searchText.includes('network scan')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1046,
        confidence: 'high',
        evidence: 'Port scanning activity detected',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1018,
        confidence: 'medium',
        evidence: 'Network reconnaissance activity',
      });
    }

    // Browser hijacker / Adware
    if (searchText.includes('hijack') || searchText.includes('adware') || searchText.includes('browser extension')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1176,
        confidence: 'high',
        evidence: 'Browser hijacker establishes persistence through extensions',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1071,
        confidence: 'medium',
        evidence: 'HTTP-based C2 communication for adware/tracking',
      });
    }

    // Unencrypted traffic
    if (searchText.includes('unencrypted') || searchText.includes('http traffic') || searchText.includes('plaintext')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1557,
        confidence: 'medium',
        evidence: 'Unencrypted traffic susceptible to adversary-in-the-middle attacks',
      });
    }

    // C2 / Command and Control
    if (searchText.includes('c2') || searchText.includes('command and control') || searchText.includes('c&c')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1071,
        confidence: 'high',
        evidence: 'Application layer protocol used for C2 communication',
      });
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1041,
        confidence: 'medium',
        evidence: 'Data exfiltration over C2 channel',
      });
    }

    // Obfuscated data
    if (searchText.includes('obfuscated') || searchText.includes('encoded') || searchText.includes('base64')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1140,
        confidence: 'medium',
        evidence: 'Obfuscated data may hide malicious payloads',
      });
    }

    // Data exfiltration
    if (searchText.includes('exfiltration') || searchText.includes('data leak') || searchText.includes('tracking')) {
      mappings.push({
        technique: MitreMapper.TECHNIQUES.T1048,
        confidence: 'medium',
        evidence: 'Alternative protocol used for data exfiltration',
      });
    }

    return mappings;
  }

  /**
   * Get technique by ID
   */
  static getTechnique(id: string): MitreTechnique | undefined {
    return MitreMapper.TECHNIQUES[id];
  }

  /**
   * Get all techniques by tactic
   */
  static getTechniquesByTactic(tactic: string): MitreTechnique[] {
    return Object.values(MitreMapper.TECHNIQUES).filter(t => t.tactics.includes(tactic));
  }

  /**
   * Format MITRE mappings for display
   */
  static formatMappings(mappings: MitreMapping[]): string {
    if (mappings.length === 0) return '';

    let output = '\n🎯 MITRE ATT&CK Mapping:\n';
    for (const mapping of mappings) {
      const confidenceEmoji = mapping.confidence === 'high' ? '🔴' :
                             mapping.confidence === 'medium' ? '🟡' : '🟢';
      output += `  ${confidenceEmoji} ${mapping.technique.id} - ${mapping.technique.name}\n`;
      output += `     Tactics: ${mapping.technique.tactics.join(', ')}\n`;
      output += `     Confidence: ${mapping.confidence}\n`;
      output += `     Evidence: ${mapping.evidence}\n`;
      output += `     Reference: ${mapping.technique.url}\n`;
    }
    return output;
  }
}