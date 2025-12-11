// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Test contract with intentional timestamp dependence vulnerabilities
 * SWC-116: Block values as Time Proxy
 * DO NOT USE IN PRODUCTION
 */
contract TimestampDependenceVulnerable {
    address public owner;
    address public winner;
    uint256 public auctionEndTime;
    uint256 public highestBid;
    address public highestBidder;
    mapping(address => uint256) public lockedUntil;

    constructor() {
        owner = msg.sender;
    }

    // Vulnerability 1: Strict timestamp equality (almost impossible to satisfy)
    function claimAtExactTime(uint256 targetTime) public {
        // Bug: Exact equality with block.timestamp is unreliable
        require(block.timestamp == targetTime, "Wrong time");
        winner = msg.sender;
    }

    // Vulnerability 2: Short time window (vulnerable to miner manipulation)
    function timeLockedWithdraw() public {
        // Bug: 30 second window can be manipulated by miners
        require(block.timestamp >= lockedUntil[msg.sender], "Still locked");
        require(block.timestamp < lockedUntil[msg.sender] + 30, "Window expired");

        // Transfer logic
        payable(msg.sender).transfer(address(this).balance);
    }

    // Vulnerability 3: Timestamp-based randomness
    function selectWinner() public {
        // Bug: Using block.timestamp for "random" selection
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 100;
        if (random < 10) {
            winner = msg.sender;
        }
    }

    // Vulnerability 4: Auction end with manipulable timestamp
    function endAuction() public {
        // Bug: Miner can manipulate timestamp to end auction early/late
        require(block.timestamp >= auctionEndTime, "Auction not ended");
        require(highestBidder != address(0), "No bids");

        payable(highestBidder).transfer(highestBid);
    }

    // Vulnerability 5: Deadline with very short buffer
    function meetDeadline() public view returns (bool) {
        // Bug: 10 second buffer is within miner manipulation range
        return block.timestamp + 10 < auctionEndTime;
    }

    // Vulnerability 6: Using deprecated "now" keyword pattern
    // (In 0.8+, "now" is removed, but this pattern shows the vulnerability concept)
    function checkTimeWindow(uint256 start, uint256 end) public view returns (bool) {
        // Bug: Time window check without sufficient buffer
        return block.timestamp >= start && block.timestamp <= end;
    }

    // Functions to set up test state
    function startAuction(uint256 duration) public {
        require(msg.sender == owner, "Not owner");
        auctionEndTime = block.timestamp + duration;
    }

    function bid() public payable {
        require(block.timestamp < auctionEndTime, "Auction ended");
        require(msg.value > highestBid, "Bid too low");

        if (highestBidder != address(0)) {
            payable(highestBidder).transfer(highestBid);
        }

        highestBid = msg.value;
        highestBidder = msg.sender;
    }

    function setLock(address user, uint256 duration) public {
        require(msg.sender == owner, "Not owner");
        lockedUntil[user] = block.timestamp + duration;
    }

    receive() external payable {}
}
