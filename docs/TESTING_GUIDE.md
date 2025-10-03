# Testing Guide

## Overview

Cyber Claude has a comprehensive test suite covering all core functionality, including the new agentic system. This guide explains how to run tests, write new tests, and ensure quality.

## Test Statistics

- **Total Test Files**: 14
- **Total Tests**: 231
- **Test Coverage**: Core functionality, agentic system, tools, utilities
- **Status**: ✅ All passing

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Agentic tests
npm test -- test/agentic

# Agent core tests
npm test -- test/agent

# Tools tests
npm test -- test/tools

# Utilities tests
npm test -- test/utils
```

### Run Single Test File

```bash
npm test -- test/agentic/validator.test.ts
```

### Watch Mode

```bash
npm test -- --watch
```

### With Coverage

```bash
npm run test:coverage
```

## Test Structure

```
test/
├── agentic/              # Autonomous agent tests
│   ├── validator.test.ts # Safety validator (21 tests)
│   ├── registry.test.ts  # Tool registry (29 tests)
│   └── context.test.ts   # Context manager (24 tests)
├── agent/                # Agent core tests
│   ├── core.test.ts      # CyberAgent (10 tests)
│   └── providers/        # AI providers
│       ├── claude.test.ts # (6 tests)
│       └── gemini.test.ts # (5 tests)
├── tools/                # Tool tests
│   ├── PcapAnalyzer.test.ts # (5 tests)
│   └── web/
│       └── HttpClient.test.ts # (14 tests)
└── utils/                # Utility tests
    ├── mitre.test.ts     # (21 tests)
    └── config.test.ts    # (12 tests)
```

## Agentic System Tests

### SafetyValidator Tests (21 tests)

**Location**: `test/agentic/validator.test.ts`

**Coverage:**
- Task validation (empty descriptions, dangerous keywords, limits)
- Step validation (unknown tools, whitelists/blacklists, parameters)
- Plan validation (empty plans, circular dependencies, step counts)
- Target validation (allowed/blocked targets, sensitive hosts)
- Report generation

**Example:**
```typescript
describe('SafetyValidator', () => {
  it('should validate a safe task', () => {
    const validator = new SafetyValidator();
    const task = { /* ... */ };
    const result = validator.validateTask(task);
    expect(result.valid).toBe(true);
  });
});
```

### Tool Registry Tests (29 tests)

**Location**: `test/agentic/registry.test.ts`

**Coverage:**
- Registry completeness (all 20 tools)
- Tool definitions (parameters, capabilities, examples)
- Tool retrieval (getTool, getToolsByCategory, getToolsByRisk)
- Capability search
- Prompt generation for AI
- Consistency checks

**Key Tests:**
```typescript
it('should have all expected tools', () => {
  expect(ALL_TOOLS.length).toBe(20); // 6 builtin + 14 MCP
});

it('should retrieve tool by name', () => {
  const nmap = getTool('nmap');
  expect(nmap).toBeDefined();
  expect(nmap?.category).toBe('scanning');
});

it('should search tools by capability', () => {
  const vulnScanners = searchByCapability('vulnerability');
  expect(vulnScanners.length).toBeGreaterThan(0);
});
```

### Context Manager Tests (24 tests)

**Location**: `test/agentic/context.test.ts`

**Coverage:**
- Initialization with task and plan
- Step management (current step, results, errors)
- Reflection management
- Findings management (add, retrieve by severity)
- Plan updates
- Next step selection (dependencies, parallel)
- Completion status
- Progress tracking
- Event emission
- Context export/import

**Example:**
```typescript
it('should respect dependencies', () => {
  // Complete step 1
  contextManager.addStepResult(result1);

  // Step 2 should be next (depends on step 1)
  const nextStep = contextManager.getNextStep();
  expect(nextStep?.stepNumber).toBe(2);
});
```

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourClass } from '../../src/path/to/class.js';

describe('YourClass', () => {
  let instance: YourClass;

  beforeEach(() => {
    instance = new YourClass();
  });

  describe('Feature Group', () => {
    it('should do something specific', () => {
      const result = instance.method();
      expect(result).toBe(expected);
    });

    it('should handle errors', () => {
      expect(() => instance.method()).toThrow('Error message');
    });
  });
});
```

### Best Practices

1. **Descriptive Test Names**
   ```typescript
   // Good
   it('should reject empty task description')

   // Bad
   it('test 1')
   ```

2. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should calculate risk score', () => {
     // Arrange
     const task = createTestTask();

     // Act
     const result = validator.validateTask(task);

     // Assert
     expect(result.riskScore).toBe(50);
   });
   ```

3. **Test One Thing**
   ```typescript
   // Good - focused test
   it('should add finding to context', () => {
     contextManager.addFinding(finding);
     expect(contextManager.getContext().findings).toHaveLength(1);
   });

   // Bad - testing multiple things
   it('should do everything', () => {
     // Tests 5 different features
   });
   ```

4. **Use Mocks for External Dependencies**
   ```typescript
   import { vi } from 'vitest';

   const mockExecutor = vi.fn().mockResolvedValue({ success: true });
   ```

## Testing Checklist

Before committing code:

- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] TypeScript compiles (`npm run build`)
- [ ] No console errors/warnings

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main
- Release tags

## Common Test Patterns

### Testing Async Code

```typescript
it('should execute step asynchronously', async () => {
  const result = await ToolExecutor.executeStep(step);
  expect(result.success).toBe(true);
});
```

### Testing Events

```typescript
it('should emit progress events', () => {
  return new Promise<void>((resolve) => {
    contextManager.on('progress', (update) => {
      expect(update.type).toBeDefined();
      resolve();
    });

    contextManager.setCurrentStep(step);
  });
});
```

### Testing Errors

```typescript
it('should throw error for invalid input', () => {
  expect(() => validator.validateStep(invalidStep))
    .toThrow('Tool not found');
});
```

### Testing with Setup/Teardown

```typescript
describe('Database Tests', () => {
  beforeAll(async () => {
    // Setup before all tests
    await initializeDatabase();
  });

  afterAll(async () => {
    // Cleanup after all tests
    await closeDatabase();
  });

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });
});
```

## Debugging Tests

### Run Single Test

```bash
npm test -- test/agentic/validator.test.ts -t "should validate a safe task"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--inspect-brk"],
  "console": "integratedTerminal"
}
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

## Coverage Reports

Generate coverage:

```bash
npm run test:coverage
```

View HTML report:

```bash
open coverage/index.html
```

Coverage goals:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Test Data

### Mock Data Location

Mock data files:
- `test/fixtures/` - Test fixtures
- `test/mocks/` - Mock implementations

### Creating Test Data

```typescript
// test/helpers/factories.ts
export function createTestTask(): Task {
  return {
    id: uuidv4(),
    description: 'Test task',
    goal: 'Test goal',
    createdAt: new Date(),
  };
}

export function createTestPlan(steps: number = 2): Plan {
  return {
    taskId: uuidv4(),
    steps: Array.from({ length: steps }, (_, i) => createTestStep(i + 1)),
    riskLevel: 'low',
    createdAt: new Date(),
  };
}
```

## Performance Testing

### Measure Execution Time

```typescript
it('should complete within time limit', async () => {
  const start = Date.now();
  await longRunningOperation();
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(5000); // 5 seconds
});
```

### Timeout Configuration

```typescript
it('should handle timeout', async () => {
  // Increase timeout for this test
}, { timeout: 30000 }); // 30 seconds
```

## Integration Testing

For end-to-end testing:

```typescript
describe('Autonomous Execution Integration', () => {
  it('should execute complete workflow', async () => {
    const agent = new AgenticCore({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxSteps: 5,
    });

    const result = await agent.executeTask('Test task');

    expect(result.success).toBe(true);
    expect(result.context.status).toBe('completed');
  });
});
```

## Troubleshooting

### Tests Hanging

- Check for missing `await` in async functions
- Verify timeouts are set appropriately
- Look for unclosed promises or event listeners

### Flaky Tests

- Avoid relying on timing (use deterministic mocks)
- Clear state between tests (`beforeEach` cleanup)
- Mock external dependencies (APIs, file system)

### Memory Leaks

- Clean up event listeners in `afterEach`
- Close database connections
- Clear large data structures

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mock Service Worker](https://mswjs.io/) - For API mocking

## Contributing Tests

When adding new features:

1. Write tests first (TDD approach)
2. Ensure > 80% coverage for new code
3. Include edge cases
4. Add integration tests if needed
5. Update this guide if adding new patterns

---

**Test Status**: ✅ All 231 tests passing
**Last Updated**: 2025-10-01
