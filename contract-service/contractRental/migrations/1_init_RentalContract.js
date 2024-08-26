const RentalContract = artifacts.require("RentalContract");

module.exports = function (deployer) {
    deployer.deploy(RentalContract, { gas: 6000000 });
};