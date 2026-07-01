// sdk/src/index.ts
export { AgentPassport, authorizePassportSpend, type AgentPassportConfig, type CircuitBreakerConfig, type SpendLimits } from "./passport.js";
export {
  createDelegationToken,
  verifyDelegationToken,
  authorizeDelegatedPayment,
  revokeDelegationToken,
  revokeDelegatorTokens,
  resetDelegationState,
  type DelegationToken,
} from "./delegation-token.js";
export {
  generatePassportProof,
  toSorobanProof,
  derivePublicInputs,
  type PassportArtifacts,
  type PassportWitness,
  type PublicInputs,
  type SorobanProof,
  type Artifact,
} from "./prover.js";

export {
  Client as AgentPassportValidatorClient,
  networks,
  Errors,
  type Attestation,
  type Groth16Proof,
} from "../bindings/src/index.js";

export { PassportClient, RateLimitError, parseRateLimitError, PassportError } from "./PassportClient.js";
