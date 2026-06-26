# Copilot Code Review Instructions — open-stellar-passport

## Project overview
open-stellar-passport is a TypeScript/Node.js service managing AI agent identity on Stellar.
It handles passport issuance, credential management, revocation, and Soroban contract interaction.
Tests use Vitest. Rust smart contracts live under `contracts/`.

## Review priorities

### Security — flag immediately
- Any use of `|| true` or `2>/dev/null` to silence audit failures → BLOCK
- `cargo audit || true` or `npm audit || true` → BLOCK, never acceptable
- Missing signature verification on webhook endpoints — must validate `X-Open-Stellar-Signature`
- Passport operations (transfer, revoke, suspend) without auth check on the caller
- Rate limiting missing on public-facing endpoints — use `checkRateLimit(key, {maxRequests, windowMs})`

### Passport domain rules
- `PassportStatus` values: `'active' | 'suspended' | 'revoked' | 'expired'` — no other strings
- Revoked or expired passports must be rejected before any action (transfer, credential add, etc.)
- Audit log must fire for: `issue | revoke | suspend | reinstate | transfer | credential_added | credential_renewed`
- Webhook events use `X-Open-Stellar-Signature: sha256=<hex>` HMAC signing

### Rust contracts
- Event structs must be defined with `#[contracttype]` before being emitted
- Batch operations must validate each item independently and return per-item results
- No `unwrap()` in production paths — use `Result` + proper error types

### Tests
- Every new route or exported function must have a Vitest test
- Flag PRs that add logic but no tests

## What NOT to flag
- Minor style issues (formatting is handled by the linter)
- Doc comment completeness on private helpers
