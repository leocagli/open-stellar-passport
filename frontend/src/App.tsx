import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PassportCard, type PassportState } from "./components/PassportCard";
import { Badge, Button, Card, Mono, cx } from "./components/primitives";
import {
  ArrowRight,
  Check,
  Coins,
  Cpu,
  ExternalLink,
  Fingerprint,
  Github,
  Lock,
  ScanLine,
  ShieldCheck,
  X,
} from "./components/icons";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  authorizePayment,
  CONTRACTS,
  mintPassport,
  replaySpentProof,
  verifyOnChain,
  type MintedProof,
  type OnChainResult,
} from "./lib/passport";

const EXPLORER = (id: string) => `https://stellar.expert/explorer/testnet/contract/${id}`;
const REPO = "https://github.com/leocagli/open-stellar-passport";
const toStroops = (xlm: number) => BigInt(Math.round(xlm * 1e7)).toString();

interface PayResult {
  authorized: boolean;
  reason: string;
  amount: number;
}

export default function App() {
  const [minted, setMinted] = useState<MintedProof | null>(null);
  const [proving, setProving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyRes, setVerifyRes] = useState<OnChainResult | null>(null);
  const [cap, setCap] = useState(50);
  const [payRes, setPayRes] = useState<PayResult | null>(null);
  const [paying, setPaying] = useState(false);
  const [replay, setReplay] = useState<OnChainResult | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (line: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${line}`]);

  const cardState: PassportState = verifyRes?.ok ? "verified" : minted ? "proven" : proving ? "proving" : "empty";

  async function doMint() {
    setProving(true);
    setMinted(null);
    setVerifyRes(null);
    setPayRes(null);
    addLog(`> generating witness + Groth16 proof client-side (cap ${cap} XLM)…`);
    try {
      const m = await mintPassport(toStroops(cap));
      setMinted(m);
      addLog(`+ proof generated in ${m.provingMs} ms · off-chain verify: ${m.offChainValid}`);
      addLog(`  agent #${m.agentId} · nullifier ${m.nullifierHash.slice(0, 20)}…`);
      toast.success("Proof generated", { description: `Agent #${m.agentId} · ${m.provingMs} ms, fully client-side` });
    } catch (e) {
      addLog(`! proving failed: ${String((e as Error).message)}`);
      toast.error("Proving failed", { description: String((e as Error).message) });
    } finally {
      setProving(false);
    }
  }

  async function doVerify() {
    if (!minted) return;
    setVerifying(true);
    addLog(`> submitting proof to AgentPassportValidator (BN254 pairing on-chain)…`);
    const r = await verifyOnChain(minted);
    setVerifyRes(r);
    addLog(r.ok ? `+ ON-CHAIN VERIFIED · attestation minted (ledger ${r.attestation?.ledger})` : `! rejected: ${r.error}`);
    if (r.ok) toast.success("Verified on-chain", { description: `BN254 pairing passed · ledger ${r.attestation?.ledger}` });
    else toast.error("Verification rejected", { description: r.error });
    setVerifying(false);
  }

  async function doPay(amount: number) {
    if (!minted) return;
    setPaying(true);
    addLog(`> agent #${minted.agentId} requests payment of ${amount} XLM (x402 gate)…`);
    const r = await authorizePayment(minted.agentId, toStroops(amount));
    setPayRes({ authorized: r.authorized, reason: r.reason, amount });
    addLog(r.authorized ? `+ APPROVED — ${r.reason}` : `x DENIED — ${r.reason}`);
    if (r.authorized) toast.success(`Payment authorized · ${amount} XLM`, { description: r.reason });
    else toast.error(`Payment denied · ${amount} XLM`, { description: r.reason });
    setPaying(false);
  }

  async function doReplay() {
    setReplaying(true);
    addLog(`> replaying a previously-spent passport (agent #42)…`);
    const r = await replaySpentProof();
    setReplay(r);
    addLog(r.ok ? `! unexpectedly accepted` : `+ chain rejected replay — ${r.error}`);
    if (!r.ok) toast.success("Replay blocked on-chain", { description: r.error });
    setReplaying(false);
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen">
        <Header />

      <main className="mx-auto max-w-[1180px] px-6 pb-28">
        <div className="grid gap-x-12 gap-y-10 pt-12 lg:grid-cols-[1fr_minmax(380px,430px)]">
          {/* LEFT — hero + flow */}
          <div>
            <Hero />
            <div className="mt-12 space-y-4">
              <StepMint
                cap={cap}
                setCap={setCap}
                minted={minted}
                proving={proving}
                onMint={doMint}
              />
              <StepVerify minted={minted} verifying={verifying} verifyRes={verifyRes} onVerify={doVerify} />
              <StepPay cap={cap} verifyRes={verifyRes} paying={paying} payRes={payRes} onPay={doPay} />
              <StepReplay replaying={replaying} replay={replay} onReplay={doReplay} />
            </div>
          </div>

          {/* RIGHT — live credential + console */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PassportCard
              state={cardState}
              agentId={minted?.agentId}
              spendCap={minted?.spendCap ?? toStroops(cap)}
              nullifier={minted?.nullifierHash}
              registryRoot={minted?.registryRoot}
              ledger={verifyRes?.attestation?.ledger}
            />
            <p className="mt-3 px-1 font-mono text-[11px] leading-relaxed text-faint">
              The proof is built in your browser. Owner key &amp; balance never leave this page — only the proof and
              its four public inputs are sent on-chain.
            </p>
            <div className="mt-5">
              <Console lines={log} />
            </div>
          </div>
        </div>

        <Threats />
      </main>
        <Footer />
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}

/* ----------------------------------------------------------------- chrome */

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Agent Passport</span>
          <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-black/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline-flex">
            <span className="h-1 w-1 rounded-full bg-verified" /> testnet
          </span>
        </div>
        <nav className="flex items-center gap-1.5 text-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={EXPLORER(CONTRACTS.validator)}
                target="_blank"
                className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:bg-black/5 hover:text-fg sm:inline-flex"
              >
                {CONTRACTS.validator.slice(0, 4)}…{CONTRACTS.validator.slice(-4)}
                <ExternalLink width={13} height={13} />
              </a>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">AgentPassportValidator · open in Stellar Expert</TooltipContent>
          </Tooltip>
          <a
            href={REPO}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-fg/90 transition-colors hover:border-black/20 hover:bg-black/5"
          >
            <Github width={15} height={15} /> GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink">
      <ShieldCheck width={16} height={16} className="text-stellar" />
    </span>
  );
}

