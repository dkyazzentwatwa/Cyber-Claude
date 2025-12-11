// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Test contract with intentional precision loss vulnerabilities
 * Based on DeFiHackLabs patterns (Hundred Finance, Sentiment)
 * DO NOT USE IN PRODUCTION
 */
contract PrecisionLossVulnerable {
    uint256 public totalShares;
    uint256 public totalAssets;
    mapping(address => uint256) public shares;
    mapping(address => uint256) public balances;

    // Vulnerability 1: Division before multiplication
    function calculateReward(uint256 amount, uint256 rewardRate) public view returns (uint256) {
        // Bug: Division truncates before multiplication
        // Should be: amount * rewardRate / totalShares
        return amount / totalShares * rewardRate;
    }

    // Vulnerability 2: Small value truncation to zero
    function calculateFee(uint256 amount) public pure returns (uint256) {
        // Bug: If amount < 10000, fee is 0 (no fee collected)
        uint256 feePercent = 50; // 0.5%
        return amount * feePercent / 10000;
    }

    // Vulnerability 3: Unsafe downcast
    function setTimestamp(uint256 timestamp) public pure returns (uint8) {
        // Bug: Truncates timestamp to uint8 (0-255)
        return uint8(timestamp);
    }

    // Vulnerability 4: Exchange rate manipulation via precision loss
    function deposit(uint256 assets) public returns (uint256 sharesToMint) {
        if (totalShares == 0) {
            sharesToMint = assets;
        } else {
            // Bug: If assets is small relative to totalAssets, sharesToMint = 0
            // Attacker can donate to inflate totalAssets, then victim deposits get 0 shares
            sharesToMint = assets / totalAssets * totalShares;
        }

        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;
        totalAssets += assets;
    }

    // Vulnerability 5: Percentage calculation precision loss
    function calculatePercentage(uint256 numerator, uint256 denominator, uint256 percentage) public pure returns (uint256) {
        // Bug: Order matters - this loses precision
        return numerator / denominator * percentage / 100;
    }

    // Safe version for comparison
    function calculateRewardSafe(uint256 amount, uint256 rewardRate) public view returns (uint256) {
        // Correct: Multiply first, then divide
        return amount * rewardRate / totalShares;
    }
}
