import { describe, expect, it } from "vitest";
import { Networks, Operation, xdr } from "@stellar/stellar-sdk";
import fixture from "./__fixtures__/verify-proof.json";
import { buildVerifyCall, ProofEncodingError } from "./verify";
import type { Groth16Proof } from "../bindings/src/index.js";

const CONTRACT_ID = "CDNSZUNEWFCGSPWLPDSWTENR2WPHKC34RGZQG7RJA54OPGTZGVVRFYBA";

function proofFromFixture(): Groth16Proof {
  return {
    a: Buffer.from(fixture.proof.a, "hex"),
    b: Buffer.from(fixture.proof.b, "hex"),
    c: Buffer.from(fixture.proof.c, "hex"),
  };
}

describe("buildVerifyCall", () => {
  it("builds a ready-to-sign Soroban transaction from a known proof fixture", async () => {
    const tx = await buildVerifyCall(
      proofFromFixture(),
      fixture.publicInputs,
      CONTRACT_ID,
      Networks.TESTNET,
    );
    const envelope = xdr.TransactionEnvelope.fromXDR(tx.toXDR(), "base64");
    const operation = envelope.v1().tx().operations()[0];

    expect(tx.networkPassphrase).toBe(Networks.TESTNET);
    expect(tx.operations).toHaveLength(1);
    expect(operation.body().switch().name).toBe("invokeHostFunction");

    const invoke = Operation.fromXDRObject(operation).func;
    expect(invoke.switch().name).toBe("hostFunctionTypeInvokeContract");

    const args = invoke.invokeContract().args();
    expect(args).toHaveLength(2);
    expect(args[0].switch()).toEqual(xdr.ScValType.scvMap());
    expect(args[1].switch()).toEqual(xdr.ScValType.scvVec());
  });

  it.each([Networks.TESTNET, Networks.PUBLIC])(
    "works with %s network passphrase",
    async (networkPassphrase) => {
      const tx = await buildVerifyCall(
        proofFromFixture(),
        fixture.publicInputs,
        CONTRACT_ID,
        networkPassphrase,
      );

      expect(tx.networkPassphrase).toBe(networkPassphrase);
    },
  );

  it("throws ProofEncodingError for malformed proofs", async () => {
    const malformedProof: Groth16Proof = {
      a: Buffer.alloc(63),
      b: Buffer.alloc(128),
      c: Buffer.alloc(64),
    };

    await expect(
      buildVerifyCall(malformedProof, fixture.publicInputs, CONTRACT_ID, Networks.TESTNET),
    ).rejects.toBeInstanceOf(ProofEncodingError);
  });
});
