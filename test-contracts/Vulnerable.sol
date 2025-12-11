// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

/**
 * Test contract with intentional vulnerabilities for scanner testing
 * DO NOT USE IN PRODUCTION
 */
contract VulnerableBank {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Vulnerability 1: Reentrancy - external call before state update
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Bug: External call before state update (reentrancy)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] -= amount;  // State updated AFTER external call
    }

    // Vulnerability 2: Missing access control
    function setOwner(address newOwner) public {
        // Bug: No access control - anyone can change owner
        owner = newOwner;
    }

    // Vulnerability 3: tx.origin for auth
    function withdrawAll() public {
        // Bug: Using tx.origin instead of msg.sender
        require(tx.origin == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }

    // Vulnerability 4: Integer overflow (Solidity < 0.8.0)
    function deposit() public payable {
        // Bug: No SafeMath - can overflow in Solidity < 0.8.0
        balances[msg.sender] += msg.value;
    }

    // Vulnerability 5: Unprotected selfdestruct
    function destroy() public {
        // Bug: No access control on selfdestruct
        selfdestruct(payable(msg.sender));
    }

    receive() external payable {
        deposit();
    }
}
