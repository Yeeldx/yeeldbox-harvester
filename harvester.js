var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var StrategyABI = require("./abi/Strategy.json");
var VaultABI = require("./abi/Vault.json");
var TokenABI = require("./abi/Token.json");
var cron = require("node-cron");
var dotenv = require("dotenv");
dotenv.config();
var Web3 = require("web3");
var provider = new Web3.providers.WebsocketProvider(process.env.WSS_RPC_URL);
var web3 = new Web3(provider);
var GAS_BUFFER = 1.2;
var strategyAddresses = [
    "0xc4d80C55dc12FF0f2b8680eC31A6ADC4cbC8Dfca",
];
var sleep = function (ms) { return new Promise(function (r) { return setTimeout(r, ms); }); };
var getStrategies = function (strategyAddresses) {
    var strategies = [];
    strategyAddresses.forEach(function (address) {
        var strata = new web3.eth.Contract(StrategyABI, address);
        strategies.push(strata);
    });
    return strategies;
};
var estimateGas = function (tx, senderAddress) { return __awaiter(_this, void 0, void 0, function () {
    var _a, gasPrice, gas;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, Promise.all([
                    web3.eth.getGasPrice(),
                    tx.estimateGas({ from: senderAddress }),
                ])];
            case 1:
                _a = _b.sent(), gasPrice = _a[0], gas = _a[1];
                return [2 /*return*/, [gasPrice, gas]];
        }
    });
}); };
var getSignedTx = function (to, tx, sender, privateKey, gasPrice, value) {
    if (value === void 0) { value = 0; }
    return __awaiter(_this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            data = tx.encodeABI();
            return [2 /*return*/, web3.eth.accounts.signTransaction({
                    from: sender.address,
                    to: to,
                    value: web3.utils.toHex(value),
                    gas: 16777215,
                    data: data,
                    gasPrice: gasPrice
                }, privateKey)];
        });
    });
};
var pvtKey = process.env.BOT_PVT_KEY;
var isHarvesting = process.env.HARVEST === "true";
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var chainId, bot, strategies, vault, _a, _b, _c, want, _d, _e, _f, _i, strategies_1, strategy, keeper, vaultAddress, starting_balance, calls_made, total_gas_estimate, starting_gas_price, _g, strategies_2, strategy, strategyInstance, vaultInstance, vaultDecimals, symbol, credit, debt, tend_gas_estimate, gasPrice, err_1, harvest_gas_estimate, gasPrice, err_2, harvestCallCost, harvestTrigger, tendCallCost, tendTrigger, the_tx, err_3, the_tx, err_4, botBalance, gas_cost, num_harvests;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, web3.eth.getChainId()];
                case 1:
                    chainId = _h.sent();
                    console.log("You are using the '".concat(chainId, "' network"));
                    bot = web3.eth.accounts.privateKeyToAccount(pvtKey);
                    console.log("You are using: 'bot' [".concat(bot.address, "]"));
                    strategies = getStrategies(strategyAddresses);
                    _b = (_a = web3.eth.Contract).bind;
                    _c = [void 0, VaultABI];
                    return [4 /*yield*/, strategies[0].methods.vault().call()];
                case 2:
                    vault = new (_b.apply(_a, _c.concat([_h.sent()])))();
                    _e = (_d = web3.eth.Contract).bind;
                    _f = [void 0, TokenABI];
                    return [4 /*yield*/, vault.methods.token().call()];
                case 3:
                    want = new (_e.apply(_d, _f.concat([_h.sent()])))();
                    _i = 0, strategies_1 = strategies;
                    _h.label = 4;
                case 4:
                    if (!(_i < strategies_1.length)) return [3 /*break*/, 8];
                    strategy = strategies_1[_i];
                    return [4 /*yield*/, strategy.methods.keeper().call()];
                case 5:
                    keeper = _h.sent();
                    return [4 /*yield*/, strategy.methods.vault().call()];
                case 6:
                    vaultAddress = _h.sent();
                    console.log("keeper : ", keeper);
                    if (keeper !== bot.address) {
                        throw new Error("Bot is not set as keeper! [".concat(strategy.address, "]"));
                    }
                    if (vaultAddress !== vault.options.address) {
                        throw new Error("Vault mismatch! [".concat(strategy.address, "]"));
                    }
                    _h.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 4];
                case 8:
                    if (!isHarvesting) return [3 /*break*/, 42];
                    return [4 /*yield*/, web3.eth.getBalance(bot.address)];
                case 9:
                    starting_balance = _h.sent();
                    calls_made = 0;
                    total_gas_estimate = 0;
                    starting_gas_price = 0;
                    _g = 0, strategies_2 = strategies;
                    _h.label = 10;
                case 10:
                    if (!(_g < strategies_2.length)) return [3 /*break*/, 37];
                    strategy = strategies_2[_g];
                    strategyInstance = strategy.methods;
                    vaultInstance = vault.methods;
                    return [4 /*yield*/, vaultInstance.decimals().call()];
                case 11:
                    vaultDecimals = _h.sent();
                    return [4 /*yield*/, want.methods.symbol().call()];
                case 12:
                    symbol = _h.sent();
                    return [4 /*yield*/, vaultInstance.creditAvailable(strategy.options.address).call()];
                case 13:
                    credit = (_h.sent()) /
                        Math.pow(10, vaultDecimals);
                    console.log("[".concat(strategy.options.address, "] Credit Available: ").concat(credit.toFixed(6), " ").concat(symbol));
                    return [4 /*yield*/, vaultInstance.debtOutstanding(strategy.options.address).call()];
                case 14:
                    debt = (_h.sent()) /
                        Math.pow(10, vaultDecimals);
                    console.log("[".concat(strategy.options.address, "] Debt Outstanding: ").concat(debt.toFixed(6), " ").concat(symbol));
                    console.log("***** Estimating Tend ******");
                    return [4 /*yield*/, web3.eth.getGasPrice()];
                case 15:
                    starting_gas_price = _h.sent();
                    console.log("starting_gas_price: ", starting_gas_price);
                    tend_gas_estimate = void 0;
                    _h.label = 16;
                case 16:
                    _h.trys.push([16, 18, , 19]);
                    return [4 /*yield*/, estimateGas(strategyInstance.tend(), bot.address)];
                case 17:
                    gasPrice = (_h.sent())[0];
                    console.log("tend gasPrice: ", gasPrice);
                    tend_gas_estimate = Math.floor(GAS_BUFFER * gasPrice);
                    total_gas_estimate += tend_gas_estimate;
                    console.log("tend_gas_estimate: ", tend_gas_estimate);
                    console.log("total_gas_estimate: ", total_gas_estimate);
                    return [3 /*break*/, 19];
                case 18:
                    err_1 = _h.sent();
                    console.log("[".concat(strategy.options.address, "] `tend` estimate fails : ").concat(err_1));
                    return [3 /*break*/, 19];
                case 19:
                    console.log("***** Estimating Harvest ******");
                    harvest_gas_estimate = 0;
                    _h.label = 20;
                case 20:
                    _h.trys.push([20, 22, , 23]);
                    return [4 /*yield*/, estimateGas(strategyInstance.harvest(), bot.address)];
                case 21:
                    gasPrice = (_h.sent())[0];
                    console.log("harvest gasPrice: ", gasPrice);
                    harvest_gas_estimate = GAS_BUFFER * gasPrice;
                    total_gas_estimate += harvest_gas_estimate;
                    console.log("harvest_gas_estimate: ", harvest_gas_estimate);
                    console.log("total_gas_estimate: ", total_gas_estimate);
                    return [3 /*break*/, 23];
                case 22:
                    err_2 = _h.sent();
                    console.log("[".concat(strategy.options.address, "] `harvest` estimate fails : ").concat(err_2));
                    return [3 /*break*/, 23];
                case 23:
                    harvestCallCost = harvest_gas_estimate * starting_gas_price;
                    console.log("harvestCallCost ", harvestCallCost);
                    return [4 /*yield*/, strategyInstance
                            .harvestTrigger(harvestCallCost.toString())
                            .call()];
                case 24:
                    harvestTrigger = _h.sent();
                    console.log("harvestTrigger: ", harvestTrigger);
                    tendCallCost = tend_gas_estimate * starting_gas_price;
                    return [4 /*yield*/, strategyInstance
                            .tendTrigger(tendCallCost.toString())
                            .call()];
                case 25:
                    tendTrigger = _h.sent();
                    if (!(harvest_gas_estimate > 0 && harvestTrigger)) return [3 /*break*/, 31];
                    _h.label = 26;
                case 26:
                    _h.trys.push([26, 29, , 30]);
                    return [4 /*yield*/, getSignedTx(strategy.options.address, strategyInstance.harvest(), bot, pvtKey, starting_gas_price)];
                case 27:
                    the_tx = _h.sent();
                    return [4 /*yield*/, web3.eth.sendSignedTransaction(the_tx.rawTransaction)];
                case 28:
                    _h.sent();
                    calls_made += 1;
                    console.log(" Harvest Triggered ");
                    return [3 /*break*/, 30];
                case 29:
                    err_3 = _h.sent();
                    console.log("[".concat(strategy.options.address, "] `harvest` call fails ").concat(err_3));
                    return [3 /*break*/, 30];
                case 30: return [3 /*break*/, 36];
                case 31:
                    if (!(tend_gas_estimate && tendTrigger)) return [3 /*break*/, 36];
                    _h.label = 32;
                case 32:
                    _h.trys.push([32, 35, , 36]);
                    return [4 /*yield*/, getSignedTx(strategy.options.address, strategyInstance.tend(), bot, pvtKey, starting_gas_price)];
                case 33:
                    the_tx = _h.sent();
                    return [4 /*yield*/, web3.eth.sendSignedTransaction(the_tx.rawTransaction)];
                case 34:
                    _h.sent();
                    calls_made += 1;
                    console.log(" Tend Triggered ");
                    return [3 /*break*/, 36];
                case 35:
                    err_4 = _h.sent();
                    console.log("[".concat(strategy.options.address, "] `tend` call fails ").concat(err_4));
                    return [3 /*break*/, 36];
                case 36:
                    _g++;
                    return [3 /*break*/, 10];
                case 37: return [4 /*yield*/, web3.eth.getBalance(bot.address)];
                case 38:
                    botBalance = _h.sent();
                    if (botBalance < 10 * total_gas_estimate * starting_gas_price) {
                        console.log("Need more ether please! ".concat(bot.address));
                    }
                    if (!(calls_made > 0)) return [3 /*break*/, 39];
                    gas_cost = (starting_balance - botBalance) / Math.pow(10, 18);
                    num_harvests = Math.floor(botBalance / (starting_balance - botBalance));
                    console.log("Made ".concat(calls_made, " calls, spent ").concat(gas_cost.toFixed(18), " ETH on gas."));
                    console.log("At this rate, it'll take ".concat(num_harvests, " harvests to run out of gas."));
                    console.log("\n");
                    return [3 /*break*/, 41];
                case 39:
                    console.log("Sleeping for 60 seconds...");
                    console.log("\n");
                    return [4 /*yield*/, sleep(60)];
                case 40:
                    _h.sent();
                    _h.label = 41;
                case 41: return [3 /*break*/, 8];
                case 42: return [2 /*return*/];
            }
        });
    });
}
/** Runs “At minute 59 past every 12th hour.”
 * (00:59:00,12:59:00, 00:59:00)
 */
cron.schedule("59 */12 * * *", function () {
    main();
});
