const RentalContract = artifacts.require("RentalContract");

contract("RentalContract", (accounts) => {
    let rentalInstance;
    const owner = accounts[0];
    const renter = accounts[1];
    const startDate = Math.floor(Date.now() / 1000); // thời gian hiện tại tính bằng giây
    const endDate = startDate + 30 * 24 * 60 * 60; // 30 ngày sau
    const details = "Căn hộ 2 phòng ngủ, địa chỉ: 123 Đường ABC, TP.HCM";
    const depositAmount = web3.utils.toWei("2", "ether");
    const monthlyRent = web3.utils.toWei("0.5", "ether");
    const propertyId = "PROP1234";

    beforeEach(async () => {
        rentalInstance = await RentalContract.new();
    });

    it("should create a rental contract", async () => {
        await rentalInstance.createContract(
            owner,
            renter,
            startDate,
            endDate,
            details,
            depositAmount,
            monthlyRent,
            propertyId,
            { from: owner }
        );

        const rental = await rentalInstance.rentals(0);

        assert.equal(rental.owner, owner, "Owner address does not match");
        assert.equal(rental.renter, renter, "Renter address does not match");
        assert.equal(rental.startDate.toNumber(), startDate, "Start date does not match");
        assert.equal(rental.endDate.toNumber(), endDate, "End date does not match");
        assert.equal(rental.details, details, "Details do not match");
        assert.equal(rental.depositAmount.toString(), depositAmount, "Deposit amount does not match");
        assert.equal(rental.monthlyRent.toString(), monthlyRent, "Monthly rent does not match");
        assert.equal(rental.propertyId, propertyId, "Property ID does not match");
        assert.equal(rental.isPaid, false, "isPaid should be false initially");
    });

    it("should allow renter to pay rent", async () => {
        await rentalInstance.createContract(
            owner,
            renter,
            startDate,
            endDate,
            details,
            depositAmount,
            monthlyRent,
            propertyId,
            { from: owner }
        );

        await rentalInstance.payRent(0, { from: renter, value: monthlyRent });

        const rental = await rentalInstance.rentals(0);
        assert.equal(rental.isPaid, true, "Rent should be marked as paid");
    });

    it("should emit RentPaid event on rent payment", async () => {
        await rentalInstance.createContract(
            owner,
            renter,
            startDate,
            endDate,
            details,
            depositAmount,
            monthlyRent,
            propertyId,
            { from: owner }
        );

        const receipt = await rentalInstance.payRent(0, { from: renter, value: monthlyRent });

        const event = receipt.logs.find(log => log.event === "RentPaid");
        assert(event, "RentPaid event should be emitted");
        assert.equal(event.args.renter, renter, "Renter address should match");
        assert.equal(event.args.owner, owner, "Owner address should match");
        assert.equal(event.args.amount.toString(), monthlyRent, "Rent amount should match");
        assert.equal(event.args.propertyId, propertyId, "Property ID should match");
    });

    it("should calculate penalty correctly", async () => {
        const lateDays = 5;
        const expectedPenalty = web3.utils.toWei("0.05", "ether"); // 1% of 0.5 ETH per day

        const penalty = await rentalInstance.calculatePenalty(lateDays);
        assert.equal(penalty.toString(), expectedPenalty, "Penalty calculation is incorrect");
    });
});
