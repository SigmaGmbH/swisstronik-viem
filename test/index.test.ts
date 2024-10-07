import {
  createSwisstronikClient,
  type SwisstronikClient,
  swisstronikTestnet,
} from "../src";
import { abi } from "./ERC20ABI";
import { decodeAbiParameters, encodeFunctionData } from "viem";

describe("createSwisstronikClient Tests", () => {
  let swisstronikClient: SwisstronikClient;

  //0x9a3247611b86ed89cc6c1cde251fcc29fd5624e93087968eb6d7be36c420a70a
  it("should create a Swisstronik client", async () => {
    swisstronikClient = createSwisstronikClient(swisstronikTestnet);
    expect(swisstronikClient).toBeDefined();
  });

  it("should call swisstronikClient to request node public key", async () => {
    const resp = await swisstronikClient.getNodePublicKey();
    expect(resp).toBeDefined();
  });

  it("should create a Swisstronik client", async () => {
    const res = await swisstronikClient.call({
      account: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      to: "0xF8bEB8c8Be514772097103e39C2ccE057117CC92",
      data: "0x61bc221a",
    });

    expect(res).toEqual(
      "0x000000000000000000000000000000000000000000000000000000000000050b"
    );
    console.log(res);
  }, 20000);
});
