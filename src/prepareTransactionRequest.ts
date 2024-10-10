import { parseAccount, 
  type Account 
} from "viem/accounts";
import {
  getBlock as getBlock_,
  estimateFeesPerGas,
  getTransactionCount,
  getChainId as getChainId_,
} from "viem/actions";
import {
  assertRequest,
  blobsToCommitments,
  Eip1559FeesNotSupportedError,
  MaxFeePerGasTooLowError,
  blobsToProofs,
  commitmentsToVersionedHashes,
  toBlobSidecars,
  getTransactionType,
  type PrepareTransactionRequestParameters,
  type PrepareTransactionRequestReturnType,
  type Chain,
  type Block,
} from "viem";
// import type { TransactionSerializable } from "viem/types/transaction.js";
import { getAction } from "viem/utils";
import { SwisstronikClient } from "./index.js";
import { encryptDataFieldWithPublicKey } from "@swisstronik/utils";
import { estimateGas } from "./estimateGas";

const defaultParameters = [
  "blobVersionedHashes",
  "chainId",
  "fees",
  "gas",
  "nonce",
  "type",
] as const;

export async function prepareTransactionRequest<
  chain extends Chain | undefined,
  account extends Account | undefined
>(
  client: SwisstronikClient,
  args: PrepareTransactionRequestParameters
): Promise<PrepareTransactionRequestReturnType> {
  const {
    account: account_ = client.account,
    blobs,
    chain,
    gas,
    kzg,
    nonce,
    nonceManager,
    parameters = defaultParameters,
    type,
  } = args;
  const account = account_ ? parseAccount(account_ as any) : undefined;

  const request = { ...args, ...(account ? { from: account?.address } : {}) };

  const unencryptedData = args.data;

  if (request.to && request.data) {
    const publicKey = await client.getNodePublicKey();
    const [encryptedData] = encryptDataFieldWithPublicKey(
      publicKey!,
      request.data
    );

    request.data = encryptedData as `0x${string}`;
  }

  let block: Block | undefined;
  async function getBlock(): Promise<Block> {
    if (block) return block;
    block = await getAction(
      client,
      getBlock_,
      "getBlock"
    )({ blockTag: "latest" });
    return block;
  }

  let chainId: number | undefined;
  async function getChainId(): Promise<number> {
    if (chainId) return chainId;
    if (chain) return chain.id;
    if (typeof args.chainId !== "undefined") return args.chainId;
    const chainId_ = await getAction(
      client as any,
      getChainId_,
      "getChainId"
    )({});
    chainId = chainId_;
    return chainId;
  }

  if (
    (parameters.includes("blobVersionedHashes") ||
      parameters.includes("sidecars")) &&
    blobs &&
    kzg
  ) {
    const commitments = blobsToCommitments({ blobs, kzg });

    if (parameters.includes("blobVersionedHashes")) {
      const versionedHashes = commitmentsToVersionedHashes({
        commitments,
        to: "hex",
      });
      request.blobVersionedHashes = versionedHashes;
    }
    if (parameters.includes("sidecars")) {
      const proofs = blobsToProofs({ blobs, commitments, kzg });
      const sidecars = toBlobSidecars({
        blobs,
        commitments,
        proofs,
        to: "hex",
      });
      request.sidecars = sidecars;
    }
  }

  if (parameters.includes("chainId")) request.chainId = await getChainId();

  if (parameters.includes("nonce") && typeof nonce === "undefined" && account) {
    if (nonceManager) {
      const chainId = await getChainId();
      request.nonce = await nonceManager.consume({
        address: account.address,
        chainId,
        client,
      } as any);
    } else {
      request.nonce = await getAction(
        client as any,
        getTransactionCount,
        "getTransactionCount"
      )({
        address: account.address,
        blockTag: "pending",
      });
    }
  }

  if (
    (parameters.includes("fees") || parameters.includes("type")) &&
    typeof type === "undefined"
  ) {
    try {
      request.type = getTransactionType(
        request
      );
    } catch {
      // infer type from block
      const block = await getBlock();
      request.type =
        typeof block?.baseFeePerGas === "bigint" ? "eip1559" : "legacy";
    }
  }

  if (parameters.includes("fees")) {
    // TODO(4844): derive blob base fees once https://github.com/ethereum/execution-apis/pull/486 is merged.

    if (request.type !== "legacy" && request.type !== "eip2930") {
      // EIP-1559 fees
      if (
        typeof request.maxFeePerGas === "undefined" ||
        typeof request.maxPriorityFeePerGas === "undefined"
      ) {
        const block = await getBlock();
        const { maxFeePerGas, maxPriorityFeePerGas } = await estimateFeesPerGas(
          client,
          {
            block: block as Block,
            chain,
            request: request as PrepareTransactionRequestParameters,
          } as any
        );

        if (
          typeof args.maxPriorityFeePerGas === "undefined" &&
          args.maxFeePerGas &&
          args.maxFeePerGas < maxPriorityFeePerGas
        )
          throw new MaxFeePerGasTooLowError({
            maxPriorityFeePerGas,
          });

        request.maxPriorityFeePerGas = maxPriorityFeePerGas;
        request.maxFeePerGas = maxFeePerGas;
      }
    } else {
      // Legacy fees
      if (
        typeof args.maxFeePerGas !== "undefined" ||
        typeof args.maxPriorityFeePerGas !== "undefined"
      )
        throw new Eip1559FeesNotSupportedError();

      const block = await getBlock();
      const { gasPrice: gasPrice_ } = await estimateFeesPerGas(
        client,
        {
          block: block as Block,
          chain,
          request: request as PrepareTransactionRequestParameters,
          type: "legacy",
        } as any
      );
      request.gasPrice = gasPrice_;
    }
  }

  if (parameters.includes("gas") && typeof gas === "undefined")
    request.gas = await getAction(
      client,
      estimateGas,
      "estimateGas"
    )({
      ...request,
      data: unencryptedData,
      account: account
        ? { address: account.address, type: "json-rpc" }
        : undefined,
    });

  assertRequest(request);

  delete request.parameters;

  return request as any;
}
