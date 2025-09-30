import { ToolResult } from '../types.js';
export declare class DesktopScanner {
    /**
     * Scan system information and identify potential security issues
     */
    scanSystem(): Promise<ToolResult>;
    /**
     * Get detailed network information
     */
    scanNetwork(): Promise<ToolResult>;
    /**
     * Quick security health check
     */
    quickCheck(): Promise<ToolResult>;
}
//# sourceMappingURL=scanner.d.ts.map