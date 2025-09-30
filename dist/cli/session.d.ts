import { AgentMode } from '../agent/types.js';
export declare class InteractiveSession {
    private state;
    private scanner;
    private hardening;
    private reporter;
    private webScanner;
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
    private handleChat;
    private handleWebScan;
}
//# sourceMappingURL=session.d.ts.map