function Hero() {
  return (
    <section>
      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> Stellar Hacks · Real-World ZK
      </div>
      <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.05] tracking-[-0.03em] text-fg sm:text-[3.1rem]">
        Let AI agents pay
        <br />
        without trusting them
        <span className="text-violet-soft">.</span>
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
        A single zero-knowledge proof — verified on-chain in Soroban — attests an agent is backed by a verified human,
        is Sybil-resistant, and is solvent for its spend cap. Identity and balance stay hidden.
      </p>

      <ul className="mt-7 grid max-w-xl gap-px overflow-hidden rounded-xl border border-black/[0.07] bg-black/[0.015] sm:grid-cols-1">
        <Claim icon={<Fingerprint width={17} height={17} />} title="Personhood, not PII">
          Merkle membership in an attested registry — no identity database to breach.
        </Claim>
        <Claim icon={<Lock width={17} height={17} />} title="One identity, one agent">
          A Poseidon2 nullifier blocks Sybil farms and replays, enforced on-chain.
        </Claim>
        <Claim icon={<Coins width={17} height={17} />} title="Solvent, balance hidden">
          Proof-of-funds shows <span className="text-fg/80">balance ≥ cap</span> without revealing the balance.
        </Claim>
      </ul>
    </section>
  );
}

function Claim({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5 px-4 py-3.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet/10 text-violet-soft ring-1 ring-violet/15">
        {icon}
      </span>
      <div className="text-sm">
        <div className="font-medium text-fg">{title}</div>
        <div className="mt-0.5 text-muted">{children}</div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ steps */

function StepShell({
  n,
  title,
  desc,
  children,
  active,
  done,
  locked,
  muted,
}: {
  n: number;
  title: string;
  desc: string;
  children: ReactNode;
  active?: boolean;
  done?: boolean;
  locked?: boolean;
  muted?: boolean;
}) {
  return (
    <Card
      className={cx(
        "!rounded-2xl !p-5 transition-all duration-300",
        locked && "opacity-45",
        active && "border-violet/25 bg-violet/[0.03]",
      )}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div
            className={cx(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ring-1 ring-inset transition-colors",
              done
                ? "bg-verified/15 text-verified ring-verified/40"
                : muted
                  ? "bg-black/5 text-faint ring-black/10"
                  : "bg-violet/15 text-violet-soft ring-violet/40",
            )}
          >
            {done ? <Check width={14} height={14} /> : n}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h3>
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{desc}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </Card>
  );
}

function StepMint({
  cap,
  setCap,
  minted,
  proving,
  onMint,
}: {
  cap: number;
  setCap: (n: number) => void;
  minted: MintedProof | null;
  proving: boolean;
  onMint: () => void;
}) {
  return (
    <StepShell n={1} title="Mint a passport" desc="Pick a spend cap. The owner secret and balance are generated and proven right here." active={!minted} done={!!minted}>
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-[200px] flex-1">
          <span className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Spend cap</span>
            <span className="font-mono text-cyan">{cap} XLM</span>
          </span>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
            className="w-full accent-[#0a0a0a]"
          />
        </label>
        <Button onClick={onMint} loading={proving}>
          {proving ? "Proving" : minted ? "Re-generate" : "Generate proof"}
          {!proving && <ArrowRight width={16} height={16} />}
        </Button>
      </div>

      <AnimatePresence>
        {minted && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 overflow-hidden">
            <div className="rounded-xl border border-black/[0.07] bg-ink-950/50 p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan">
                  <Cpu width={13} height={13} /> Groth16 · {minted.provingMs} ms
                </span>
                <Badge tone={minted.offChainValid ? "verified" : "denied"}>
                  {minted.offChainValid ? <Check width={12} height={12} /> : <X width={12} height={12} />}
                  off-chain valid
                </Badge>
              </div>
              <div className="grid gap-1">
                <Mono label="π.a" value={minted.proofHex.a} />
                <Mono label="π.b" value={minted.proofHex.b} />
                <Mono label="π.c" value={minted.proofHex.c} />
              </div>
              <div className="mt-3 border-t border-black/[0.06] pt-3">
                <ProofDialog minted={minted} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
}

function ProofDialog({ minted }: { minted: MintedProof }) {
  const inputs: [string, string][] = [
    ["registryRoot", minted.registryRoot],
    ["nullifierHash", minted.nullifierHash],
    ["agentId", minted.agentId],
    ["spendCap", minted.spendCap],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 font-mono text-[11px] text-faint transition-colors hover:text-cyan">
          <ScanLine width={13} height={13} /> view full proof &amp; public inputs
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border-black/10 bg-ink-900 text-fg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 tracking-tight">
            <Cpu width={16} height={16} className="text-violet-soft" /> Groth16 proof
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] text-faint">
            BN254 · proved in {minted.provingMs} ms, fully in-browser
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Section title="Proof (G1 · G2 · G1)">
            <Mono label="a" value={minted.proofHex.a} />
            <Mono label="b" value={minted.proofHex.b} />
            <Mono label="c" value={minted.proofHex.c} />
          </Section>
          <Section title="Public inputs">
            {inputs.map(([k, v]) => (
              <Mono key={k} label={k} value={v} />
            ))}
          </Section>
          <p className="rounded-lg border border-violet/15 bg-violet/[0.05] p-3 text-xs text-muted">
            These four values + the proof are all that's sent on-chain. The owner key, balance, Merkle path and agent
            secret stay on this device.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-black/[0.07] bg-ink-950/50 p-3.5">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{title}</div>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function StepVerify({
  minted,
  verifying,
  verifyRes,
  onVerify,
}: {
  minted: MintedProof | null;
  verifying: boolean;
  verifyRes: OnChainResult | null;
  onVerify: () => void;
}) {
  return (
    <StepShell
      n={2}
      title="Verify on-chain"
      desc="The Soroban validator runs the BN254 pairing check and mints the attestation. Live — no wallet needed."
      active={!!minted && !verifyRes?.ok}
      done={!!verifyRes?.ok}
      locked={!minted}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onVerify} loading={verifying} disabled={!minted} variant={verifyRes?.ok ? "outline" : "primary"}>
          {verifyRes?.ok ? (
            <>
              <Check width={16} height={16} /> Verified
            </>
          ) : (
            <>
              <ScanLine width={16} height={16} /> Verify on Stellar
            </>
          )}
        </Button>
        <a
          href={EXPLORER(CONTRACTS.validator)}
          target="_blank"
          className="inline-flex items-center gap-1 font-mono text-[11px] text-faint transition-colors hover:text-cyan"
        >
          validator contract <ExternalLink width={12} height={12} />
        </a>
      </div>
      <AnimatePresence>
        {verifyRes && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            {verifyRes.ok ? (
              <div className="rounded-xl border border-verified/20 bg-verified/[0.05] p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-verified">
                  <Check width={16} height={16} /> Attestation minted on-chain
                </div>
                <div className="mt-2.5 grid gap-1">
                  <Mono label="nullifier" value={verifyRes.attestation!.nullifier} />
                  <Mono label="root" value={verifyRes.attestation!.registry_root} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-denied/20 bg-denied/[0.05] p-3.5 text-sm text-denied">
                <X width={16} height={16} /> {verifyRes.error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
}

function StepPay({
  cap,
  verifyRes,
  paying,
  payRes,
  onPay,
}: {
  cap: number;
  verifyRes: OnChainResult | null;
  paying: boolean;
  payRes: PayResult | null;
  onPay: (n: number) => void;
}) {
  const within = Math.round(cap * 0.7);
  const over = Math.round(cap * 1.4);
  return (
    <StepShell
      n={3}
      title="Agent pays — x402 gate"
      desc="A payment settles only if the agent's proven (but hidden) cap covers the amount."
      active={!!verifyRes?.ok}
      locked={!verifyRes?.ok}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="outline" onClick={() => onPay(within)} loading={paying} disabled={!verifyRes?.ok}>
          Pay {within} XLM
        </Button>
        <Button variant="outline" onClick={() => onPay(over)} loading={paying} disabled={!verifyRes?.ok}>
          Pay {over} XLM
        </Button>
        <span className="font-mono text-[11px] text-faint">cap {cap} XLM</span>
      </div>
      <AnimatePresence>
        {payRes && (
          <motion.div
            key={`${payRes.amount}-${payRes.authorized}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cx(
              "mt-4 flex items-center gap-3 rounded-xl border p-3.5",
              payRes.authorized ? "border-verified/25 bg-verified/[0.05]" : "border-denied/25 bg-denied/[0.05]",
            )}
          >
            <span
              className={cx(
                "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                payRes.authorized ? "bg-verified/15 text-verified" : "bg-denied/15 text-denied",
              )}
            >
              {payRes.authorized ? <Check width={18} height={18} /> : <X width={18} height={18} />}
            </span>
            <div>
              <div className={cx("text-sm font-semibold", payRes.authorized ? "text-verified" : "text-denied")}>
                {payRes.authorized ? "Authorized" : "Denied"} · {payRes.amount} XLM
              </div>
              <div className="text-xs text-muted">{payRes.reason} — balance never revealed.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
}

function StepReplay({ replaying, replay, onReplay }: { replaying: boolean; replay: OnChainResult | null; onReplay: () => void }) {
  return (
    <StepShell n={4} title="Anti-replay" desc="Each passport burns a one-time nullifier. A spent proof is rejected by the chain." muted>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="danger" onClick={onReplay} loading={replaying}>
          Replay a spent passport
        </Button>
        <AnimatePresence>
          {replay && (
            <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
              <Badge tone={replay.ok ? "denied" : "verified"}>
                {replay.ok ? <X width={12} height={12} /> : <ShieldCheck width={12} height={12} />}
                {replay.ok ? "accepted" : replay.error}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepShell>
  );
}

/* ------------------------------------------------------------- console + */

function Console({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-ink-950/60">
      <div className="flex items-center gap-2 border-b border-black/[0.07] px-4 py-2.5">
        <Cpu width={13} height={13} className="text-faint" />
        <span className="font-mono text-[11px] tracking-wide text-faint">proof console</span>
        <span className="ml-auto font-mono text-[10px] text-faint">{lines.length} events</span>
      </div>
      <div className="h-40 overflow-y-auto p-3.5 font-mono text-[11px] leading-[1.7]">
        {lines.length === 0 ? (
          <span className="text-faint">// idle — mint a passport to begin</span>
        ) : (
          lines.map((l, i) => (
            <div
              key={i}
              className={cx(
                "whitespace-pre-wrap",
                l.includes("+") ? "text-verified" : l.includes("! ") || l.includes("x ") ? "text-denied" : "text-muted",
              )}
            >
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Threats() {
  const items = [
    { icon: <Fingerprint width={18} height={18} />, t: "Identity loss", d: "No KYC honeypot — personhood is a Merkle proof; no PII ever touches the chain." },
    { icon: <Coins width={18} height={18} />, t: "Money loss", d: "A compromised agent can't exceed its proven cap; keys and full balance stay with the owner." },
    { icon: <Lock width={18} height={18} />, t: "Sybil farms", d: "A nullifier binds one identity to one agent; replays are rejected on-chain." },
  ];
  return (
    <section className="mt-20">
      <div className="mb-6 flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">What it stops</span>
        <span className="h-px flex-1 bg-black/[0.07]" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-black/[0.07] bg-black/[0.04] sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.t} className="bg-ink-950/80 p-6">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-black/5 text-muted ring-1 ring-black/10">
              {i.icon}
            </span>
            <div className="mt-4 text-[15px] font-semibold tracking-tight">{i.t}</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{i.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/[0.06] py-8">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2 px-6 text-center font-mono text-[11px] text-faint">
        <div>
          reuses{" "}
          <a className="hover:text-muted" href="https://github.com/NethermindEth/stellar-private-payments" target="_blank">
            nethermind/circom-groth16-verifier
          </a>{" "}
          · targets{" "}
          <a className="hover:text-muted" href="https://github.com/trionlabs/stellar-8004" target="_blank">
            stellar-8004
          </a>
        </div>
        <div>research prototype · not audited · testnet only</div>
      </div>
    </footer>
  );
}
