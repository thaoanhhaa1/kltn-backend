// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RentalContract {
    enum RentalStatus { NotCreated, Deposited, Ongoing, Ended }

    struct Rental {
        address payable owner;
        address payable renter;
        uint startDate;
        uint endDate;
        string details;
        uint depositAmount;
        uint monthlyRent;
        string propertyId;
        RentalStatus status;
    }

    Rental[] public rentals;

    event ContractCreated(address indexed owner, address indexed renter, string propertyId, uint startDate, uint endDate);
    event RentPaid(address indexed renter, address indexed owner, uint amount, string propertyId, uint timestamp);
    event DepositReturned(address indexed renter, uint amount, string propertyId, uint timestamp);
    event ContractEnded(address indexed owner, address indexed renter, string propertyId, uint timestamp);
    event DepositMade(address indexed renter, uint amount, string propertyId, uint timestamp);
    event ContractCancelledByRenter(address indexed renter, uint depositLoss, uint extraCharge, string propertyId, uint timestamp);
    event ContractCancelledByOwner(address indexed owner, uint compensation, string propertyId, uint timestamp);

    modifier onlyOwner(uint _rentalIndex) {
        require(msg.sender == rentals[_rentalIndex].owner, "Only the owner can perform this action");
        _;
    }

    modifier onlyRenter(uint _rentalIndex) {
        require(msg.sender == rentals[_rentalIndex].renter, "Only the renter can perform this action");
        _;
    }

    modifier rentalNotEnded(uint _rentalIndex) {
        require(rentals[_rentalIndex].status != RentalStatus.Ended, "Rental has ended");
        _;
    }

    function createContract(
        address payable _owner,
        address payable _renter,
        uint _startDate,
        uint _endDate,
        string memory _details,
        uint _monthlyRent,
        string memory _propertyId,
        uint _depositAmount
    ) public {
        // Kiểm tra rằng người gọi hàm là chủ hợp đồng
        require(msg.sender == _owner, "Only the owner can create the contract");
        require(_startDate < _endDate, "Invalid rental dates");

        Rental memory newRental = Rental({
            owner: _owner,
            renter: _renter,
            startDate: _startDate,
            endDate: _endDate,
            details: _details,
            depositAmount: _depositAmount,
            monthlyRent: _monthlyRent,
            propertyId: _propertyId,
            status: RentalStatus.NotCreated
        });

        rentals.push(newRental);
        emit ContractCreated(_owner, _renter, _propertyId, _startDate, _endDate);
    }

    function depositAndCreateContract(uint _rentalIndex) public payable {
        require(_rentalIndex < rentals.length, "Invalid rental index");
        Rental storage rental = rentals[_rentalIndex];

        require(msg.sender == rental.renter, "Only the renter can make a deposit");
        require(rental.status == RentalStatus.NotCreated, "Contract already created");
        require(msg.value == rental.depositAmount, "Incorrect deposit amount");

        // Giữ tiền cọc trong hợp đồng
        rental.status = RentalStatus.Deposited;
        emit DepositMade(msg.sender, msg.value, rental.propertyId, block.timestamp);
    }

    function payRent(uint _rentalIndex) public payable onlyRenter(_rentalIndex) rentalNotEnded(_rentalIndex) {
        require(_rentalIndex < rentals.length, "Invalid rental index");
        Rental storage rental = rentals[_rentalIndex];

        require(rental.status == RentalStatus.Ongoing || rental.status == RentalStatus.Deposited, "Rental period not started or already ended");
        require(msg.value == rental.monthlyRent, "Incorrect rent amount");

        if (rental.status == RentalStatus.Deposited) {
            rental.status = RentalStatus.Ongoing; // Start the rental period
        }

        rental.owner.transfer(msg.value);
        emit RentPaid(msg.sender, rental.owner, msg.value, rental.propertyId, block.timestamp);
    }

    function endContract(uint _rentalIndex) public onlyOwner(_rentalIndex) rentalNotEnded(_rentalIndex) {
        Rental storage rental = rentals[_rentalIndex];
        rental.status = RentalStatus.Ended;

        if (rental.status == RentalStatus.Ongoing) {
            // Hoàn tiền cọc cho người thuê
            (bool success, ) = rental.renter.call{value: rental.depositAmount}("");
            require(success, "Deposit refund transfer failed");
            emit DepositReturned(rental.renter, rental.depositAmount, rental.propertyId, block.timestamp);
        }

        emit ContractEnded(rental.owner, rental.renter, rental.propertyId, block.timestamp);
    }

    function cancelContractByRenter(uint _rentalIndex, bool notifyBefore30Days) public payable onlyRenter(_rentalIndex) rentalNotEnded(_rentalIndex) {
        Rental storage rental = rentals[_rentalIndex];

        uint depositLoss = 0;
        uint extraCharge = 0;

        if (!notifyBefore30Days) {
            // Nếu không thông báo trước 30 ngày
            extraCharge = rental.monthlyRent;
            require(msg.value == extraCharge, "Incorrect extra charge amount");
            
            // Chuyển tiền bổ sung cho chủ nhà
            (bool successExtraCharge, ) = rental.owner.call{value: extraCharge}("");
            require(successExtraCharge, "Extra charge transfer failed");

            // Chuyển tiền cọc cho chủ nhà
            depositLoss = rental.depositAmount;
            (bool successDeposit, ) = rental.owner.call{value: depositLoss}("");
            require(successDeposit, "Deposit transfer failed");
        } else {
            // Nếu thông báo trước 30 ngày
            // Hoàn lại tiền cọc cho người thuê
            (bool successRefund, ) = rental.renter.call{value: rental.depositAmount}("");
            require(successRefund, "Deposit refund transfer failed");
        }

        // Cập nhật trạng thái hợp đồng
        rental.status = RentalStatus.Ended;
        emit ContractCancelledByRenter(rental.renter, depositLoss, extraCharge, rental.propertyId, block.timestamp);
    }

    function cancelContractByOwner(uint _rentalIndex, bool notifyBefore30Days) public payable onlyOwner(_rentalIndex) rentalNotEnded(_rentalIndex) {
        Rental storage rental = rentals[_rentalIndex];

        uint compensation = 0;

        if (!notifyBefore30Days) {
            // Nếu không thông báo trước 30 ngày, chủ nhà phải bồi thường
            compensation = rental.monthlyRent;

            // Thực hiện chuyển tiền bồi thường cho người thuê từ tài khoản chủ nhà
            (bool successCompensation, ) = rental.renter.call{value: compensation}("");
            require(successCompensation, "Compensation transfer failed");
        }

        // Thực hiện hoàn tiền cọc cho người thuê nếu hợp đồng đã có cọc
        if (rental.status == RentalStatus.Deposited || rental.status == RentalStatus.Ongoing) {
            (bool successDeposit, ) = rental.renter.call{value: rental.depositAmount}("");
            require(successDeposit, "Deposit refund transfer failed");
        }

        rental.status = RentalStatus.Ended;
        emit ContractCancelledByOwner(rental.owner, compensation, rental.propertyId, block.timestamp);
    }

    function getRentalDetails(uint _rentalIndex) public view returns (Rental memory) {
        return rentals[_rentalIndex];
    }

    function getAllRentals() public view returns (Rental[] memory) {
        return rentals;
    }

    // Hàm trả về số dư hiện tại của hợp đồng
    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }
}
