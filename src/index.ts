import {
  createClient,
  http,
  Chain,
  Hex,
  publicActions,
  PublicClient,
  walletActions,
  Account,
} from "viem";
import {
  decryptNodeResponseWithPublicKey,
  encryptDataFieldWithPublicKey,
  getNodePublicKey,
} from "@swisstronik/utils";

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

export const createSwisstronikClient = (parameters: {
  chain: Chain;
  account?: Account
}): PublicClient<any> &
  ReturnType<typeof publicActions> &
  ReturnType<typeof walletActions> & {
    getNodePublicKey: () => Promise<Hex>;
  } => {
  const client = createClient({
    chain: parameters.chain,
    account: parameters.account,
    name: "Swisstronik Client",
    type: "swisstronikClient",
    transport: http(),
  } as any) as PublicClient<any>;

  client.request = async (args, options) => {
    const param = (args?.params as any)?.[0];
    // console.log("args.method:", args.method);
    // console.log("param:", param);

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

  return client
    .extend(publicActions)
    .extend(walletActions)
    .extend((client) => ({
      async getNodePublicKey() {
        return (await getNodePublicKey(client.chain!.rpcUrls.default.http[0]))
          .publicKey as Hex;
      },
    }));
};
