// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RentalContract {
    enum RentalStatus { NotCreated, Deposited, Ongoing, Ended }

    struct Contract {
        address payable owner;   
        address payable renter;  
        uint startDate;
        uint endDate;
        uint depositAmount;
        uint monthlyRent;
        RentalStatus status;
    }

    struct Transaction {
        address from;
        address to;
        uint amount;
        uint timestamp;
        string transactionType; // Ví dụ: "Deposit", "Rent Payment", "Refund"
    }

    mapping(uint => Contract) public contracts;
    mapping(uint => Transaction[]) public contractTransactions; // Lưu trữ các giao dịch của mỗi hợp đồng
    uint public nextContractId = 1;  // Bắt đầu từ 1

    event ContractCreated(uint indexed contractId, address indexed owner, address indexed renter, uint startDate, uint endDate, uint depositAmount, uint monthlyRent);
    event TransactionRecorded(uint indexed contractId, address from, address to, uint amount, uint timestamp, string transactionType);
    event ContractCancelledByRenter(address renter, uint depositLoss, uint extraCharge, uint contractId, uint timestamp);
    event ContractCancelledByOwner(address owner, uint compensation, uint contractId, uint timestamp);

    modifier onlyOwner(uint _contractId) {
        require(msg.sender == contracts[_contractId].owner, "Only the owner can perform this action");
        _;
    }

    modifier onlyRenter(uint _contractId) {
        require(msg.sender == contracts[_contractId].renter, "Only the renter can perform this action");
        _;
    }

    modifier rentalNotEnded(uint _contractId) {
        require(contracts[_contractId].status != RentalStatus.Ended, "Rental contract has already ended");
        _;
    }

    modifier onlyContractOwner(address _owner) {
        require(msg.sender == _owner, "Only the contract owner can create the contract");
        _;
    }

    function createContract(
        address payable _owner,
        address payable _renter,
        uint _startDate,
        uint _endDate,
        uint _depositAmount,
        uint _monthlyRent
       
    ) public onlyContractOwner(_owner) {
        require(_owner != address(0), "Invalid owner address");
        require(_renter != address(0), "Invalid renter address");
        require(_startDate < _endDate, "Start date must be before end date");

        uint contractId = nextContractId++;

        Contract memory newContract = Contract({
            owner: _owner,
            renter: _renter,
            startDate: _startDate,
            endDate: _endDate,
            depositAmount: _depositAmount,
            monthlyRent: _monthlyRent,
            status: RentalStatus.NotCreated
           
        });

        contracts[contractId] = newContract;
        emit ContractCreated(contractId, _owner, _renter, _startDate, _endDate, _depositAmount, _monthlyRent);
    }

    function deposit(uint _contractId) public payable onlyRenter(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        require(contractInfo.status == RentalStatus.NotCreated, "Contract status is not valid for deposit");
        require(msg.value == contractInfo.depositAmount, "Incorrect deposit amount");

        contractInfo.status = RentalStatus.Deposited;

        recordTransaction(_contractId, msg.sender, contractInfo.owner, msg.value, "Deposit");

        emit TransactionRecorded(_contractId, msg.sender, contractInfo.owner, msg.value, block.timestamp, "Deposit");
    }

    function payRent(uint _contractId) public payable onlyRenter(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        require(contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing, "Rental period not valid");
        require(msg.value == contractInfo.monthlyRent, "Incorrect rent amount");

        if (contractInfo.status == RentalStatus.Deposited) {
            contractInfo.status = RentalStatus.Ongoing;
        }

        contractInfo.owner.transfer(msg.value);

        recordTransaction(_contractId, msg.sender, contractInfo.owner, msg.value, "Rent Payment");

        emit TransactionRecorded(_contractId, msg.sender, contractInfo.owner, msg.value, block.timestamp, "Rent Payment");
    }

    function endContract(uint _contractId) public onlyOwner(_contractId) {
        Contract storage contractInfo = contracts[_contractId];
        contractInfo.status = RentalStatus.Ended;

        (bool success, ) = contractInfo.renter.call{value: contractInfo.depositAmount}("");
        require(success, "Deposit refund transfer failed");

        recordTransaction(_contractId, contractInfo.owner, contractInfo.renter, contractInfo.depositAmount, "Refund");

        emit TransactionRecorded(_contractId, contractInfo.owner, contractInfo.renter, contractInfo.depositAmount, block.timestamp, "Refund");
    }

    function cancelContractByRenter(uint _contractId, bool notifyBefore30Days) public payable onlyRenter(_contractId) rentalNotEnded(_contractId) {
    Contract storage contractInfo = contracts[_contractId];

    uint depositLoss = 0;
    uint extraCharge = 0;

    if (!notifyBefore30Days) {
        // Nếu không thông báo trước 30 ngày
        extraCharge = contractInfo.monthlyRent;
        require(msg.value == extraCharge, "Incorrect extra charge amount");

        (bool successExtraCharge, ) = contractInfo.owner.call{value: extraCharge}("");
        require(successExtraCharge, "Extra charge transfer failed");

        // Lưu giao dịch chuyển khoản tiền bồi thường cho chủ nhà
        recordTransaction(_contractId, msg.sender, contractInfo.owner, extraCharge, "Extra Charge");

        depositLoss = contractInfo.depositAmount;
        (bool successDeposit, ) = contractInfo.owner.call{value: depositLoss}("");
        require(successDeposit, "Deposit transfer failed");

        // Lưu giao dịch chuyển khoản tiền đặt cọc cho chủ nhà
        recordTransaction(_contractId, msg.sender, contractInfo.owner, depositLoss, "Deposit Loss");
    } else {
        // Nếu thông báo trước 30 ngày
        (bool successRefund, ) = contractInfo.renter.call{value: contractInfo.depositAmount}("");
        require(successRefund, "Deposit refund transfer failed");

        // Lưu giao dịch hoàn trả tiền đặt cọc cho người thuê
        recordTransaction(_contractId, contractInfo.owner, msg.sender, contractInfo.depositAmount, "Deposit Refund");
    }

    contractInfo.status = RentalStatus.Ended;
    emit ContractCancelledByRenter(contractInfo.renter, depositLoss, extraCharge, _contractId, block.timestamp);
}

