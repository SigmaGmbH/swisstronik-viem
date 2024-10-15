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
import { parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createSwisstronikLightWeightClient,
  swisstronikTestnet,
} from "../src/index";
import { abi } from "./ERC20ABI";

describe("createSwisstronikLightWeightClient Tests", () => {
  //NEVER SHARE YOUR PRIVATE KEYS
  const account = privateKeyToAccount(
    "0x9a3247611b86ed89cc6c1cde251fcc29fd5624e93087968eb6d7be36c420a70a"
  );

  const swisstronikClient = createSwisstronikLightWeightClient({
    chain: swisstronikTestnet,
    account, // Optional: Needed to send/sign transactions
  });

  it("Should create a Swisstronik client", async () => {
    expect(swisstronikClient).toBeDefined();
  });

  it("should call swisstronikClient to request node public key", async () => {
    const resp = await swisstronikClient.getNodePublicKey();
    expect(resp).toBeDefined();
  });

  it("Should fetch block number", async () => {
    const blockNumber = await getBlockNumber(swisstronikClient);
    expect(blockNumber).toBeGreaterThan(0n);
  });

  it("Should fetch balance", async () => {
    const balance = await getBalance(swisstronikClient, {
      address: account.address,
    });
    expect(balance).toBeGreaterThanOrEqual(0n);
  });

  it("Call contract on testnet with encrypted data", async () => {
    const res = await call(swisstronikClient, {
      account: account.address,
      to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
      data: "0x61bc221a",
    });

    expect(res.data).toEqual(
      "0x000000000000000000000000000000000000000000000000000000000000050b"
    );
  });

  it("Estimate gas for tx on testnet with encrypted data", async () => {
    const res = await estimateGas(swisstronikClient, {
      account: account.address,
      to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
      data: "0x61bc221a",
    });

    expect(res).toEqual(23325n);
  });

  it("Send tx on testnet with encrypted data", async () => {
    const hash = await sendTransaction(swisstronikClient, {
      to: "0x0497cc339c0397b7Addd591B2160dd2f5371eA3b",
      value: parseEther("0.001"),
    });

    const receipt = await waitForTransactionReceipt(swisstronikClient, {
      hash,
    });

    expect(hash).toBeDefined();
    expect(receipt.status).toEqual("success");
  });

  it("Should fetch ERC20 balanceOf", async () => {
    const ERC20_CONTRACT_ADDRESS = "0x22B01aa7E98dF5dF7C034689A300c6E06cc89Cb3";

    const balanceOf = (await readContract(swisstronikClient, {
      address: ERC20_CONTRACT_ADDRESS,
      abi,
      functionName: "balanceOf",
      args: [account.address],
    })) as bigint;

    expect(balanceOf).toBeGreaterThanOrEqual(0n);
  });

  it("Should mint ERC20", async () => {
    const ERC20_CONTRACT_ADDRESS = "0x22B01aa7E98dF5dF7C034689A300c6E06cc89Cb3";

    const hash = await writeContract(swisstronikClient, {
      address: ERC20_CONTRACT_ADDRESS,
      abi,
      functionName: "mint100tokens",
      args: [],
    });

    const receipt = await waitForTransactionReceipt(swisstronikClient, {
      hash,
    });

    expect(hash).toBeDefined();
    expect(receipt.status).toEqual("success");
  });

  it("Should transfer ERC20", async () => {
    const ERC20_CONTRACT_ADDRESS = "0x22B01aa7E98dF5dF7C034689A300c6E06cc89Cb3";

    const hash = await writeContract(swisstronikClient, {
      address: ERC20_CONTRACT_ADDRESS,
      abi,
      functionName: "transfer",
      args: [account.address, 5n],
    });

    const receipt = await waitForTransactionReceipt(swisstronikClient, {
      hash,
    });

    expect(hash).toBeDefined();
    expect(receipt.status).toEqual("success");
  });
});
