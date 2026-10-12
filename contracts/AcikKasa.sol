// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice A club's declarations, not bank balances or transfers of money.
/// Original records are append-only. Corrections are new linked records.
contract AcikKasa {
    enum Kind { Income, Expense }

    struct Record {
        uint256 id;
        Kind kind;
        uint256 amount; // Turkish kurus; 100 kurus = 1 TL.
        string description;
        string category;
        string counterparty; // Organization only, never personal information.
        uint64 recordedAt;
        address author;
        uint256 replacesId; // 0 means an original record.
    }

    address public owner;
    address public pendingOwner;
    mapping(address => bool) public admins;
    mapping(uint256 => uint256) public replacedBy;
    Record[] private records;
    uint256 public totalIncome;
    uint256 public totalExpense;

    event RecordAdded(
        uint256 indexed id, address indexed author, Kind kind,
        uint256 amount, string description, string category,
        string counterparty, uint64 recordedAt, uint256 replacesId
    );
    event AdminChanged(address indexed account, bool enabled);
    event OwnershipProposed(address indexed nextOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed nextOwner);

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidText();
    error RecordNotFound();
    error AlreadyCorrected();
    error InvalidPage();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAdmin() {
        if (!admins[msg.sender]) revert Unauthorized();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();
        owner = initialOwner;
        admins[initialOwner] = true;
        emit AdminChanged(initialOwner, true);
    }

    function setAdmin(address account, bool enabled) external onlyOwner {
        if (account == address(0) || (account == owner && !enabled)) revert InvalidAddress();
        admins[account] = enabled;
        emit AdminChanged(account, enabled);
    }

    // A two-step handover avoids losing ownership through a mistyped address.
    function proposeOwner(address nextOwner) external onlyOwner {
        if (nextOwner == address(0) || nextOwner == owner) revert InvalidAddress();
        pendingOwner = nextOwner;
        emit OwnershipProposed(nextOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        address previous = owner;
        admins[previous] = false;
        owner = msg.sender;
        pendingOwner = address(0);
        admins[msg.sender] = true;
        emit AdminChanged(previous, false);
        emit AdminChanged(msg.sender, true);
        emit OwnershipTransferred(previous, msg.sender);
    }

    function addRecord(Kind kind, uint256 amount, string calldata description,
        string calldata category, string calldata counterparty
    ) external onlyAdmin returns (uint256) {
        return _append(kind, amount, description, category, counterparty, 0);
    }

    function correctRecord(uint256 previousId, uint256 amount, string calldata description,
        string calldata category, string calldata counterparty
    ) external onlyAdmin returns (uint256) {
        if (previousId == 0 || previousId > records.length) revert RecordNotFound();
        if (replacedBy[previousId] != 0) revert AlreadyCorrected();
        Record storage previous = records[previousId - 1];
        // Only effective records can be corrected. Their stored contents never change.
        if (previous.kind == Kind.Income) totalIncome -= previous.amount;
        else totalExpense -= previous.amount;
        uint256 nextId = _append(previous.kind, amount, description, category, counterparty, previousId);
        replacedBy[previousId] = nextId;
        return nextId;
    }

    function _append(Kind kind, uint256 amount, string memory description,
        string memory category, string memory counterparty, uint256 previousId
    ) private returns (uint256 id) {
        // Bounds also keep frontend integer handling and per-record gas predictable.
        if (amount == 0 || amount > 1_000_000_000_000_000) revert InvalidAmount();
        if (bytes(description).length == 0 || bytes(description).length > 280
            || bytes(category).length > 48 || bytes(counterparty).length > 120) revert InvalidText();
        id = records.length + 1;
        uint64 recordedAt = uint64(block.timestamp);
        records.push(Record(id, kind, amount, description, category, counterparty,
            recordedAt, msg.sender, previousId));
        if (kind == Kind.Income) totalIncome += amount;
        else totalExpense += amount;
        emit RecordAdded(id, msg.sender, kind, amount, description, category,
            counterparty, recordedAt, previousId);
    }

    function recordCount() external view returns (uint256) { return records.length; }

    function getRecord(uint256 id) external view returns (Record memory) {
        if (id == 0 || id > records.length) revert RecordNotFound();
        return records[id - 1];
    }

    function getRecords(uint256 offset, uint256 limit) external view returns (Record[] memory page) {
        if (limit == 0 || limit > 50 || offset > records.length) revert InvalidPage();
        uint256 count = records.length - offset;
        if (count > limit) count = limit;
        page = new Record[](count);
        for (uint256 i = 0; i < count; i++) page[i] = records[offset + i];
    }
}
