import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import ora from 'ora';
// Custom gradient colors for cybersecurity theme
const cyberGradient = gradient(['#00ff41', '#00d4ff', '#a200ff']);
const dangerGradient = gradient(['#ff0000', '#ff6b00', '#ffd700']);
const successGradient = gradient(['#00ff88', '#00ffff']);
export const ui = {
    /**
     * Display the main banner
     */
    banner() {
        const banner = figlet.textSync('CYBER CLAUDE', {
            font: 'ANSI Shadow',
            horizontalLayout: 'default',
        });
        console.log(cyberGradient(banner));
        console.log(chalk.gray('  AI-Powered Cybersecurity Agent\n'));
    },
    /**
     * Display a box with content
     */
    box(content, title, type = 'info') {
        const borderColors = {
            info: 'cyan',
            success: 'green',
            warning: 'yellow',
            error: 'red',
        };
        console.log(boxen(content, {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: borderColors[type],
            title: title,
            titleAlignment: 'center',
        }));
    },
    /**
     * Create a spinner for loading states
     */
    spinner(text) {
        return ora({
            text,
            spinner: 'dots12',
            color: 'cyan',
        }).start();
    },
    /**
     * Display a section header
     */
    section(title) {
        console.log('\n' + chalk.bold.cyan('▸ ') + chalk.bold.white(title));
        console.log(chalk.gray('─'.repeat(process.stdout.columns || 80)));
    },
    /**
     * Display success message
     */
    success(message) {
        console.log(chalk.green('✔ ') + message);
    },
    /**
     * Display error message
     */
    error(message) {
        console.log(chalk.red('✖ ') + message);
    },
    /**
     * Display warning message
     */
    warning(message) {
        console.log(chalk.yellow('⚠ ') + message);
    },
    /**
     * Display info message
     */
    info(message) {
        console.log(chalk.cyan('ℹ ') + message);
    },
    /**
     * Display a security finding
     */
    finding(severity, title, description) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            info: '🔵',
        };
        const colors = {
            critical: chalk.bgRed.white.bold,
            high: chalk.red.bold,
            medium: chalk.yellow.bold,
            low: chalk.green.bold,
            info: chalk.cyan.bold,
        };
        console.log(`\n${icons[severity]} ${colors[severity](severity.toUpperCase())} - ${chalk.bold(title)}`);
        console.log(chalk.gray(`  ${description}`));
    },
    /**
     * Display ASCII art shield
     */
    shield() {
        const shield = `
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║           🛡️  SECURE MODE 🛡️          ║
    ║                                       ║
    ║    Defensive Operations Only          ║
    ║    All Actions Are Audited            ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    `;
        console.log(successGradient(shield));
    },
    /**
     * Display a cyber-themed divider
     */
    divider() {
        const width = process.stdout.columns || 80;
        console.log(cyberGradient('═'.repeat(width)));
    },
    /**
     * Clear the console
     */
    clear() {
        console.clear();
    },
    /**
     * Display agent thinking/working message
     */
    thinking(message = 'Analyzing...') {
        console.log(chalk.dim('💭 ') + chalk.italic.dim(message));
    },
    /**
     * Display command output header
     */
    commandHeader(command) {
        console.log('\n' + chalk.bgCyan.black.bold(` COMMAND `) + ' ' + chalk.cyan(command));
    },
    /**
     * Display welcome message
     */
    welcome() {
        this.clear();
        this.banner();
        this.shield();
        this.box(`Welcome to ${chalk.bold('Cyber Claude')}!\n\n` +
            `Type ${chalk.cyan('help')} to see available commands\n` +
            `Type ${chalk.cyan('scan')} to start a security scan\n` +
            `Type ${chalk.cyan('chat')} for interactive mode\n` +
            `Type ${chalk.cyan('exit')} to quit`, '🚀 Getting Started', 'info');
    },
};
//# sourceMappingURL=ui.js.map