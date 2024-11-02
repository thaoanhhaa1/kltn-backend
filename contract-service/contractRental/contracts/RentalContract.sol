// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RentalContract {
    enum RentalStatus {
        NotCreated,
        Deposited,
        Ongoing,
        Ended,
        Cancelled
    }

    struct Contract {
        string contractID;
        string propertyID; // Thêm propertyID kiểu chuỗi
        address payable owner;
        address payable renter;
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

    mapping(string => Contract) public contracts; // Thay contractID kiểu chuỗi
    mapping(string => Transaction[]) public contractTransactions;

    event ContractCreated(
        string indexed contractID,
        string propertyID,
        address indexed owner,
        address indexed renter,
        uint depositAmount,
        uint monthlyRent
    );
    event TransactionRecorded(
        string indexed contractID,
        address from,
        address to,
        uint amount,
        uint timestamp,
        string transactionType
    );
    event ContractCancelledByRenter(
        string indexed contractID,
        address indexed renter,
        uint depositLoss,
        uint extraCharge,
        uint timestamp
    );
    event ContractCancelledByOwner(string indexed contractID, address indexed owner, uint compensation, uint timestamp);
    event ContractTerminated(string indexed contractID, string reason);
    event ContractEnded(string indexed contractID, address indexed renter, uint depositRefundAmount, uint timestamp);

    modifier onlyOwner(string memory _contractID) {
        require(msg.sender == contracts[_contractID].owner, unicode'Chỉ chủ nhà mới có thể thực hiện hành động này');
        _;
    }

    modifier onlyRenter(string memory _contractID) {
        require(
            msg.sender == contracts[_contractID].renter,
            unicode'Chỉ người thuê mới có thể thực hiện hành động này'
        );
        _;
    }

    modifier onlyContractOwner(address _owner) {
        require(msg.sender == _owner, unicode'Chỉ chủ hợp đồng mới có thể tạo hợp đồng');
        _;
    }

    function createContract(
        string memory _contractID,
        string memory _propertyID,
        address payable _owner,
        address payable _renter,
        uint _depositAmount,
        uint _monthlyRent
    ) public onlyContractOwner(_owner) {
        require(_owner != address(0) && _renter != address(0), unicode'Địa chỉ không hợp lệ');

        contracts[_contractID] = Contract({
            contractID: _contractID,
            propertyID: _propertyID,
            owner: _owner,
            renter: _renter,
            depositAmount: _depositAmount,
            monthlyRent: _monthlyRent,
            status: RentalStatus.NotCreated
        });

        emit ContractCreated(_contractID, _propertyID, _owner, _renter, _depositAmount, _monthlyRent);
    }

    function deposit(string memory _contractID) public payable onlyRenter(_contractID) {
        Contract storage contractInfo = contracts[_contractID];

        require(contractInfo.status == RentalStatus.NotCreated, unicode'Trạng thái hợp đồng không hợp lệ để đặt cọc');
        require(address(msg.sender).balance >= msg.value, unicode'Số dư không đủ để đặt cọc');

        contractInfo.status = RentalStatus.Deposited;

        _recordTransaction(_contractID, msg.sender, address(this), msg.value, unicode'Đặt cọc');

        emit TransactionRecorded(_contractID, msg.sender, address(this), msg.value, block.timestamp, unicode'Đặt cọc');
    }

    function payRent(string memory _contractID) public payable onlyRenter(_contractID) {
        Contract storage contractInfo = contracts[_contractID];

        require(
            contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing,
            unicode'Trạng thái hợp đồng không hợp lệ để thanh toán tiền thuê'
        );
        require(address(msg.sender).balance >= msg.value, unicode'Số dư không đủ để thanh toán tiền thuê');

        if (contractInfo.status == RentalStatus.Deposited) {
            contractInfo.status = RentalStatus.Ongoing;
        }

        (bool success, ) = contractInfo.owner.call{ value: msg.value }('');
        require(success, unicode'Thanh toán tiền thuê thất bại');

        _recordTransaction(
            _contractID,
            msg.sender,
            contractInfo.owner,
            msg.value,
            unicode'Thanh toán tiền thuê với chủ nhà'
        );

        emit TransactionRecorded(
            _contractID,
            msg.sender,
            contractInfo.owner,
            msg.value,
            block.timestamp,
            unicode'Thanh toán tiền thuê với chủ nhà'
        );
    }

    // FIXME
    function transferToAddress(string memory _contractID, address payable recipient, uint256 amount) public {
        Contract storage contractInfo = contracts[_contractID];

        require(msg.sender == contractInfo.owner, unicode'Chỉ chủ hợp đồng mới có thể chuyển tiền');
        require(address(this).balance >= amount, unicode'Số dư không đủ để chuyển tiền');
        recipient.transfer(amount);

        _recordTransaction(
            _contractID,
            address(this),
            recipient,
            amount,
            unicode'Bồi thường tiền huỷ hợp đồng cho người thuê'
        );

        emit TransactionRecorded(
            _contractID,
            address(this),
            recipient,
            amount,
            block.timestamp,
            unicode'Bồi thường tiền huỷ hợp đồng cho người thuê'
        );
    }

    // FIXME
    function transferToSmartContract(string memory _contractID) public payable {
        Contract storage contractInfo = contracts[_contractID];

        require(msg.sender == contractInfo.owner, unicode'Chỉ chủ hợp đồng mới có thể chuyển tiền');

        require(msg.value > 0, unicode'Số tiền chuyển phải lớn hơn 0');
        require(address(msg.sender).balance >= msg.value, unicode'Số dư không đủ để chuyển tiền');

        _recordTransaction(
            _contractID,
            msg.sender,
            address(this),
            msg.value,
            unicode'Chuyển tiền vào hợp đồng để bồi thường cho người thuê vì hủy hợp đồng'
        );

        emit TransactionRecorded(
            _contractID,
            msg.sender,
            address(this),
            msg.value,
            block.timestamp,
            unicode'Chuyển tiền vào hợp đồng để bồi thường cho người thuê vì hủy hợp đồng'
        );
    }

    // function contractualIndemnity(string memory _contractID) public payable onlyOwner(_contractID) {
    //     Contract storage contractInfo = contracts[_contractID];

    //     require(
    //         contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing,
    //         unicode'Trạng thái hợp đồng không hợp lệ để thanh toán tiền thuê'
    //     );
    //     require(address(msg.sender).balance >= msg.value, unicode'Số dư không đủ để bồi thường');

    //     (bool success, ) = contractInfo.renter.call{ value: msg.value }('');
    //     require(success, unicode'Bồi thường tiền huỷ hợp đồng thất bại');

    //     _recordTransaction(
    //         _contractID,
    //         msg.sender,
    //         contractInfo.renter,
    //         msg.value,
    //         unicode'Bồi thường hợp đồng cho người thuê'
    //     );

    //     emit TransactionRecorded(
    //         _contractID,
    //         msg.sender,
    //         contractInfo.renter,
    //         msg.value,
    //         block.timestamp,
    //         unicode'Bồi thường hợp đồng cho người thuê'
    //     );
    // }

    function cancelContractBeforeDeposit(string memory _contractID) public {
        Contract storage contractInfo = contracts[_contractID];

        // Kiểm tra xem người gọi hàm có phải là chủ nhà hoặc người thuê hay không
        require(
            msg.sender == contractInfo.owner || msg.sender == contractInfo.renter,
            unicode'Chỉ có chủ nhà hoặc người thuê mới có thể kết thúc hợp đồng'
        );

        // Kiểm tra trạng thái hợp đồng
        require(contractInfo.status == RentalStatus.NotCreated, unicode'Trạng thái hợp đồng không hợp lệ để kết thúc');

        // Cập nhật trạng thái hợp đồng
        contractInfo.status = RentalStatus.Cancelled;

        // Phát sự kiện kết thúc hợp đồng
        emit ContractTerminated(
            _contractID,
            msg.sender == contractInfo.owner
                ? unicode'Chủ nhà kết thúc hợp đồng trước khi đặt cọc'
                : unicode'Người thuê kết thúc hợp đồng trước khi đặt cọc'
        );
    }

    // TODO
    function endContract(string memory _contractID, uint depositAmount) public payable onlyOwner(_contractID) {
        Contract storage contractInfo = contracts[_contractID];

        if (contractInfo.status == RentalStatus.NotCreated) {
            contractInfo.status = RentalStatus.Ended;
        } else if (contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing) {
            require(address(this).balance >= depositAmount, unicode'Số dư hợp đồng không đủ để hoàn trả tiền cọc');

            (bool success, ) = contractInfo.renter.call{ value: depositAmount }('');
            require(success, unicode'Hoàn trả tiền cọc thất bại');

            _recordTransaction(
                _contractID,
                address(this),
                contractInfo.renter,
                depositAmount,
                unicode'Hoàn trả tiền cọc cho người thuê khi kết thúc hợp đồng'
            );

            emit TransactionRecorded(
                _contractID,
                address(this),
                contractInfo.renter,
                depositAmount,
                block.timestamp,
                unicode'Hoàn trả tiền cọc cho người thuê khi kết thúc hợp đồng'
            );

            contractInfo.status = RentalStatus.Ended;
        } else {
            revert(unicode'Hợp đồng không ở trạng thái hợp lệ để kết thúc');
        }
        emit ContractEnded(_contractID, contractInfo.renter, depositAmount, block.timestamp);
    }

    function _recordTransaction(
        string memory _contractID,
        address _from,
        address _to,
        uint _amount,
        string memory _transactionType
    ) internal {
        contractTransactions[_contractID].push(
            Transaction({
                from: _from,
                to: _to,
                amount: _amount,
                timestamp: block.timestamp,
                transactionType: _transactionType
            })
        );
    }

    function getContractDetails(string memory _contractID) public view returns (Contract memory) {
        Contract memory contractInfo = contracts[_contractID];
        require(
            msg.sender == contractInfo.owner || msg.sender == contractInfo.renter,
            unicode'Chỉ chủ hợp đồng hoặc người thuê mới có thể xem chi tiết hợp đồng'
        );
        return contractInfo;
    }

    function getContractTransactions(string memory _contractID) public view returns (Transaction[] memory) {
        Contract memory contractInfo = contracts[_contractID];
        require(
            msg.sender == contractInfo.owner || msg.sender == contractInfo.renter,
            unicode'Chỉ chủ hợp đồng hoặc người thuê mới có thể xem giao dịch'
        );
        return contractTransactions[_contractID];
    }

    // function terminateForNonPayment(string memory _contractId, uint depositAmount) public {
    //     Contract storage contractInfo = contracts[_contractId];

    //     // Chỉ cho phép khi trạng thái hợp đồng là Deposited hoặc Ongoing
    //     require(contractInfo.status == RentalStatus.Ongoing, unicode'Hợp đồng phải ở trạng thái đang hoạt động');

    //     // Xử lý logic mất tiền cọc nếu không thanh toán đúng hạn
    //     if (depositAmount > 0) {
    //         require(address(this).balance >= depositAmount, unicode'Số dư hợp đồng không đủ để mất tiền cọc');

    //         // Chuyển tiền cọc cho chủ nhà
    //         (bool success, ) = contractInfo.owner.call{ value: depositAmount }('');
    //         require(success, unicode'Thanh toán tiền cọc cho chủ nhà thất bại');

    //         // Lưu giao dịch
    //         _recordTransaction(
    //             _contractId,
    //             address(this),
    //             contractInfo.owner,
    //             depositAmount,
    //             unicode'Thanh toán tiền cọc cho chủ nhà vì không thanh toán đúng hạn'
    //         );
    //     }

    //     // Đánh dấu hợp đồng đã kết thúc
    //     contractInfo.status = RentalStatus.Ended;
    //     emit ContractEnded(_contractId, contractInfo.renter, depositAmount, block.timestamp);
    // }

    // FIXME
    function cancelContractByRenter(
        string memory _contractId,
        bool notifyBefore30Days,
        uint depositAmount
    ) public payable onlyRenter(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        require(
            contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing,
            unicode'Trạng thái hợp đồng không hợp lệ để hủy'
        );

        uint depositLoss = 0;
        uint extraCharge = 0;

        if (notifyBefore30Days) {
            // Hoàn trả tiền cọc nếu thông báo trước 30 ngày
            require(address(this).balance >= depositAmount, unicode'Số dư hợp đồng không đủ để hoàn trả tiền cọc');

            (bool successRefund, ) = contractInfo.renter.call{ value: depositAmount }('');
            require(successRefund, unicode'Hoàn trả tiền cọc cho người thuê thất bại');

            _recordTransaction(
                _contractId,
                address(this),
                msg.sender,
                depositAmount,
                unicode'Hoàn trả tiền cọc cho người thuê'
            );

            emit TransactionRecorded(
                _contractId,
                address(this),
                msg.sender,
                depositAmount,
                block.timestamp,
                unicode'Hoàn trả tiền cọc cho người thuê'
            );
        } else {
            // Tính phí bổ sung và chuyển tiền cọc nếu không thông báo trước 30 ngày
            // extraCharge = contractInfo.monthlyRent;
            // require(msg.value == extraCharge, "Incorrect extra charge amount");
            // require(address(msg.sender).balance >= extraCharge, "Insufficient balance of renter");

            // (bool successExtraCharge, ) = contractInfo.owner.call{value: extraCharge}("");
            // require(successExtraCharge, "Extra charge transfer failed");

            // _recordTransaction(_contractId, msg.sender, contractInfo.owner, extraCharge, "Extra Charge");

            depositLoss = depositAmount;
            require(address(this).balance >= depositLoss, unicode'Số dư hợp đồng không đủ để hoàn trả tiền cọc');

            (bool successDeposit, ) = contractInfo.owner.call{ value: depositLoss }(''); // Chuyển tiền cọc từ người thuê cho chủ nhà
            require(successDeposit, unicode'Thanh toán tiền cọc cho chủ nhà thất bại');

            _recordTransaction(
                _contractId,
                address(this),
                contractInfo.owner,
                depositLoss,
                unicode'Thanh toán tiền cọc cho chủ nhà'
            );

            emit TransactionRecorded(
                _contractId,
                address(this),
                contractInfo.owner,
                depositLoss,
                block.timestamp,
                unicode'Thanh toán tiền cọc cho chủ nhà'
            );
        }

        contractInfo.status = RentalStatus.Ended;
        emit ContractCancelledByRenter(_contractId, msg.sender, depositLoss, extraCharge, block.timestamp);
    }

    // FIXME
    function cancelContractByOwner(
        string memory _contractId,
        uint depositAmount
    ) public payable onlyOwner(_contractId) {
        Contract storage contractInfo = contracts[_contractId];

        require(
            contractInfo.status == RentalStatus.Deposited || contractInfo.status == RentalStatus.Ongoing,
            unicode'Trạng thái hợp đồng không hợp lệ để hủy'
        );

        // Hoàn trả tiền cọc cho người thuê nếu hợp đồng vẫn còn hiệu lực
        require(address(this).balance >= depositAmount, unicode'Số dư hợp đồng không đủ để hoàn trả tiền cọc');

        (bool successDeposit, ) = contractInfo.renter.call{ value: depositAmount }('');
        require(successDeposit, unicode'Hoàn trả tiền cọc thất bại');

        _recordTransaction(_contractId, address(this), contractInfo.renter, depositAmount, unicode'Hoàn trả tiền cọc');

        emit TransactionRecorded(
            _contractId,
            address(this),
            contractInfo.renter,
            depositAmount,
            block.timestamp,
            unicode'Hoàn trả tiền cọc'
        );

        contractInfo.status = RentalStatus.Ended;
        emit ContractCancelledByOwner(_contractId, msg.sender, depositAmount, block.timestamp);
    }
}
