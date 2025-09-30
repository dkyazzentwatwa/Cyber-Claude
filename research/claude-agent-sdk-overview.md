# Claude Agent SDK Overview

## Installation & Language Support

**TypeScript (Recommended for this project)**
```bash
npm install @anthropic-ai/claude-agent-sdk
```

**Python**
```bash
pip install anthropic-agent-sdk
```

## Core Architecture

The Claude Agent SDK follows a feedback loop pattern:
1. **Gather context** → 2. **Take action** → 3. **Verify work** → 4. **Repeat**

### Key Design Principles
- Provide tools that enable flexible, autonomous agent behavior
- Allow agents to search, manipulate files, and interact with external systems
- Automatic context management to handle long conversations
- Context compaction for efficiency

## Agent Building Blocks

### 1. Context Gathering
- **Agentic file system search**: Start with agentic search before semantic search
- **Subagent capabilities**: Parallel processing for complex tasks
- **Context compaction**: Manage long conversations efficiently

### 2. Action Taking
- **Custom tools**: Primary action mechanisms
- **Bash scripting**: Flexible computer interactions
- **Code generation**: For complex tasks
- **Model Context Protocol (MCP)**: External service integration

### 3. Work Verification
- Define clear rules for success criteria
- Use visual feedback when applicable
- Consider secondary LMs as "judges" for quality assessment

## Built-in Capabilities

### Rich Tool Ecosystem
- File operations (read, write, edit)
- Code execution
- Web search
- Bash command execution
- Advanced permissions control

### Authentication Options
- Claude API key from Console
- Amazon Bedrock integration
- Google Vertex AI support

## Best Practices for Agent Design

1. **Tool Design**: Create tools that maximize context efficiency
2. **Iterative Development**: Continuously test and refine capabilities
3. **Task Decomposition**: Consider which tasks benefit from code-based implementation
4. **Permission Control**: Fine-grained capability control for security
5. **Error Handling**: Production-ready error handling built-in
6. **Prompt Caching**: Automatic optimization for performance

## Example Agent Types

### Coding Agents
- SRE diagnostic bots
- **Security code review assistants** ⭐
- **Incident triage agents** ⭐
- Code style enforcement agents

### Business Agents
- Legal contract reviewers
- Financial analysis assistants
- Customer support agents
- Content creation tools

## Unique Advantages
- Automatic prompt caching
- Performance optimizations
- Extensible tool ecosystem
- Supports subagents and custom commands
- Model Context Protocol (MCP) integration

## Cybersecurity Agent Relevance

The SDK is particularly well-suited for cybersecurity agents because:
- Built-in bash execution for security tool integration
- File system operations for log analysis and code review
- Subagent support for parallel security assessments
- Context management for handling large security datasets
- Custom tool creation for security-specific operations