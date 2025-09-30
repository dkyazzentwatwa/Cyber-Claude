import { SecurityFinding, ScanResult } from '../types.js';
export declare class SecurityReporter {
    /**
     * Generate and display a formatted security report
     */
    displayReport(scanResult: ScanResult): void;
    private displaySummary;
    private displayFindings;
    private displayMetadata;
    /**
     * Export report to JSON file
     */
    exportJSON(scanResult: ScanResult, filename: string): void;
    /**
     * Export report to Markdown file
     */
    exportMarkdown(scanResult: ScanResult, filename: string): void;
    /**
     * Create scan result from findings
     */
    createScanResult(findings: SecurityFinding[], startTime: Date): ScanResult;
}
//# sourceMappingURL=reporter.d.ts.map