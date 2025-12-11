// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Test contract with intentional weak randomness vulnerabilities
 * SWC-120: Weak Sources of Randomness
 * Based on DeFiHackLabs patterns (Fomo3D, Meebits)
 * DO NOT USE IN PRODUCTION
 */
contract WeakRandomnessVulnerable {
    address public owner;
    address public lastWinner;
    uint256 public prizePool;
    uint256 public ticketPrice = 0.01 ether;
    address[] public players;
    mapping(address => uint256) public nftTraits;

    constructor() {
        owner = msg.sender;
    }

    // Vulnerability 1: blockhash for lottery
    function drawWinnerBlockhash() public {
        require(players.length > 0, "No players");
        // Bug: blockhash is predictable and returns 0 for blocks > 256 ago
        uint256 random = uint256(blockhash(block.number - 1)) % players.length;
        lastWinner = players[random];
        payable(lastWinner).transfer(prizePool);
        delete players;
        prizePool = 0;
    }

    // Vulnerability 2: block.timestamp modulo for selection
    function drawWinnerTimestamp() public {
        require(players.length > 0, "No players");
        // Bug: Miners can manipulate block.timestamp within ~15 seconds
        uint256 random = block.timestamp % players.length;
        lastWinner = players[random];
        payable(lastWinner).transfer(prizePool);
        delete players;
        prizePool = 0;
    }

    // Vulnerability 3: keccak256 with predictable inputs
    function drawWinnerHash() public {
        require(players.length > 0, "No players");
        // Bug: All inputs are known/predictable before transaction
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            msg.sender,
            players.length
        ))) % players.length;
        lastWinner = players[random];
        payable(lastWinner).transfer(prizePool);
        delete players;
        prizePool = 0;
    }

    // Vulnerability 4: block.prevrandao (post-merge) without VRF
    function drawWinnerPrevrandao() public {
        require(players.length > 0, "No players");
        // Bug: While better than pre-merge difficulty, validators can still bias
        uint256 random = block.prevrandao % players.length;
        lastWinner = players[random];
        payable(lastWinner).transfer(prizePool);
        delete players;
        prizePool = 0;
    }

    // Vulnerability 5: NFT trait generation with weak randomness
    function mintNFT() public {
        // Bug: Traits are predictable - attacker can calculate desired traits
        // and only mint when favorable
        uint256 traits = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            totalSupply()
        )));

        // Rare traits for traits ending in specific patterns
        nftTraits[msg.sender] = traits;
    }

    // Vulnerability 6: Dice roll with weak randomness
    function rollDice() public view returns (uint8) {
        // Bug: Completely predictable by anyone
        return uint8(uint256(keccak256(abi.encodePacked(
            block.number,
            block.timestamp,
            msg.sender
        ))) % 6) + 1;
    }

    // Vulnerability 7: Coin flip with block values
    function coinFlip() public view returns (bool) {
        // Bug: Miner/validator can determine outcome
        return block.timestamp % 2 == 0;
    }

    // Helper functions
    function buyTicket() public payable {
        require(msg.value >= ticketPrice, "Insufficient payment");
        players.push(msg.sender);
        prizePool += msg.value;
    }

    function totalSupply() internal view returns (uint256) {
        // Simplified - in real NFT would track actual supply
        return players.length;
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    receive() external payable {
        prizePool += msg.value;
    }
}
