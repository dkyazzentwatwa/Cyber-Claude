import { Ora } from 'ora';
export declare const ui: {
    /**
     * Display the main banner
     */
    banner(): void;
    /**
     * Display a box with content
     */
    box(content: string, title?: string, type?: "info" | "success" | "warning" | "error"): void;
    /**
     * Create a spinner for loading states
     */
    spinner(text: string): Ora;
    /**
     * Display a section header
     */
    section(title: string): void;
    /**
     * Display success message
     */
    success(message: string): void;
    /**
     * Display error message
     */
    error(message: string): void;
    /**
     * Display warning message
     */
    warning(message: string): void;
    /**
     * Display info message
     */
    info(message: string): void;
    /**
     * Display a security finding
     */
    finding(severity: "critical" | "high" | "medium" | "low" | "info", title: string, description: string): void;
    /**
     * Display ASCII art shield
     */
    shield(): void;
    /**
     * Display a cyber-themed divider
     */
    divider(): void;
    /**
     * Clear the console
     */
    clear(): void;
    /**
     * Display agent thinking/working message
     */
    thinking(message?: string): void;
    /**
     * Display command output header
     */
    commandHeader(command: string): void;
    /**
     * Display welcome message
     */
    welcome(): void;
    /**
     * Format AI response text for terminal display
     * Converts markdown to terminal-friendly formatting
     */
    formatAIResponse(text: string): string;
};
//# sourceMappingURL=ui.d.ts.map