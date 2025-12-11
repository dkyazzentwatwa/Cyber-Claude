/**
 * Solidity Source Code Parser
 *
 * Parses Solidity source files into a structured representation
 * for vulnerability analysis. Uses regex-based parsing for simplicity
 * and portability (no external AST dependencies).
 */

import { promises as fs } from 'fs';
import {
  ContractSource,
  ParsedContract,
  ContractDefinition,
  FunctionDefinition,
  StateVariable,
  EventDefinition,
  ModifierDefinition,
  Parameter,
  ParseError,
} from './types.js';
import { extractSolidityVersion } from '../../../utils/web3.js';

export class SolidityParser {
  /**
   * Parse contract from various sources
   */
  async parse(source: ContractSource): Promise<ParsedContract> {
    let sourceCode: string;
    let name: string;

    switch (source.type) {
      case 'file':
        if (!source.path) {
          throw new Error('File path required for file source type');
        }
        sourceCode = await fs.readFile(source.path, 'utf-8');
        name = source.path.split('/').pop()?.replace('.sol', '') || 'Unknown';
        break;

      case 'source':
        if (!source.code) {
          throw new Error('Source code required for source type');
        }
        sourceCode = source.code;
        name = source.name || 'Inline';
        break;

      case 'address':
        // For address type, we would need to fetch from block explorer
        // This is a placeholder - in production, integrate with Etherscan API
        throw new Error('Address source type requires Etherscan API integration. Use file or source type.');

      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }

    return this.parseSource(sourceCode, name);
  }

  /**
   * Parse Solidity source code string
   */
  parseSource(source: string, name: string): ParsedContract {
    const errors: ParseError[] = [];
    const pragma = extractSolidityVersion(source);
    const imports = this.extractImports(source);
    const contracts = this.extractContracts(source, errors);

    return {
      name,
      source,
      pragma: pragma || undefined,
      imports,
      contracts,
      errors,
    };
  }

