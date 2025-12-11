// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Test contract with intentional arbitrary call vulnerabilities
 * Based on DeFiHackLabs patterns (Qubit Finance, Socket Gateway)
 * DO NOT USE IN PRODUCTION
 */
contract ArbitraryCallVulnerable {
    address public owner;
    mapping(address => bool) public whitelist;

    constructor() {
        owner = msg.sender;
    }

    // Vulnerability 1: Arbitrary call to user-controlled address
    function executeCall(address target, bytes calldata data) public returns (bool, bytes memory) {
        // Bug: No validation of target address
        // Attacker can call any contract with any data
        (bool success, bytes memory result) = target.call(data);
        require(success, "Call failed");
        return (success, result);
    }

    // Vulnerability 2: Delegatecall to user-controlled address
    function executeDelegatecall(address target, bytes calldata data) public returns (bool, bytes memory) {
        // Bug: delegatecall to user address allows storage manipulation
        // Attacker can overwrite owner, drain funds, etc.
        (bool success, bytes memory result) = target.delegatecall(data);
        require(success, "Delegatecall failed");
        return (success, result);
    }

    // Vulnerability 3: User-controlled function selector
    function callWithSelector(address target, bytes4 selector, bytes calldata params) public {
        // Bug: Arbitrary function selector from user input
        bytes memory data = abi.encodePacked(selector, params);
        (bool success,) = target.call(data);
        require(success, "Call failed");
    }

    // Vulnerability 4: Unvalidated calldata forwarding
    function forwardCall(address target, bytes calldata payload) public {
        // Bug: Raw calldata forwarding without validation
        // Attacker can encode any function call
        (bool success,) = target.call(payload);
        require(success, "Forward failed");
    }

    // Vulnerability 5: Call with value to arbitrary address
    function sendValue(address payable _to) public payable {
        // Bug: Send ETH to arbitrary address provided by user
        (bool success,) = _to.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    // Safe version with whitelist (for comparison)
    function safeExecuteCall(address target, bytes calldata data) public returns (bool, bytes memory) {
        require(whitelist[target], "Target not whitelisted");
        (bool success, bytes memory result) = target.call(data);
        require(success, "Call failed");
        return (success, result);
    }

    function addToWhitelist(address target) public {
        require(msg.sender == owner, "Not owner");
        whitelist[target] = true;
    }

    receive() external payable {}
}
