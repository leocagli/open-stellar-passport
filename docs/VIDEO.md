# Demo video — script & shot list (~2:10)

Two renders exist:

- **`docs/demo-narrated.mp4`** — captioned screencast **with voiceover**, composed
  and rendered in Remotion (see [`../video/`](../video/)). The narration is
  Windows SAPI TTS (no API key, robotic) — swap `video/public/vo/*.wav` for your
  own voice or a premium TTS and re-render.
- **`docs/demo.mp4`** — the same screencast, **silent** (captions only).

The table below is the narration script (also used to generate the TTS).

Everything shown is **real**: the proof is generated in the browser and verified
live against the deployed Soroban contract on testnet.

---

| # | Time | On screen | Narration |
|---|------|-----------|-----------|
| 0 | 0:00–0:05 | Title card: **Agent Passport** | "Agent Passport — a zero-knowledge credential that lets AI agents pay on Stellar, without trusting them." |
| 1 | 0:05–0:18 | Hero | "AI agents are starting to pay autonomously. Today that means handing them your keys, or KYC-ing into a honeypot — both leak money or identity. Agent Passport fixes that with one ZK proof." |
| 2 | 0:18–0:38 | Step 1 — set cap, **Generate proof**, proof appears | "The owner picks a spend cap and generates a Groth16 proof entirely in the browser. It proves the agent is backed by a registered human, is Sybil-resistant, and is solvent — `balance ≥ cap`. The private key and balance never leave the page." |
| 3 | 0:38–0:58 | Step 2 — **Verify on Stellar**, card seals | "The proof is verified on-chain: Soroban runs the BN254 pairing check and mints a `zk-passport` attestation. This is live on testnet — no wallet needed, it's a read-only simulation." |
| 4 | 0:58–1:18 | Step 3 — Pay within / over cap | "Now the x402 gate. A payment within the proven cap is authorized — over it, denied. The balance itself is never revealed; only the proof that it covered the amount." |
| 5 | 1:18–1:33 | Step 4 — **Replay a spent passport** → NullifierUsed | "Each passport burns a one-time nullifier. Replaying a spent proof is rejected on-chain — anti-replay and anti-Sybil, enforced by the contract." |
| 6 | 1:33–1:55 | Scroll to **Under the hood** | "Under the hood: a ~9.6k-constraint Circom circuit, and two contracts deployed on Stellar testnet — the BN254 verifier and the stateful validator that stores nullifiers and writes attestations." |
| 7 | 1:55–2:10 | End card: repo URL | "It reuses Nethermind's verifier and targets ERC-8004 for agent identity. Open source — github.com/leocagli/open-stellar-passport. Thanks for watching." |

## Tips
- Keep it under 3 minutes (DoraHacks requirement).
- If recording your own screen instead of the auto-screencast: open `npm run dev`,
  walk steps 1→4 in order, then scroll to "Under the hood".
- Convert webm→mp4 if your host needs it: `ffmpeg -i demo.webm -c:v libx264 -pix_fmt yuv420p demo.mp4`.
