import {
  createClient,
  http,
  Chain,
  Hex,
  publicActions,
  walletActions,
  Account,
  WalletActions,
  PublicActions,
  Client,
  Transport,
} from "viem";
import {
  decryptNodeResponseWithPublicKey,
  encryptDataFieldWithPublicKey,
  getNodePublicKey,
} from "@swisstronik/utils";
import { prepareTransactionRequest } from "./prepareTransactionRequest";

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

export type SwisstronikLightWeightClient = Prettify<
  Client<Transport, Chain, Account> & {
    getNodePublicKey: () => Promise<Hex>;
  }
>;

export type SwisstronikClient = Prettify<
  Client<Transport, Chain, Account> &
    PublicActions &
    WalletActions<Chain, Account> & {
      getNodePublicKey: () => Promise<Hex>;
    }
>;

/**
 *You can use the Client as-is, with no decorated Actions, to maximize tree-shaking in your app.
 * This is useful if you are pedantic about bundle size and want to only include the Actions you use.
 */
export const createLightWeightClient = (parameters: {
  chain: Chain;
  account?: Account;
  name?: string;
  type?: string;
}): SwisstronikLightWeightClient => {
  const client = createClient({
    chain: parameters.chain,
    account: parameters.account,
    name: parameters.name || "Swisstronik Light Weight Client",
    type: parameters.type || "SwisstronikLightWeightClient",
    transport: http(),
  } as any) as Client<any>;

  client.request = async (args, options) => {
    const param = (args?.params as any)?.[0];

    if (
      ["eth_call", "eth_estimateGas", "eth_sendTransaction"].includes(
        args.method
      ) &&
      param?.to &&
      param?.data
    ) {
      const { publicKey } = await getNodePublicKey(
        parameters.chain.rpcUrls.default.http[0]
      );

      const [encryptedData, encryptionKey] = encryptDataFieldWithPublicKey(
        publicKey!,
        param.data
      );

      param.data = encryptedData as Hex;

      const res: string = await client.transport.request(args, options);

      if (args.method !== "eth_call") return res;

      const decryptedRes = decryptNodeResponseWithPublicKey(
        publicKey!,
        res,
        encryptionKey
      );

      return ("0x" + Buffer.from(decryptedRes).toString("hex")) as Hex;
    }

    return client.transport.request(args as any, options);
  };

  (client as SwisstronikClient).prepareTransactionRequest = async (args: any) =>
    prepareTransactionRequest(client as any, args) as any;

  (client as SwisstronikClient).getNodePublicKey = async () =>
    (await getNodePublicKey(client.chain!.rpcUrls.default.http[0]))
      .publicKey as Hex;

  return client as any;
};

/**
 * Client with decorated Actions, which includes all the Actions available in the library.
 */
export const createSwisstronikClient = (parameters: {
  chain: Chain;
  account?: Account;
  name?: string;
  type?: string;
}): SwisstronikClient => {
  const client = createLightWeightClient({
    chain: parameters.chain,
    account: parameters.account,
    name: parameters.name || "Swisstronik Client",
    type: parameters.type || "swisstronikClient",
    transport: http(),
  } as any) as Client<any>;

  return client.extend(publicActions).extend(walletActions) as any;
};