function cancelContractByOwner(uint _contractId, bool notifyBefore30Days) public payable onlyOwner(_contractId) rentalNotEnded(_contractId) {
    Contract storage contractInfo = contracts[_contractId];

    uint compensation = 0;

    if (!notifyBefore30Days) {
        // Nếu không thông báo trước 30 ngày, chủ nhà phải bồi thường
        compensation = contractInfo.monthlyRent;

        (bool successCompensation, ) = contractInfo.renter.call{value: compensation}("");
        require(successCompensation, "Compensation transfer failed");

        // Lưu giao dịch chuyển khoản tiền bồi thường cho người thuê
        recordTransaction(_contractId, msg.sender, contractInfo.renter, compensation, "Compensation");
    }

    if (contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing) {
        (bool successDeposit, ) = contractInfo.renter.call{value: contractInfo.depositAmount}("");
        require(successDeposit, "Deposit refund transfer failed");

        // Lưu giao dịch hoàn trả tiền đặt cọc cho người thuê
        recordTransaction(_contractId, msg.sender, contractInfo.renter, contractInfo.depositAmount, "Deposit Refund");
    }

    contractInfo.status = RentalStatus.Ended;
    emit ContractCancelledByOwner(contractInfo.owner, compensation, _contractId, block.timestamp);
}


    function recordTransaction(uint _contractId, address _from, address _to, uint _amount, string memory _transactionType) internal {
        Transaction memory newTransaction = Transaction({
            from: _from,
            to: _to,
            amount: _amount,
            timestamp: block.timestamp,
            transactionType: _transactionType
        });

        contractTransactions[_contractId].push(newTransaction);
    }

    function getContractDetails(uint _contractId) public view returns (Contract memory) {
    Contract memory contractInfo = contracts[_contractId];
    
    // Kiểm tra quyền truy cập
    require(msg.sender == contractInfo.owner || msg.sender == contractInfo.renter, "Only the contract owner or renter can view the contract details");

    return contractInfo;
    }


    function getContractTransactions(uint _contractId) public view returns (Transaction[] memory) {
        Contract memory contractInfo = contracts[_contractId];

        require(msg.sender == contractInfo.owner || msg.sender == contractInfo.renter, "Only the contract owner or renter can view the transactions");

        return contractTransactions[_contractId];
    }
}
