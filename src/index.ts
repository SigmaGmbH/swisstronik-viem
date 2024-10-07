import {
  createClient,
  http,
  formatTransactionRequest,
  type CallParameters,
  createPublicClient,
  Chain,
  Hex,
  publicActions,
} from "viem";
import { mainnet } from "viem/chains";
import {
  decryptNodeResponseWithPublicKey,
  encryptDataFieldWithPublicKey,
  getNodePublicKey,
} from "@swisstronik/utils";
import { call, estimateGas } from "viem/actions";

export const swisstronikTestnet: Chain = {
  id: 1291,
  name: "Swisstronik Testnet",
  testnet: true,
  nativeCurrency: {
    name: "SWTR",
    symbol: "SWTR",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://json-rpc.testnet.swisstronik.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Swisstronik Explorer",
      url: "https://explorer-evm.testnet.swisstronik.com",
    },
  },
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type SwisstronikClient = Prettify<
  ReturnType<typeof createSwisstronikClient>
>;

export const createSwisstronikClient = (chain: Chain) =>
  createClient({
    chain,
    name: "Swisstronik Client",
    type: "swisstronikClient",
    transport: http(),
  })
    .extend(publicActions)
    .extend((client) => ({
      async getNodePublicKey() {
        return (await getNodePublicKey(chain.rpcUrls.default.http[0]))
          .publicKey! as Hex;
      },
      async call(args) {
        if (!args.data || !args.to) return call(client, args);

        const publicKey = await this.getNodePublicKey();

        const [encryptedData, encryptionKey] = encryptDataFieldWithPublicKey(
          publicKey,
          args.data!
        );

        args.data = encryptedData as Hex;

        const { data: encryptedRes } = await call(client, args);

        const decryptedRes = decryptNodeResponseWithPublicKey(
          publicKey,
          encryptedRes!,
          encryptionKey
        );

        return {
          data: ("0x" + Buffer.from(decryptedRes).toString("hex")) as Hex,
        };
      },

      async estimateGas(args) {
        if (!args.data || !args.to) return estimateGas(client, args);

        const publicKey = await this.getNodePublicKey();

        const [encryptedData, encryptionKey] = encryptDataFieldWithPublicKey(
          publicKey,
          args.data!
        );

        args.data = encryptedData as Hex;

        const encryptedRes = await estimateGas(client, args);

        return encryptedRes;
      }
    }));

// const publicClient = createPublicClient({
//   chain: mainnet,
//   transport: http(),
// });
