import { ToolResult } from '../types.js';
export declare class HardeningChecker {
    /**
     * Check system hardening status
     */
    checkHardening(): Promise<ToolResult>;
    private checkMacOSHardening;
    private checkLinuxHardening;
    private checkWindowsHardening;
    private checkCommonHardening;
    /**
     * Generate hardening recommendations
     */
    getRecommendations(): Promise<ToolResult>;
    private getPlatformRecommendations;
}
//# sourceMappingURL=hardening.d.ts.map