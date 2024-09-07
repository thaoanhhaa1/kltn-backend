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
        string transactionType; 
    }

    mapping(uint => Contract) public contracts;
    mapping(uint => Transaction[]) public contractTransactions;
    uint public nextContractId = 1;

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
        require(_owner != address(0) && _renter != address(0), "Invalid address");
        require(_startDate < _endDate, "Start date must be before end date");

        uint contractId = nextContractId++;

        contracts[contractId] = Contract({
            owner: _owner,
            renter: _renter,
            startDate: _startDate,
            endDate: _endDate,
            depositAmount: _depositAmount,
            monthlyRent: _monthlyRent,
            status: RentalStatus.NotCreated
        });

        emit ContractCreated(contractId, _owner, _renter, _startDate, _endDate, _depositAmount, _monthlyRent);
    }

    function deposit(uint _contractId) public payable onlyRenter(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        require(contractInfo.status == RentalStatus.NotCreated, "Contract status is not valid for deposit");
        require(msg.value == contractInfo.depositAmount, "Incorrect deposit amount");
        require(address(msg.sender).balance >= msg.value, "Insufficient balance of renter");

        contractInfo.status = RentalStatus.Deposited;

        _recordTransaction(_contractId, msg.sender, contractInfo.owner, msg.value, "Deposit");

        emit TransactionRecorded(_contractId, msg.sender, contractInfo.owner, msg.value, block.timestamp, "Deposit");
        }

    function payRent(uint _contractId) public payable onlyRenter(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        require(contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing, "Rental period not valid");
        require(msg.value == contractInfo.monthlyRent, "Incorrect rent amount");
        require(address(msg.sender).balance >= msg.value, "Insufficient balance of renter");

        if (contractInfo.status == RentalStatus.Deposited) {
            contractInfo.status = RentalStatus.Ongoing;
        }

        (bool success, ) = contractInfo.owner.call{value: msg.value}("");
        require(success, "Rent payment transfer failed");

        _recordTransaction(_contractId, msg.sender, contractInfo.owner, msg.value, "Rent Payment");

        emit TransactionRecorded(_contractId, msg.sender, contractInfo.owner, msg.value, block.timestamp, "Rent Payment");
    }

    function endContract(uint _contractId) public {
        Contract storage contractInfo = contracts[_contractId];

        // Kiểm tra quyền truy cập: chỉ người thuê hoặc chủ nhà mới có thể gọi hàm này
        // require(msg.sender == contractInfo.owner || msg.sender == contractInfo.renter, "Only the owner or renter can end the contract");

        if (contractInfo.status == RentalStatus.NotCreated) {
            // Nếu trạng thái là NotCreated, chỉ cần thay đổi trạng thái của hợp đồng
            contractInfo.status = RentalStatus.Ended;
        } else if (contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing) {
            // Nếu trạng thái là Deposited hoặc Ongoing, hoàn trả tiền đặt cọc
            if (contractInfo.depositAmount > 0) {
                // Đảm bảo rằng hợp đồng có đủ tiền để hoàn trả tiền đặt cọc
                require(address(this).balance >= contractInfo.depositAmount, "Contract balance insufficient for deposit refund");

                // Hoàn trả tiền đặt cọc cho người thuê
                (bool success, ) = contractInfo.renter.call{value: contractInfo.depositAmount}("");
                require(success, "Deposit refund transfer failed");

                // Lưu giao dịch hoàn trả tiền đặt cọc
                _recordTransaction(_contractId, contractInfo.owner, contractInfo.renter, contractInfo.depositAmount, "Refund");
            }
            
            // Đánh dấu hợp đồng đã kết thúc sau khi các bước khác đã hoàn tất
            contractInfo.status = RentalStatus.Ended;

            // Ghi lại giao dịch kết thúc hợp đồng
            emit TransactionRecorded(_contractId, contractInfo.owner, contractInfo.renter, contractInfo.depositAmount, block.timestamp, "Refund");
        } else {
            revert("Contract is not in a valid state for ending");
        }
    }

    function cancelContractByRenter(uint _contractId, bool notifyBefore30Days) public payable onlyRenter(_contractId) rentalNotEnded(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        uint depositLoss = 0;
        uint extraCharge = 0;

        if (!notifyBefore30Days) {
            extraCharge = contractInfo.monthlyRent;
            require(msg.value == extraCharge, "Incorrect extra charge amount");
            require(address(msg.sender).balance >= extraCharge, "Insufficient balance of renter");

            (bool successExtraCharge, ) = contractInfo.owner.call{value: extraCharge}("");
            require(successExtraCharge, "Extra charge transfer failed");

            _recordTransaction(_contractId, msg.sender, contractInfo.owner, extraCharge, "Extra Charge");

            depositLoss = contractInfo.depositAmount;
            require(address(this).balance >= depositLoss, "Contract balance insufficient");

            (bool successDeposit, ) = contractInfo.owner.call{value: depositLoss}("");
            require(successDeposit, "Deposit transfer failed");

            _recordTransaction(_contractId, msg.sender, contractInfo.owner, depositLoss, "Deposit Loss");
        } else {
            require(address(this).balance >= contractInfo.depositAmount, "Contract balance insufficient");

            (bool successRefund, ) = contractInfo.renter.call{value: contractInfo.depositAmount}("");
            require(successRefund, "Deposit refund transfer failed");

            _recordTransaction(_contractId, contractInfo.owner, msg.sender, contractInfo.depositAmount, "Deposit Refund");
        }

        contractInfo.status = RentalStatus.Ended;
        emit ContractCancelledByRenter(contractInfo.renter, depositLoss, extraCharge, _contractId, block.timestamp);
    }

    function cancelContractByOwner(uint _contractId, bool notifyBefore30Days) public payable onlyOwner(_contractId) rentalNotEnded(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        uint compensation = 0;

        if (!notifyBefore30Days) {
            compensation = contractInfo.monthlyRent;
            require(address(msg.sender).balance >= compensation, "Owner's balance insufficient for compensation");

            (bool successCompensation, ) = contractInfo.renter.call{value: compensation}("");
            require(successCompensation, "Compensation transfer failed");

            _recordTransaction(_contractId, msg.sender, contractInfo.renter, compensation, "Compensation");
        }

        if (contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing) {
            require(address(this).balance >= contractInfo.depositAmount, "Contract balance insufficient for deposit refund");

            (bool successDeposit, ) = contractInfo.renter.call{value: contractInfo.depositAmount}("");
            require(successDeposit, "Deposit refund transfer failed");

            _recordTransaction(_contractId, msg.sender, contractInfo.renter, contractInfo.depositAmount, "Deposit Refund");
        }

        contractInfo.status = RentalStatus.Ended;
        emit ContractCancelledByOwner(contractInfo.owner, compensation, _contractId, block.timestamp);
    }

    function terminateForNonPayment(uint _contractId) public onlyOwner(_contractId) {
            Contract storage contractInfo = contracts[_contractId];

            // Chỉ cho phép khi trạng thái hợp đồng là Deposited hoặc Ongoing
            require(contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing, "Contract must be active");

            // Kiểm tra đã quá hạn thanh toán
            // Đây là phần bạn kiểm tra trên backend trước khi gọi hàm này

            // Xử lý logic mất tiền cọc nếu không thanh toán đúng hạn
            if (contractInfo.depositAmount > 0) {
                require(address(this).balance >= contractInfo.depositAmount, "Contract balance insufficient for deposit forfeit");

                // Chuyển tiền cọc cho chủ nhà
                (bool success, ) = contractInfo.owner.call{value: contractInfo.depositAmount}("");
                require(success, "Deposit transfer to owner failed");

                // Lưu giao dịch
                _recordTransaction(_contractId, address(this), contractInfo.owner, contractInfo.depositAmount, "Deposit Forfeited");
            }

            // Đánh dấu hợp đồng đã kết thúc
            contractInfo.status = RentalStatus.Ended;
        }




        function _recordTransaction(uint _contractId, address _from, address _to, uint _amount, string memory _transactionType) internal {
            contractTransactions[_contractId].push(Transaction({
                from: _from,
                to: _to,
                amount: _amount,
                timestamp: block.timestamp,
                transactionType: _transactionType
            }));
        }

        function getContractDetails(uint _contractId) public view returns (Contract memory) {
            Contract memory contractInfo = contracts[_contractId];
            
            require(msg.sender == contractInfo.owner || msg.sender == contractInfo.renter, "Only the contract owner or renter can view the contract details");

            return contractInfo;
        }

        function getContractTransactions(uint _contractId) public view returns (Transaction[] memory) {
            Contract memory contractInfo = contracts[_contractId];

            require(msg.sender == contractInfo.owner || msg.sender == contractInfo.renter, "Only the contract owner or renter can view the transactions");

            return contractTransactions[_contractId];
        }
    }
