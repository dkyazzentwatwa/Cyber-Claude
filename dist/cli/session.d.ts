import { AgentMode } from '../agent/types.js';
export declare class InteractiveSession {
    private state;
    private scanner;
    private hardening;
    private reporter;
    private webScanner;
    private pcapAnalyzer;
    private pcapReporter;
    private osintOrchestrator;
    private osintReporter;
    constructor(initialMode?: AgentMode, model?: string);
    /**
     * Start the interactive session
     */
    start(): Promise<void>;
    private getPrompt;
    private showModeStatus;
    private showWelcome;
    private handleCommand;
    private showHelp;
    private showStatus;
    private showHistory;
    private handleModeChange;
    private handleModelSelect;
    private handleScan;
    private handleHarden;
    private handleFlows;
    /**
     * Execute a workflow based on its ID
     */
    private executeWorkflow;
    /**
     * Quick Security Check Workflow
     */
    private executeQuickSecurityCheck;
    /**
     * Website Security Audit Workflow
     */
    private executeWebsiteAudit;
    /**
     * Domain Intelligence Gathering Workflow
     */
    private executeDomainIntel;
    /**
     * Incident Response Triage Workflow
     */
    private executeIncidentTriage;
    /**
     * System Hardening Workflow
     */
    private executeSystemHardening;
    /**
     * Handle autonomous task execution
     */
    private handleAuto;
    private handleChat;
    private handleWebScan;
    private handlePcap;
    private handleRecon;
    private formatDuration;
}
//# sourceMappingURL=session.d.ts.map