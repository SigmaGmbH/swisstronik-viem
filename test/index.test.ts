import {
  call,
  estimateGas,
  readContract,
  waitForTransactionReceipt,
} from "viem/actions";
import {
  createSwisstronikClient,
  type SwisstronikClient,
  swisstronikTestnet,
} from "../src";
import { abi } from "./ERC20ABI";
import { createWalletClient, parseEther, PrivateKeyAccount } from "viem";
import { privateKeyToAccount } from "viem/accounts";

describe("createSwisstronikClient Tests", () => {
  let swisstronikClient: SwisstronikClient;
  let account: PrivateKeyAccount;

  it("Should create a Swisstronik client", async () => {
    //NEVER SHARE YOUR PRIVATE KEYS
    account = privateKeyToAccount(
      "0x9a3247611b86ed89cc6c1cde251fcc29fd5624e93087968eb6d7be36c420a70a"
    );

    swisstronikClient = createSwisstronikClient({
      chain: swisstronikTestnet,
      account, // Optional: Needed to send/sign transactions
    });
    expect(swisstronikClient).toBeDefined();
  });

  it("should call swisstronikClient to request node public key", async () => {
    const resp = await swisstronikClient.getNodePublicKey();
    expect(resp).toBeDefined();
  });

  it("Should fetch block number", async () => {
    const blockNumber = await swisstronikClient.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0n);
  });

  it("Should fetch balance", async () => {
    const balance = await swisstronikClient.getBalance({
      address: account.address,
    });
    expect(balance).toBeGreaterThanOrEqual(0n);
  });

  describe("Call contract on testnet with encrypted data", () => {
    it("SwisstronikClient method", async () => {
      const res = await swisstronikClient.call({
        account: account.address,
        to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
        data: "0x61bc221a",
      });

      expect(res.data).toEqual(
        "0x000000000000000000000000000000000000000000000000000000000000050b"
      );
    });

    it("SwisstronikClient as input parameter", async () => {
      const res = await call(swisstronikClient, {
        account: account.address,
        to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
        data: "0x61bc221a",
      });

      expect(res.data).toEqual(
        "0x000000000000000000000000000000000000000000000000000000000000050b"
      );
    });
  });

  describe("Estimate gas for tx on testnet with encrypted data", () => {
    it("SwisstronikClient method", async () => {
      const res = await swisstronikClient.estimateGas({
        account: account.address,
        to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
        data: "0x61bc221a",
      });

      expect(res).toEqual(23325n);
    });

    it("SwisstronikClient as input parameter", async () => {
      const res = await estimateGas(swisstronikClient, {
        account: account.address,
        to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
        data: "0x61bc221a",
      });

      expect(res).toEqual(23325n);
    });
  });

  describe("Send tx on testnet with encrypted data", () => {
    it("SwisstronikClient method", async () => {
      const hash = await swisstronikClient.sendTransaction({
        to: "0x0497cc339c0397b7Addd591B2160dd2f5371eA3b",
        value: parseEther("0.001"),
      } as any);

      const receipt = await waitForTransactionReceipt(swisstronikClient, {
        hash,
      });

      expect(hash).toBeDefined();
      expect(receipt.status).toEqual("success");
    });
  });

  describe("Should fetch ERC20 balanceOf", () => {
    const ERC20_CONTRACT_ADDRESS = "0x22B01aa7E98dF5dF7C034689A300c6E06cc89Cb3";

    it("SwisstronikClient method", async () => {
      const balanceOf = (await swisstronikClient.readContract({
        address: ERC20_CONTRACT_ADDRESS,
        abi,
        functionName: "balanceOf",
        args: [account.address],
      })) as bigint;

      expect(balanceOf).toBeGreaterThanOrEqual(0n);
    });

    it("SwisstronikClient as input parameter", async () => {
      const balanceOf = (await readContract(swisstronikClient, {
        address: ERC20_CONTRACT_ADDRESS,
        abi,
        functionName: "balanceOf",
        args: [account.address],
      })) as bigint;

      expect(balanceOf).toBeGreaterThanOrEqual(0n);
    });
  });

  describe("Should mint ERC20", () => {
    const ERC20_CONTRACT_ADDRESS = "0x22B01aa7E98dF5dF7C034689A300c6E06cc89Cb3";

    it("SwisstronikClient method", async () => {
      const hash = await swisstronikClient.writeContract({
        address: ERC20_CONTRACT_ADDRESS,
        abi,
        functionName: "mint100tokens",
        args: [],
      } as any);

      const receipt = await waitForTransactionReceipt(swisstronikClient, {
        hash,
      });

      console.log("Transaction receipt:", receipt);

      expect(hash).toBeDefined();
      expect(receipt.status).toEqual("success");
    });
  });

  describe("Should transfer ERC20", () => {
    const ERC20_CONTRACT_ADDRESS = "0x22B01aa7E98dF5dF7C034689A300c6E06cc89Cb3";

    it("SwisstronikClient method", async () => {
      const hash = await swisstronikClient.writeContract({
        address: ERC20_CONTRACT_ADDRESS,
        abi,
        functionName: "transfer",
        args: [account.address, 5n],
      } as any);

      const receipt = await waitForTransactionReceipt(swisstronikClient, {
        hash,
      });

      expect(hash).toBeDefined();
      expect(receipt.status).toEqual("success");
    });
  });
});
