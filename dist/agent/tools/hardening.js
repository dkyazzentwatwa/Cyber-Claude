import si from 'systeminformation';
import { logger } from '../../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class HardeningChecker {
    /**
     * Check system hardening status
     */
    async checkHardening() {
        try {
            logger.info('Starting system hardening check');
            const findings = [];
            const osInfo = await si.osInfo();
            // Platform-specific checks
            if (osInfo.platform === 'darwin') {
                await this.checkMacOSHardening(findings);
            }
            else if (osInfo.platform === 'linux') {
                await this.checkLinuxHardening(findings);
            }
            else if (osInfo.platform === 'win32') {
                await this.checkWindowsHardening(findings);
            }
            // Common checks for all platforms
            await this.checkCommonHardening(findings);
            logger.info('System hardening check completed');
            return {
                success: true,
                data: { findings },
                message: 'Hardening check completed',
            };
        }
        catch (error) {
            logger.error('Error during hardening check:', error);
            return {
                success: false,
                error: `Hardening check failed: ${error}`,
            };
        }
    }
    async checkMacOSHardening(findings) {
        try {
            // Check firewall status
            try {
                const { stdout: firewallStatus } = await execAsync('sudo -n /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo "unknown"');
                if (firewallStatus.includes('disabled') || firewallStatus.includes('unknown')) {
                    findings.push({
                        id: 'MACOS_FIREWALL_DISABLED',
                        severity: 'high',
                        title: 'macOS Firewall Not Enabled',
                        description: 'The macOS application firewall is not enabled',
                        remediation: 'Enable firewall in System Preferences > Security & Privacy > Firewall',
                        category: 'firewall',
                        timestamp: new Date(),
                    });
                }
            }
            catch (error) {
                // Firewall check requires sudo, skip if not available
                logger.debug('Could not check firewall status (requires sudo)');
            }
            // Check FileVault status
            try {
                const { stdout: fvStatus } = await execAsync('fdesetup status 2>/dev/null || echo "unknown"');
                if (!fvStatus.includes('On')) {
                    findings.push({
                        id: 'MACOS_FILEVAULT_DISABLED',
                        severity: 'critical',
                        title: 'FileVault Disk Encryption Not Enabled',
                        description: 'Full disk encryption is not enabled',
                        remediation: 'Enable FileVault in System Preferences > Security & Privacy > FileVault',
                        category: 'encryption',
                        timestamp: new Date(),
                    });
                }
            }
            catch (error) {
                logger.debug('Could not check FileVault status');
            }
            // Check Gatekeeper status
            try {
                const { stdout: gkStatus } = await execAsync('spctl --status 2>/dev/null || echo "unknown"');
                if (gkStatus.includes('disabled')) {
                    findings.push({
                        id: 'MACOS_GATEKEEPER_DISABLED',
                        severity: 'medium',
                        title: 'Gatekeeper is Disabled',
                        description: 'Gatekeeper helps protect against malicious software',
                        remediation: 'Enable Gatekeeper: sudo spctl --master-enable',
                        category: 'application-security',
                        timestamp: new Date(),
                    });
                }
            }
            catch (error) {
                logger.debug('Could not check Gatekeeper status');
            }
        }
        catch (error) {
            logger.error('Error in macOS hardening checks:', error);
        }
    }
    async checkLinuxHardening(findings) {
        try {
            // Check if firewall is active (ufw or iptables)
            try {
                const { stdout: ufwStatus } = await execAsync('sudo -n ufw status 2>/dev/null || echo "not available"');
                if (ufwStatus.includes('inactive')) {
                    findings.push({
                        id: 'LINUX_FIREWALL_DISABLED',
                        severity: 'high',
                        title: 'UFW Firewall Not Active',
                        description: 'Uncomplicated Firewall (UFW) is not active',
                        remediation: 'Enable UFW: sudo ufw enable',
                        category: 'firewall',
                        timestamp: new Date(),
                    });
                }
            }
            catch (error) {
                logger.debug('Could not check UFW status');
            }
            // Check for automatic updates
            try {
                const { stdout: unattendedUpgrades } = await execAsync('dpkg -l unattended-upgrades 2>/dev/null | grep "^ii" || echo "not installed"');
                if (unattendedUpgrades.includes('not installed')) {
                    findings.push({
                        id: 'LINUX_NO_AUTO_UPDATES',
                        severity: 'medium',
                        title: 'Automatic Security Updates Not Configured',
                        description: 'Unattended-upgrades package is not installed',
                        remediation: 'Install: sudo apt install unattended-upgrades',
                        category: 'updates',
                        timestamp: new Date(),
                    });
                }
            }
            catch (error) {
                logger.debug('Could not check unattended-upgrades');
            }
        }
        catch (error) {
            logger.error('Error in Linux hardening checks:', error);
        }
    }
    async checkWindowsHardening(findings) {
        try {
            // Windows-specific checks would go here
            findings.push({
                id: 'WINDOWS_CHECK_MANUAL',
                severity: 'info',
                title: 'Windows Security Check',
                description: 'Please manually verify Windows Defender and Firewall are enabled',
                category: 'manual-check',
                timestamp: new Date(),
            });
        }
        catch (error) {
            logger.error('Error in Windows hardening checks:', error);
        }
    }
    async checkCommonHardening(findings) {
        // Check running services
        const services = await si.services('*');
        const runningServices = services.filter(s => s.running).length;
        if (runningServices > 100) {
            findings.push({
                id: 'MANY_SERVICES_RUNNING',
                severity: 'low',
                title: 'Many Services Running',
                description: `${runningServices} services are currently running`,
                remediation: 'Review and disable unnecessary services',
                category: 'services',
                timestamp: new Date(),
            });
        }
        // Check for admin/root users logged in
        const users = await si.users();
        if (users.length > 1) {
            findings.push({
                id: 'MULTIPLE_USERS_LOGGED_IN',
                severity: 'info',
                title: 'Multiple User Sessions Active',
                description: `${users.length} user sessions detected`,
                category: 'users',
                timestamp: new Date(),
            });
        }
    }
    /**
     * Generate hardening recommendations
     */
    async getRecommendations() {
        try {
            const osInfo = await si.osInfo();
            const recommendations = {
                platform: osInfo.platform,
                general: [
                    'Keep operating system and software up to date',
                    'Use strong, unique passwords',
                    'Enable full disk encryption',
                    'Use a password manager',
                    'Enable automatic security updates',
                    'Review and minimize installed software',
                    'Disable unnecessary services',
                    'Use a firewall',
                    'Enable screen lock with short timeout',
                    'Regular backups to external storage',
                ],
                platformSpecific: this.getPlatformRecommendations(osInfo.platform),
            };
            return {
                success: true,
                data: recommendations,
                message: 'Recommendations generated',
            };
        }
        catch (error) {
            logger.error('Error generating recommendations:', error);
            return {
                success: false,
                error: `Failed to generate recommendations: ${error}`,
            };
        }
    }
    getPlatformRecommendations(platform) {
        const recommendations = {
            darwin: [
                'Enable FileVault full disk encryption',
                'Enable Firewall in System Preferences',
                'Keep Gatekeeper enabled',
                'Use Touch ID or strong login password',
                'Enable "Find My Mac"',
                'Disable automatic login',
                'Review Privacy settings regularly',
            ],
            linux: [
                'Use LUKS for full disk encryption',
                'Configure UFW or iptables firewall',
                'Use fail2ban for brute force protection',
                'Enable AppArmor or SELinux',
                'Configure automatic security updates',
                'Use sudo instead of root login',
                'Keep SSH access secure (key-based auth)',
            ],
            win32: [
                'Enable BitLocker disk encryption',
                'Keep Windows Defender active',
                'Enable Windows Firewall',
                'Use Windows Hello or strong password',
                'Enable automatic Windows updates',
                'Use User Account Control (UAC)',
                'Regular Windows Security scans',
            ],
        };
        return recommendations[platform] || recommendations.linux;
    }
}
//# sourceMappingURL=hardening.js.map