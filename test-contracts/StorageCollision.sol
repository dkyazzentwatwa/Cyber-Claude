// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Test contracts with intentional storage collision vulnerabilities
 * Based on DeFiHackLabs patterns (Audius, Furucombo)
 * DO NOT USE IN PRODUCTION
 */

// Vulnerability 1: Proxy without EIP-1967 slots
contract VulnerableProxy {
    // Bug: Implementation stored in slot 0, can collide with implementation's storage
    address public implementation;
    address public owner;

    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }

    function upgrade(address newImplementation) public {
        require(msg.sender == owner, "Not owner");
        implementation = newImplementation;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}

// Vulnerability 2: Upgradeable contract without storage gap
contract UpgradeableWithoutGap {
    // Bug: No __gap array - adding variables in V2 will corrupt derived contracts
    address public owner;
    uint256 public value;
    mapping(address => uint256) public balances;

    function initialize() public {
        require(owner == address(0), "Already initialized");
        owner = msg.sender;
    }

    function setValue(uint256 _value) public {
        require(msg.sender == owner, "Not owner");
        value = _value;
    }

    // Missing: uint256[50] private __gap;
}

// Vulnerability 3: Implementation can be initialized directly
contract UninitializedImplementation {
    address public owner;
    bool private initialized;

    // Bug: No constructor to disable initializers
    // Attacker can call initialize() on implementation directly

    function initialize() public {
        require(!initialized, "Already initialized");
        initialized = true;
        owner = msg.sender;
    }

    function privilegedAction() public {
        require(msg.sender == owner, "Not owner");
        // Sensitive action that attacker can perform after initializing implementation
        selfdestruct(payable(msg.sender));
    }
}

// Vulnerability 4: Custom storage slot without proper namespace
contract CustomStorageVulnerable {
    // Bug: Using simple string for slot, not following EIP-1967 pattern
    bytes32 constant ADMIN_SLOT = keccak256("admin");

    function setAdmin(address admin) public {
        // Bug: This slot could collide with other contracts using same string
        assembly {
            sstore(ADMIN_SLOT, admin)
        }
    }

    function getAdmin() public view returns (address admin) {
        assembly {
            admin := sload(ADMIN_SLOT)
        }
    }
}

// Safe proxy pattern (for comparison)
contract SafeProxy {
    // EIP-1967 compliant storage slot
    bytes32 constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor(address _implementation) {
        assembly {
            sstore(IMPLEMENTATION_SLOT, _implementation)
        }
    }

    fallback() external payable {
        assembly {
            let impl := sload(IMPLEMENTATION_SLOT)
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
