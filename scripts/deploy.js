const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Retrieve the deployer's signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  // Deploy CombinedContract with gas limit and gas price options
  const CombinedContract = await ethers.getContractFactory("Election");
  const deployment = await CombinedContract.deploy({
    gasLimit: 300000, // Adjust the gas limit as needed
    gasPrice: 100000000, // 100 Gwei in wei; adjust the value as needed
  });

  // Wait for the deployment transaction to be mined
  //await deployment.deployTransaction.wait();
  // Wait for the deployment transaction to be mined
  await deployment.waitForDeployment();

  console.log("CombinedContract contract deployed to:", deployment.address);

  // Write the contract address to a config file
  fs.writeFileSync(
    "./config.js",
    `
  export const combinedContract_address = "${deployment.address}"
  `
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
