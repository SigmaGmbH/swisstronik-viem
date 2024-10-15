# Swisstronik Viem Client

Swisstronik Viem Client allows the users to use `viem` library with [Swisstronik](https://swisstronik.com)

### Supported methods:

- `eth_estimateGas`
- `eth_call`
- `eth_sendTransaction`
- Custom - `eth_getNodePublicKey`

## Installation

> Note: Make sure you are using `viem` version 2.21.19 or higher in your project.

```bash
npm install @swisstronik/viem-client@latest viem@latest --save
```

## Usage

```js
import { createSwisstronikClient, swisstronikTestnet } from "@swisstronik/viem-client";

// Client with decorated Actions, which includes all the Actions available in the library.
const swisstronikClient = createSwisstronikClient({
  chain: swisstronikTestnet,
});

// Get node public key
const nodePublicKey = await swisstronikClient.getNodePublicKey();
console.log(nodePublicKey);

// Get block number
const blockNumber = await swisstronikClient.getBlockNumber();
console.log(blockNumber);

// Get balance
const balance = await swisstronikClient.getBalance({
  address: "0x..",
});
console.log(balance);
```

### Sending transactions & performing calls

```js
import { createSwisstronikClient, swisstronikTestnet } from "@swisstronik/viem-client";
import { parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
// Client with decorated Actions, which includes all the Actions available in the library.
const swisstronikClient = createSwisstronikClient({
  chain: swisstronikTestnet,
  account, // Optional: Needed to send/sign transactions
});

const { data } = await swisstronikClient.call({
  account: account.address,
  to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
  data: "0x61bc221a",
});
console.log(data);

const gas = await swisstronikClient.estimateGas({
  account: account.address,
  to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
  data: "0x61bc221a",
});
console.log(gas);

const hash = await swisstronikClient.sendTransaction({
  to: "0x0497cc339c0397b7Addd591B2160dd2f5371eA3b",
  value: parseEther("0.001"),
});
console.log(hash);

const receipt = await swisstronikClient.waitForTransactionReceipt({
  hash,
});
console.log(receipt);
```

### Interacting with a Smart Contract

```js
import { createSwisstronikClient, swisstronikTestnet } from "@swisstronik/viem-client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
// Client with decorated Actions, which includes all the Actions available in the library.
const swisstronikClient = createSwisstronikClient({
  chain: swisstronikTestnet,
  account, // Optional: Needed to send/sign transactions
});

const balanceOf = await swisstronikClient.readContract({
  address: ERC20_CONTRACT_ADDRESS,
  abi,
  functionName: "balanceOf",
  args: [account.address],
});
console.log(balanceOf);

const hash = await swisstronikClient.writeContract({
  address: ERC20_CONTRACT_ADDRESS,
  abi,
  functionName: "transfer",
  args: [account.address, 5n],
});
console.log(hash);

const receipt = await swisstronikClient.waitForTransactionReceipt({
  hash,
});
console.log(receipt);
```

## Swisstronik Light Weight Client

You can use the Client as-is, with no decorated Actions, to maximize tree-shaking in your app. This is useful if you are concerned about bundle size and want to only include the Actions you use.

```js
import { createSwisstronikClient, swisstronikTestnet } from "@swisstronik/viem-client";
import { privateKeyToAccount } from "viem/accounts";
import {
  call,
  estimateGas,
  getBalance,
  getBlockNumber,
  readContract,
  sendTransaction,
  waitForTransactionReceipt,
  writeContract,
} from "viem/actions";

const account = privateKeyToAccount("0x...");

const swisstronikClient = createSwisstronikLightWeightClient({
  chain: swisstronikTestnet,
  account, // Optional: Needed to send/sign transactions
});

const blockNumber = await getBlockNumber(swisstronikClient);
console.log(blockNumber);

const balance = await getBalance(swisstronikClient, {
  address: account.address,
});
console.log(balance);

const hash = await sendTransaction(swisstronikClient, {
  to: "0x0497cc339c0397b7Addd591B2160dd2f5371eA3b",
  value: parseEther("0.001"),
});
console.log(hash);

const receipt = await waitForTransactionReceipt(swisstronikClient, {
  hash,
});
console.log(receipt);

const balanceOf = await readContract(swisstronikClient, {
  address: ERC20_CONTRACT_ADDRESS,
  abi,
  functionName: "balanceOf",
  args: [account.address],
});
console.log(balanceOf);

const hash = await writeContract(swisstronikClient, {
  address: ERC20_CONTRACT_ADDRESS,
  abi,
  functionName: "transfer",
  args: [account.address, 5n],
});
console.log(hash);
```

Refer to [Swisstronik Developer Docs](https://swisstronik.gitbook.io/swisstronik-docs/) for more information & usage scenarios.

### Publishing

To publish a new version of the package to npm, run the following command:

```bash
npm run build

npm publish
```

## Resources

- [Swisstronik Docs](https://swisstronik.gitbook.io/swisstronik-docs/)
- [Viem Documentation](https://viem.sh/)
- [Swisstronik Website](https://swisstronik.com)

## Safety

This is experimental software and subject to change over time.

This package is not audited and has not been tested for security. Use at your own risk.
I do not give any warranties and will not be liable for any loss incurred through any use of this codebase.


Contributing
------------

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

License
-------

[MIT](https://choosealicense.com/licenses/mit/)
