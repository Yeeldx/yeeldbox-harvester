const StrategyABI = require("./abi/Strategy.json");
const VaultABI = require("./abi/Vault.json");
const TokenABI = require("./abi/Token.json");
const log = require('log-to-file');

var cron = require("node-cron");

const dotenv = require("dotenv");
dotenv.config();

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WSS_RPC_URL));

const GAS_BUFFER = 1.2;

let strategyAddresses: string[] = [
  "0xc4d80C55dc12FF0f2b8680eC31A6ADC4cbC8Dfca",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getStrategies = (strategyAddresses) => {
  let strategies: typeof web3.eth.Contract[] = [];
  strategyAddresses.forEach((address) => {
    let strata = new web3.eth.Contract(StrategyABI, address);
    strategies.push(strata);
  });
  return strategies;
};

let estimateGas = async (tx, senderAddress) => {
  const [gasPrice, gas]: [number, number] = await Promise.all([
    web3.eth.getGasPrice(),
    tx.estimateGas({ from: senderAddress }),
  ]);
  return [gasPrice, gas] as number[];
};

const getSignedTx = async (to, tx, sender, privateKey, gasPrice, value = 0) => {
  const data = tx.encodeABI();
  return web3.eth.accounts.signTransaction(
    {
      from: sender.address,
      to: to,
      value: web3.utils.toHex(value),
      gas: 16777215,
      data,
      gasPrice,
    },
    privateKey
  );
};

const pvtKey = process.env.BOT_PVT_KEY;

const getHarvesterFlags = async () => {
  return fetch('https://yeeldx.github.io/data/harvester.json', {
    method: 'GET'
  }).then((response)=> response.json())
}

async function main() {
  const chainId = await web3.eth.getChainId();
  log(`You are using the '${chainId}' network`);

  const bot = web3.eth.accounts.privateKeyToAccount(pvtKey);

  log(`You are using: 'bot' [${bot.address}]`,'harvestor-logs.log');

  let strategies = getStrategies(strategyAddresses);
  /*// TODO: Allow adding/removing strategies during operation
    while ((await input("Add another strategy? (y/[N]): ")).toLowerCase() === "y") {
        strategies.push(new StrategyAPI(await get_address("Strategy to farm: ")))
    }*/

  const vault = new web3.eth.Contract(
    VaultABI,
    await strategies[0].methods.vault().call()
  );
  const want = new web3.eth.Contract(
    TokenABI,
    await vault.methods.token().call()
  );

  for (const strategy of strategies) {
    let keeper = await strategy.methods.keeper().call();
    let vaultAddress = await strategy.methods.vault().call();

    log("keeper : " + keeper);
    if (keeper !== bot.address) {
      throw new Error(`Bot is not set as keeper! [${strategy.address}]`);
    }

    if (vaultAddress !== vault.options.address) {
      throw new Error(`Vault mismatch! [${strategy.address}]`);
    }
  }

  const harvesterFlags = await getHarvesterFlags();
  const isHarvestEnabled: boolean = harvesterFlags.harvest;
  log("is Harvest enabled: " + isHarvestEnabled)

  if (isHarvestEnabled) {
    const starting_balance = await web3.eth.getBalance(bot.address);

    let calls_made = 0;
    let total_gas_estimate = 0;
    let starting_gas_price = 0;
    for (const strategy of strategies) {
      // Display some relevant statistics
      const strategyInstance = strategy.methods;
      const vaultInstance = vault.methods;
      const vaultDecimals = await vaultInstance.decimals().call();

      const symbol = await want.methods.symbol().call();
      const credit =
        (await vaultInstance.creditAvailable(strategy.options.address).call()) /
        10 ** vaultDecimals;
      log(
        `[${strategy.options.address}] Credit Available: ${credit.toFixed(
          6
        )} ${symbol}`
      );
      const debt =
        (await vaultInstance.debtOutstanding(strategy.options.address).call()) /
        10 ** vaultDecimals;
      log(
        `[${strategy.options.address}] Debt Outstanding: ${debt.toFixed(
          6
        )} ${symbol}`
      );

      log("***** Estimating Tend ******");

      starting_gas_price = await web3.eth.getGasPrice();
      log("starting_gas_price: "+ starting_gas_price);

      let tend_gas_estimate;
      try {
        const [gasPrice] = await estimateGas(
          strategyInstance.tend(),
          bot.address
        );
        log("tend gasPrice: "+ gasPrice);
        tend_gas_estimate = Math.floor(GAS_BUFFER * gasPrice);
        total_gas_estimate += tend_gas_estimate;

        log("tend_gas_estimate: "+ tend_gas_estimate);
        log("total_gas_estimate: "+ total_gas_estimate);
      } catch (err) {
        log(
          `[${strategy.options.address}] \`tend\` estimate fails : ${err}`
        );
      }

      log("***** Estimating Harvest ******");

      let harvest_gas_estimate: number = 0;
      try {
        const [gasPrice] = await estimateGas(
          strategyInstance.harvest(),
          bot.address
        );
        log("harvest gasPrice: "+ gasPrice);
        harvest_gas_estimate = GAS_BUFFER * gasPrice;
        total_gas_estimate += harvest_gas_estimate;

        log("harvest_gas_estimate: "+ harvest_gas_estimate);
        log("total_gas_estimate: "+ total_gas_estimate);
      } catch (err) {
        log(
          `[${strategy.options.address}] \`harvest\` estimate fails : ${err}`
        );
      }

      const harvestCallCost = harvest_gas_estimate * starting_gas_price;
      log("harvestCallCost "+ harvestCallCost);
      let harvestTrigger = await strategyInstance
        .harvestTrigger(harvestCallCost.toString())
        .call();
      log("harvestTrigger: "+ harvestTrigger);

      const tendCallCost = tend_gas_estimate * starting_gas_price;
      const tendTrigger = await strategyInstance
        .tendTrigger(tendCallCost.toString())
        .call();
      if (harvest_gas_estimate > 0 && harvestTrigger) {
        try {
          let the_tx = await getSignedTx(
            strategy.options.address,
            strategyInstance.harvest(),
            bot,
            pvtKey,
            starting_gas_price
          );
          await web3.eth.sendSignedTransaction(the_tx.rawTransaction);
          calls_made += 1;

          log(" Harvest Triggered ");
        } catch (err) {
          log(
            `[${strategy.options.address}] \`harvest\` call fails ${err}`
          );
        }
      } else if (tend_gas_estimate && tendTrigger) {
        try {
          let the_tx = await getSignedTx(
            strategy.options.address,
            strategyInstance.tend(),
            bot,
            pvtKey,
            starting_gas_price
          );
          await web3.eth.sendSignedTransaction(the_tx.rawTransaction);
          calls_made += 1;

          log(" Tend Triggered ");
        } catch (err) {
          log(
            `[${strategy.options.address}] \`tend\` call fails ${err}`
          );
        }
      }
    }

    // Check running 10 `tend`s & `harvest`s per strategy at estimated gas price
    // would empty the balance of the bot account
    let botBalance = await web3.eth.getBalance(bot.address);
    if (botBalance < 10 * total_gas_estimate * starting_gas_price) {
      log(`Need more ether please! ${bot.address}`);
    }

    // Wait a minute if we didn't make any calls
    if (calls_made > 0) {
      const gas_cost = (starting_balance - botBalance) / 10 ** 18;

      const num_harvests = Math.floor(
        botBalance / (starting_balance - botBalance)
      );
      log(
        `Made ${calls_made} calls, spent ${gas_cost.toFixed(18)} ETH on gas.`
      );
      log(
        `At this rate, it'll take ${num_harvests} harvests to run out of gas.`
      );

      log("\n");
    } else {
      log("We didn't make any calls");
      log("\n");

    }
  }
}

/** Runs ???At minute 0 past every 6th hour.???
 * (06:00:00,12:00:00, 18:00:00)
 */
cron.schedule("0 */6 * * *", () => {
  log("Harvestor process started");
  main();
});
