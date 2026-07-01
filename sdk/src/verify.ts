import {
  Account,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  type Transaction,
} from "@stellar/stellar-sdk";
import { NULL_ACCOUNT } from "@stellar/stellar-sdk/contract";
import { networks, type Groth16Proof } from "../bindings/src/index.js";
const VERIFY_METHOD = "verify_and_register";

/**
 * Thrown when a Groth16 proof cannot be encoded into the Soroban call format.
 */
export class ProofEncodingError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ProofEncodingError";
    this.cause = options?.cause;
  }
}

function normalizeHexInput(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) throw new ProofEncodingError("public input must not be empty");
  const hex = trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed : `0x${trimmed}`;
  try {
    return BigInt(hex);
  } catch (cause) {
    throw new ProofEncodingError(`invalid public input hex: ${value}`, { cause });
  }
}

function validateProofBuffer(name: string, value: Buffer, expectedLength: number): void {
  if (!(value instanceof Buffer)) {
    throw new ProofEncodingError(`${name} must be a Buffer`);
  }
  if (value.length !== expectedLength) {
    throw new ProofEncodingError(`${name} must be ${expectedLength} bytes`);
  }
}

function encodeVerifyArgs(
  proof: Groth16Proof,
  publicInputs: string[],
): ReturnType<typeof nativeToScVal>[] {
  validateProofBuffer("proof.a", proof.a, 64);
  validateProofBuffer("proof.b", proof.b, 128);
  validateProofBuffer("proof.c", proof.c, 64);
  const normalizedPublicInputs = publicInputs.map(normalizeHexInput);

  try {
    return [
      nativeToScVal({ a: proof.a, b: proof.b, c: proof.c }),
      nativeToScVal(normalizedPublicInputs),
    ];
  } catch (cause) {
    throw new ProofEncodingError("failed to encode proof for Soroban verify call", { cause });
  }
}

/**
 * Build an unsigned Soroban verification transaction for the validator contract.
 *
 * @param proof - Groth16 proof object with Soroban-ready `a`, `b`, and `c` byte buffers.
 * @param publicInputs - Public input field elements as hex strings, with or without a `0x` prefix.
 * @param contractId - Target validator contract ID.
 * @param networkPassphrase - Stellar network passphrase, e.g. testnet or mainnet.
 * @returns A Soroban contract invocation transaction ready to be signed.
 */
export async function buildVerifyCall(
  proof: Groth16Proof,
  publicInputs: string[],
  contractId: string,
  networkPassphrase: string,
): Promise<Transaction> {
  const args = encodeVerifyArgs(proof, publicInputs);
  const contract = new Contract(contractId);
  const source = new Account(NULL_ACCOUNT, "0");
  const effectivePassphrase =
    networkPassphrase === Networks.TESTNET
    || networkPassphrase === Networks.PUBLIC
    || networkPassphrase === networks.testnet.networkPassphrase
      ? networkPassphrase
      : networkPassphrase;

  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: effectivePassphrase,
  })
    .addOperation(contract.call(VERIFY_METHOD, ...args))
    .setTimeout(0)
    .build();
}
