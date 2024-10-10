import type { Address } from 'abitype'
import type { Account } from "viem/accounts/types.js";
import { parseAccount, type ParseAccountErrorType, } from "viem/accounts";
import type { Client } from "viem/clients/createClient.js";
import type { Transport } from "viem/clients/transports/createTransport.js";
import { BaseError } from 'viem'
import {
  type RecoverAuthorizationAddressErrorType,
  recoverAuthorizationAddress,
} from 'viem/experimental'
import type { Chain } from "viem/types/chain.js";
import type { BlockTag, StateOverride } from 'viem'
import type { TransactionRequest } from 'viem'
import type { UnionOmit } from 'viem'
import type { RequestErrorType } from 'viem/utils'
import {
  type NumberToHexErrorType,
  numberToHex,
} from 'viem'
import {
  type GetEstimateGasErrorReturnType,
  getEstimateGasError,
} from 'viem/utils'
import { extract } from 'viem/utils'
import {
  type FormattedTransactionRequest,
  formatTransactionRequest,
} from 'viem/utils'
import {
  type PrepareTransactionRequestParameters,
  assertRequest
} from 'viem'
import { prepareTransactionRequest } from './prepareTransactionRequest';
import { getBalance } from 'viem/actions';
// import { serializeStateOverride } from 'viem/utils/stateOverride';

export type EstimateGasParameters<
  chain extends Chain | undefined = Chain | undefined,
> = UnionOmit<FormattedEstimateGas<chain>, 'from'> & {
  account?: Account | Address | undefined
  stateOverride?: StateOverride | undefined
} & (
    | {
        /** The balance of the account at a block number. */
        blockNumber?: bigint | undefined
        blockTag?: undefined
      }
    | {
        blockNumber?: undefined
        /**
         * The balance of the account at a block tag.
         * @default 'latest'
         */
        blockTag?: BlockTag | undefined
      }
  )
type FormattedEstimateGas<chain extends Chain | undefined = Chain | undefined> =
  FormattedTransactionRequest<any>

export type EstimateGasReturnType = bigint

export type EstimateGasErrorType = GetEstimateGasErrorReturnType<
  | ParseAccountErrorType
  | NumberToHexErrorType
  | RequestErrorType
  | RecoverAuthorizationAddressErrorType
>


export async function estimateGas<
  chain extends Chain | undefined,
  account extends Account | undefined = undefined,
>(
  client: Client<Transport, chain, account>,
  args: EstimateGasParameters<chain>,
): Promise<EstimateGasReturnType> {
  const account_ = args.account ?? client.account
  const account = account_ ? parseAccount(account_ as any) : undefined

  const unencryptedData = args.data;

  try {
    const {
      accessList,
      authorizationList,
      blobs,
      blobVersionedHashes,
      blockNumber,
      blockTag,
      gas,
      gasPrice,
      maxFeePerBlobGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      value,
      stateOverride,
      ...rest
    } = (await prepareTransactionRequest(client as any, {
      ...args,
      parameters:
        // Some RPC Providers do not compute versioned hashes from blobs. We will need
        // to compute them.
        account?.type === 'local' ? undefined : ['blobVersionedHashes'],
    } as PrepareTransactionRequestParameters)) as EstimateGasParameters

    const blockNumberHex = blockNumber ? numberToHex(blockNumber) : undefined
    const block = blockNumberHex || blockTag

    // const rpcStateOverride = serializeStateOverride(stateOverride)
    const rpcStateOverride = undefined;

    const to = await (async () => {
      // If `to` exists on the parameters, use that.
      if (rest.to) return rest.to

      // If no `to` exists, and we are sending a EIP-7702 transaction, use the
      // address of the first authorization in the list.
      if (authorizationList && authorizationList.length > 0)
        return await recoverAuthorizationAddress({
          authorization: authorizationList[0],
        }).catch(() => {
          throw new BaseError(
            '`to` is required. Could not infer from `authorizationList`',
          )
        })

      // Otherwise, we are sending a deployment transaction.
      return undefined
    })()

    assertRequest(args as any)

    const chainFormat = client.chain?.formatters?.transactionRequest?.format
    const format = chainFormat || formatTransactionRequest

    const request = format({
      // Pick out extra data that might exist on the chain's transaction request type.
      ...extract(rest, { format: chainFormat }),
      from: account?.address,
      accessList,
      authorizationList,
      blobs,
      blobVersionedHashes,
      data: unencryptedData,
      gas,
      gasPrice,
      maxFeePerBlobGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      to,
      value,
    } as TransactionRequest)

    function estimateGas_rpc(parameters: {
      block: any
      request: any
      rpcStateOverride: any
    }) {
      const { block, request, rpcStateOverride } = parameters
      return client.request({
        method: 'eth_estimateGas',
        params: rpcStateOverride
          ? [request, block ?? 'latest', rpcStateOverride]
          : block
            ? [request, block]
            : [request],
      })
    }

    let estimate = BigInt(
      await estimateGas_rpc({ block, request, rpcStateOverride }),
    )

    // TODO(7702): Remove this once https://github.com/ethereum/execution-apis/issues/561 is resolved.
    //       Authorization list schema is not implemented on JSON-RPC spec yet, so we need to
    //       manually estimate the gas.
    if (authorizationList) {
      const value = await getBalance(client as any, { address: request.from })
      const estimates = await Promise.all(
        authorizationList.map(async (authorization) => {
          const { contractAddress } = authorization
          const estimate = await estimateGas_rpc({
            block,
            request: {
              authorizationList: undefined,
              data: unencryptedData,
              from: account?.address,
              to: contractAddress,
              value: numberToHex(value),
            },
            rpcStateOverride,
          }).catch(() => 100_000n)
          return 2n * BigInt(estimate)
        }),
      )
      estimate += estimates.reduce((acc, curr) => acc + curr, 0n)
    }

    return estimate
  } catch (err) {
    throw getEstimateGasError(err as BaseError, {
      ...args,
      account,
      chain: client.chain as any,
    })
  }
}