  /**
   * Extract import statements
   */
  private extractImports(source: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:(?:\{[^}]+\}\s+from\s+)?["']([^"']+)["']|["']([^"']+)["']);/g;
    let match;

    while ((match = importRegex.exec(source)) !== null) {
      imports.push(match[1] || match[2]);
    }

    return imports;
  }

  /**
   * Extract contract definitions
   */
  private extractContracts(source: string, errors: ParseError[]): ContractDefinition[] {
    const contracts: ContractDefinition[] = [];
    const contractRegex = /\b(contract|interface|library|abstract\s+contract)\s+(\w+)(?:\s+is\s+([^{]+))?\s*\{/g;
    let match;

    while ((match = contractRegex.exec(source)) !== null) {
      const contractType = match[1].includes('interface') ? 'interface' :
                          match[1].includes('library') ? 'library' :
                          match[1].includes('abstract') ? 'abstract' : 'contract';
      const contractName = match[2];
      const inherits = match[3] ? match[3].split(',').map(s => s.trim()) : [];
      const startIndex = match.index;
      const lineStart = source.substring(0, startIndex).split('\n').length;

      // Find the matching closing brace
      const contractBody = this.extractBracedContent(source, match.index + match[0].length - 1);

      if (!contractBody) {
        errors.push({
          message: `Could not find closing brace for contract ${contractName}`,
          line: lineStart,
        });
        continue;
      }

      const lineEnd = source.substring(0, startIndex + match[0].length + contractBody.length).split('\n').length;

      contracts.push({
        name: contractName,
        type: contractType,
        inherits,
        functions: this.extractFunctions(contractBody, errors),
        stateVariables: this.extractStateVariables(contractBody),
        events: this.extractEvents(contractBody),
        modifiers: this.extractModifiers(contractBody),
        lineStart,
        lineEnd,
      });
    }

    return contracts;
  }

  /**
   * Extract function definitions from contract body
   */
  private extractFunctions(contractBody: string, errors: ParseError[]): FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];
    // Match function declarations including constructor and fallback/receive
    const funcRegex = /\b(function\s+(\w+)|constructor|fallback|receive)\s*\(([^)]*)\)\s*((?:public|private|internal|external|pure|view|payable|virtual|override|\w+\s*\([^)]*\)|\s)+)*(?:\s*returns\s*\(([^)]*)\))?\s*(?:\{|;)/g;
    let match;

    while ((match = funcRegex.exec(contractBody)) !== null) {
      const isConstructor = match[0].startsWith('constructor');
      const isFallback = match[0].startsWith('fallback');
      const isReceive = match[0].startsWith('receive');
      const funcName = isConstructor ? 'constructor' :
                       isFallback ? 'fallback' :
                       isReceive ? 'receive' : match[2];
      const paramsStr = match[3] || '';
      const modifiersStr = match[4] || '';
      const returnsStr = match[5] || '';

      // Parse visibility and state mutability
      const visibility = this.extractVisibility(modifiersStr);
      const stateMutability = this.extractStateMutability(modifiersStr);
      const modifiers = this.extractModifierNames(modifiersStr);

      // Parse parameters
      const parameters = this.parseParameters(paramsStr);
      const returnParameters = this.parseParameters(returnsStr);

      // Extract function body if it exists
      const hasBody = match[0].endsWith('{');
      let body: string | undefined;
      let lineEnd = contractBody.substring(0, match.index).split('\n').length;

      if (hasBody) {
        const extractedBody = this.extractBracedContent(contractBody, match.index + match[0].length - 1);
        body = extractedBody || undefined;
        if (body) {
          lineEnd = contractBody.substring(0, match.index + match[0].length + body.length).split('\n').length;
        }
      }

      functions.push({
        name: funcName,
        visibility,
        stateMutability,
        modifiers,
        parameters,
        returnParameters,
        body,
        lineStart: contractBody.substring(0, match.index).split('\n').length,
        lineEnd,
      });
    }

    return functions;
  }

  /**
   * Extract state variables from contract body
   */
  private extractStateVariables(contractBody: string): StateVariable[] {
    const variables: StateVariable[] = [];
    // Match state variable declarations
    const varRegex = /^\s*((?:mapping|address|uint\d*|int\d*|bytes\d*|string|bool|struct\s+\w+)(?:\s*\[[^\]]*\])?(?:\s+(?:public|private|internal|constant|immutable))*)\s+(\w+)\s*(?:=|;)/gm;
    let match;

    while ((match = varRegex.exec(contractBody)) !== null) {
      const declaration = match[1];
      const name = match[2];

      // Skip function parameters and local variables
      if (this.isInsideFunction(contractBody, match.index)) {
        continue;
      }

      const visibility = declaration.includes('public') ? 'public' :
                        declaration.includes('private') ? 'private' : 'internal';
      const isConstant = declaration.includes('constant');
      const isImmutable = declaration.includes('immutable');

      // Extract base type
      const typeMatch = declaration.match(/^(mapping|address|uint\d*|int\d*|bytes\d*|string|bool|struct\s+\w+)(?:\s*\[[^\]]*\])?/);
      const type = typeMatch ? typeMatch[0] : declaration;

      variables.push({
        name,
        type,
        visibility,
        constant: isConstant,
        immutable: isImmutable,
        lineNumber: contractBody.substring(0, match.index).split('\n').length,
      });
    }

    return variables;
  }

  /**
   * Extract event definitions
   */
  private extractEvents(contractBody: string): EventDefinition[] {
    const events: EventDefinition[] = [];
    const eventRegex = /\bevent\s+(\w+)\s*\(([^)]*)\)\s*;/g;
    let match;

    while ((match = eventRegex.exec(contractBody)) !== null) {
      events.push({
        name: match[1],
        parameters: this.parseParameters(match[2], true),
        lineNumber: contractBody.substring(0, match.index).split('\n').length,
      });
    }

    return events;
  }

  /**
   * Extract modifier definitions
   */
  private extractModifiers(contractBody: string): ModifierDefinition[] {
    const modifiers: ModifierDefinition[] = [];
    const modRegex = /\bmodifier\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let match;

    while ((match = modRegex.exec(contractBody)) !== null) {
      const lineStart = contractBody.substring(0, match.index).split('\n').length;
      const body = this.extractBracedContent(contractBody, match.index + match[0].length - 1);
      const lineEnd = body ?
        contractBody.substring(0, match.index + match[0].length + body.length).split('\n').length :
        lineStart;

      modifiers.push({
        name: match[1],
        parameters: this.parseParameters(match[2]),
        lineStart,
        lineEnd,
      });
    }

    return modifiers;
  }

  /**
   * Extract content between matching braces
   */
  private extractBracedContent(source: string, startIndex: number): string | null {
    if (source[startIndex] !== '{') {
      return null;
    }

    let depth = 1;
    let i = startIndex + 1;

    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }

    if (depth !== 0) {
      return null;
    }

    return source.substring(startIndex + 1, i - 1);
  }

  /**
   * Parse parameter string into Parameter array
   */
  private parseParameters(paramsStr: string, allowIndexed = false): Parameter[] {
    if (!paramsStr.trim()) {
      return [];
    }

    return paramsStr.split(',').map(param => {
      const parts = param.trim().split(/\s+/);
      const indexed = allowIndexed && parts.includes('indexed');
      const name = parts[parts.length - 1];
      const typeIndex = parts.findIndex(p => p !== 'indexed' && p !== 'memory' && p !== 'calldata' && p !== 'storage');
      const type = typeIndex >= 0 ? parts[typeIndex] : 'unknown';

      return {
        name: name === type ? '' : name,
        type,
        indexed: indexed || undefined,
      };
    });
  }

  /**
   * Extract visibility from modifiers string
   */
  private extractVisibility(modifiersStr: string): 'public' | 'private' | 'internal' | 'external' {
    if (modifiersStr.includes('public')) return 'public';
    if (modifiersStr.includes('private')) return 'private';
    if (modifiersStr.includes('internal')) return 'internal';
    if (modifiersStr.includes('external')) return 'external';
    return 'public'; // Default visibility for older Solidity
  }

  /**
   * Extract state mutability from modifiers string
   */
  private extractStateMutability(modifiersStr: string): 'pure' | 'view' | 'payable' | 'nonpayable' {
    if (modifiersStr.includes('pure')) return 'pure';
    if (modifiersStr.includes('view')) return 'view';
    if (modifiersStr.includes('payable')) return 'payable';
    return 'nonpayable';
  }

  /**
   * Extract custom modifier names from modifiers string
   */
  private extractModifierNames(modifiersStr: string): string[] {
    const builtins = ['public', 'private', 'internal', 'external', 'pure', 'view', 'payable', 'virtual', 'override'];
    const parts = modifiersStr.split(/\s+/);
    return parts.filter(p => p && !builtins.includes(p) && !p.startsWith('returns'));
  }

  /**
   * Check if index is inside a function body
   */
  private isInsideFunction(source: string, index: number): boolean {
    const before = source.substring(0, index);
    const funcCount = (before.match(/\bfunction\s+\w+\s*\([^)]*\)[^{]*\{/g) || []).length;
    const closingBraces = (before.match(/\}/g) || []).length;
    return funcCount > closingBraces;
  }
}
