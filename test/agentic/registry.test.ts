/**
 * Tool Registry Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_TOOLS,
  BUILTIN_TOOLS,
  MCP_TOOLS,
  getTool,
  getToolsByCategory,
  getToolsByRisk,
  searchByCapability,
  generateToolRegistryPrompt,
} from '../../src/agent/tools/registry.js';

describe('Tool Registry', () => {
  describe('Registry Completeness', () => {
    it('should have all expected tools', () => {
      expect(ALL_TOOLS.length).toBeGreaterThan(0);
      expect(BUILTIN_TOOLS.length).toBe(6); // scan, webscan, mobilescan, pcap, recon, harden
      expect(MCP_TOOLS.length).toBe(9); // Working MCP tools only
      expect(ALL_TOOLS.length).toBe(15); // 6 builtin + 9 MCP
    });

    it('should have all builtin tools', () => {
      const builtinNames = BUILTIN_TOOLS.map((t) => t.name);
      expect(builtinNames).toContain('scan');
      expect(builtinNames).toContain('webscan');
      expect(builtinNames).toContain('mobilescan');
      expect(builtinNames).toContain('pcap');
      expect(builtinNames).toContain('recon');
      expect(builtinNames).toContain('harden');
    });

    it('should have all MCP tools', () => {
      const mcpNames = MCP_TOOLS.map((t) => t.name);
      expect(mcpNames).toContain('nuclei');
      expect(mcpNames).toContain('nmap');
      expect(mcpNames).toContain('sslscan');
      expect(mcpNames).toContain('sqlmap');
      expect(mcpNames).toContain('ffuf');
      expect(mcpNames).toContain('wpscan');
      expect(mcpNames).toContain('mobsf');
      expect(mcpNames).toContain('gowitness');
      expect(mcpNames).toContain('cero');
      // Removed: httpx, katana, amass, masscan, http-headers (not integrated)
    });
  });

  describe('Tool Definitions', () => {
    it('should have valid tool definitions', () => {
      ALL_TOOLS.forEach((tool) => {
        // Required fields
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.category).toBeTruthy();
        expect(Array.isArray(tool.parameters)).toBe(true);
        expect(Array.isArray(tool.capabilities)).toBe(true);
        expect(typeof tool.requiresApproval).toBe('boolean');
        expect(typeof tool.estimatedDuration).toBe('number');
        expect(['low', 'medium', 'high']).toContain(tool.riskLevel);
        expect(Array.isArray(tool.examples)).toBe(true);
        expect(tool.examples.length).toBeGreaterThan(0);

        // Categories
        expect(['scanning', 'reconnaissance', 'analysis', 'reporting', 'utility']).toContain(
          tool.category
        );

        // Parameters
        tool.parameters.forEach((param) => {
          expect(param.name).toBeTruthy();
          expect(param.type).toBeTruthy();
          expect(param.description).toBeTruthy();
          expect(typeof param.required).toBe('boolean');
        });

        // Examples
        tool.examples.forEach((example) => {
          expect(example.description).toBeTruthy();
          expect(typeof example.parameters).toBe('object');
        });
      });
    });

    it('should have at least one required parameter per tool', () => {
      ALL_TOOLS.forEach((tool) => {
        const hasRequiredParam = tool.parameters.some((p) => p.required);
        expect(hasRequiredParam).toBe(true);
      });
    });

    it('should have capabilities listed', () => {
      ALL_TOOLS.forEach((tool) => {
        expect(tool.capabilities.length).toBeGreaterThan(0);
        tool.capabilities.forEach((cap) => {
          expect(typeof cap).toBe('string');
          expect(cap.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('getTool', () => {
    it('should retrieve tool by name', () => {
      const nmap = getTool('nmap');
      expect(nmap).toBeDefined();
      expect(nmap?.name).toBe('nmap');
      expect(nmap?.category).toBe('scanning');
    });

    it('should return undefined for unknown tool', () => {
      const unknown = getTool('nonexistent_tool_xyz');
      expect(unknown).toBeUndefined();
    });

    it('should retrieve all expected tools', () => {
      const toolNames = ['scan', 'nmap', 'nuclei', 'sslscan', 'recon', 'webscan'];
      toolNames.forEach((name) => {
        const tool = getTool(name);
        expect(tool).toBeDefined();
        expect(tool?.name).toBe(name);
      });
    });
  });

  describe('getToolsByCategory', () => {
    it('should get scanning tools', () => {
      const scanningTools = getToolsByCategory('scanning');
      expect(scanningTools.length).toBeGreaterThan(0);
      scanningTools.forEach((tool) => {
        expect(tool.category).toBe('scanning');
      });

      const names = scanningTools.map((t) => t.name);
      expect(names).toContain('scan');
      expect(names).toContain('nmap');
      expect(names).toContain('nuclei');
    });

    it('should get reconnaissance tools', () => {
      const reconTools = getToolsByCategory('reconnaissance');
      expect(reconTools.length).toBeGreaterThan(0);
      reconTools.forEach((tool) => {
        expect(tool.category).toBe('reconnaissance');
      });

      const names = reconTools.map((t) => t.name);
      expect(names).toContain('recon');
      expect(names).toContain('ffuf');
      expect(names).toContain('gowitness');
      expect(names).toContain('cero');
    });

    it('should get analysis tools', () => {
      const analysisTools = getToolsByCategory('analysis');
      expect(analysisTools.length).toBeGreaterThan(0);
      analysisTools.forEach((tool) => {
        expect(tool.category).toBe('analysis');
      });

      const names = analysisTools.map((t) => t.name);
      expect(names).toContain('pcap');
      expect(names).toContain('harden');
    });

    it('should return empty array for nonexistent category', () => {
      const tools = getToolsByCategory('nonexistent' as any);
      expect(tools).toEqual([]);
    });
  });

  describe('getToolsByRisk', () => {
    it('should get low risk tools', () => {
      const lowRisk = getToolsByRisk('low');
      expect(lowRisk.length).toBeGreaterThan(0);
      lowRisk.forEach((tool) => {
        expect(tool.riskLevel).toBe('low');
      });
    });

    it('should get medium risk tools', () => {
      const mediumRisk = getToolsByRisk('medium');
      expect(mediumRisk.length).toBeGreaterThan(0);
      mediumRisk.forEach((tool) => {
        expect(tool.riskLevel).toBe('medium');
      });
    });

    it('should get high risk tools', () => {
      const highRisk = getToolsByRisk('high');
      expect(highRisk.length).toBeGreaterThan(0);
      highRisk.forEach((tool) => {
        expect(tool.riskLevel).toBe('high');
      });

      // sqlmap should be high risk
      const names = highRisk.map((t) => t.name);
      expect(names).toContain('sqlmap');
    });
  });

  describe('searchByCapability', () => {
    it('should search tools by capability', () => {
      const vulnScanners = searchByCapability('vulnerability');
      expect(vulnScanners.length).toBeGreaterThan(0);

      const names = vulnScanners.map((t) => t.name);
      // scan has "vulnerability assessment" capability
      expect(names).toContain('scan');
    });

    it('should be case insensitive', () => {
      const upper = searchByCapability('SCANNING');
      const lower = searchByCapability('scanning');
      expect(upper.length).toBe(lower.length);
    });

    it('should support partial matches', () => {
      const certTools = searchByCapability('certificate');
      expect(certTools.length).toBeGreaterThan(0);

      const names = certTools.map((t) => t.name);
      // sslscan has "certificate validation" capability
      expect(names).toContain('sslscan');
    });

    it('should return empty array for no matches', () => {
      const result = searchByCapability('nonexistent_capability_xyz');
      expect(result).toEqual([]);
    });
  });

  describe('generateToolRegistryPrompt', () => {
    it('should generate AI-readable prompt', () => {
      const prompt = generateToolRegistryPrompt();

      expect(prompt).toBeTruthy();
      expect(prompt).toContain('Available Security Tools');

      // Should contain all tools
      ALL_TOOLS.forEach((tool) => {
        expect(prompt).toContain(tool.name);
        expect(prompt).toContain(tool.description);
      });
    });

    it('should include tool metadata', () => {
      const prompt = generateToolRegistryPrompt();

      expect(prompt).toContain('Category:');
      expect(prompt).toContain('Risk Level:');
      expect(prompt).toContain('Requires Approval:');
      expect(prompt).toContain('Parameters:');
      expect(prompt).toContain('Capabilities:');
      expect(prompt).toContain('Example:');
    });

    it('should be parseable for AI', () => {
      const prompt = generateToolRegistryPrompt();

      // Should have clear sections
      expect(prompt.split('###').length).toBeGreaterThan(ALL_TOOLS.length);

      // Should have proper formatting
      expect(prompt).toContain('REQUIRED');
      expect(prompt).toContain('optional');
    });
  });

  describe('Tool Consistency', () => {
    it('should have unique tool names', () => {
      const names = ALL_TOOLS.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have consistent parameter naming', () => {
      ALL_TOOLS.forEach((tool) => {
        tool.parameters.forEach((param) => {
          // Parameter names should be camelCase
          expect(param.name).toMatch(/^[a-z][a-zA-Z0-9]*$/);
        });
      });
    });

    it('should have reasonable estimated durations', () => {
      ALL_TOOLS.forEach((tool) => {
        expect(tool.estimatedDuration).toBeGreaterThan(0);
        expect(tool.estimatedDuration).toBeLessThanOrEqual(300000); // Max 5 minutes
      });
    });

    it('should require approval for high-risk tools', () => {
      const highRisk = getToolsByRisk('high');
      highRisk.forEach((tool) => {
        // High risk tools should generally require approval
        // (some might not if they're read-only)
        if (tool.name === 'sqlmap') {
          expect(tool.requiresApproval).toBe(true);
        }
      });
    });
  });

  describe('Example Parameters', () => {
    it('should have valid example parameters', () => {
      ALL_TOOLS.forEach((tool) => {
        tool.examples.forEach((example) => {
          // Check that required parameters are in example
          const requiredParams = tool.parameters.filter((p) => p.required);
          requiredParams.forEach((param) => {
            expect(example.parameters).toHaveProperty(param.name);
          });
        });
      });
    });

    it('should have realistic example values', () => {
      const nmap = getTool('nmap');
      expect(nmap).toBeDefined();
      expect(nmap!.examples[0].parameters.target).toBeTruthy();
      expect(typeof nmap!.examples[0].parameters.target).toBe('string');
    });
  });
});
