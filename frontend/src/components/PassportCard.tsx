import { motion } from "framer-motion";
import { Cpu } from "./icons";

export type PassportState = "empty" | "proving" | "proven" | "verified";

interface Props {
  state: PassportState;
  agentId?: string;
  spendCap?: string;
  nullifier?: string;
  registryRoot?: string;
  ledger?: number;
}

const YELLOW = "#fdda24";

const fmtCap = (raw?: string) => {
  if (!raw) return "•••• XLM";
  return `${(Number(BigInt(raw)) / 1e7).toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`;
};

function mrz(agentId?: string, nullifier?: string) {
  const fill = (s: string, n: number) => (s + "<".repeat(n)).slice(0, n);
  const agt = agentId ? agentId.padStart(10, "0") : "<<<<<<<<<<";
  const nf = (nullifier ? BigInt(nullifier).toString(16).toUpperCase() : "").padEnd(24, "<").slice(0, 24);
  return [fill(`P<STELLAR<AGENT<${agt}`, 36), fill(`${nf}<7ZK<BN254<<<<`, 36)];
}

function Guilloche() {
  const rings = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 opacity-[0.16]" viewBox="0 0 200 200">
      <defs>
        <radialGradient id="gx" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#b88f00" />
        </radialGradient>
      </defs>
      {rings.map((i) => (
        <ellipse
          key={i}
          cx="100"
          cy="100"
          rx={30 + i * 5}
          ry={62 + i * 5}
          fill="none"
          stroke="url(#gx)"
          strokeWidth="0.5"
          transform={`rotate(${i * 14} 100 100)`}
        />
      ))}
    </svg>
  );
}

export function PassportCard({ state, agentId, spendCap, nullifier, ledger }: Props) {
  const sealed = state === "verified";
  const [m1, m2] = mrz(agentId, nullifier);

  return (
    <motion.div
      data-testid="passport"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="relative aspect-[1.585/1.06] w-full select-none overflow-hidden rounded-[1.4rem]"
      style={{
        background: "linear-gradient(155deg, #161616 0%, #0c0c0c 55%, #080808 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 26px 60px -24px rgba(10,10,10,.55)",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <Guilloche />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen"
        style={{ background: "conic-gradient(from 210deg at 72% 18%, transparent, rgba(253,218,36,.32), rgba(253,218,36,.06) 55%, transparent)" }}
      />
      <div className="animate-sheen absolute inset-0" />

      <div className="relative flex h-full flex-col p-5 text-white">
        {/* issuer row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: YELLOW }}>
              Stellar
            </div>
            <div className="mt-0.5 text-[13px] font-semibold tracking-tight text-white/95">ZK Credential</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-white/40">P&lt;AGT</span>
            <div className="relative h-7 w-9 rounded-[5px]" style={{ background: "linear-gradient(135deg,#fde58a,#caa400)" }}>
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-px p-[3px]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="rounded-[1px] bg-black/30" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="mt-4 flex flex-1 gap-4">
          <div className="relative h-[88px] w-[68px] shrink-0 overflow-hidden rounded-md border border-white/10 bg-black">
            <svg viewBox="0 0 68 88" className="absolute inset-0 h-full w-full" style={{ color: "#1c1c1c" }}>
              <rect width="68" height="88" fill="currentColor" />
              <circle cx="34" cy="34" r="15" fill="#000" />
              <path d="M12 84c2-16 12-24 22-24s20 8 22 24" fill="#000" />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(253,218,36,.75)" }}>
                redacted
              </span>
            </div>
            <div className="absolute bottom-1 right-1 font-mono text-[7px] uppercase tracking-wider text-white/40">zk</div>
          </div>

          <div className="grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-2.5">
            <Field k="Type" v="Agent / x402" />
            <Field k="Agent No." v={agentId ? agentId : "—"} mono />
            <Field k="Spend cap" v={fmtCap(spendCap)} accent />
            <Field k="Holder" v="████ hidden" />
          </div>
        </div>

        {/* MRZ */}
        <div className="mt-3 rounded-md border border-white/[0.06] bg-black/40 px-2.5 py-1.5">
          <div className="font-mono text-[9.5px] leading-[1.5] tracking-[0.12em] text-white/65">
            <div className="truncate">{m1}</div>
            <div className="truncate">{m2}</div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
            <Cpu width={11} height={11} />
            {sealed ? `sealed · ledger ${ledger ?? "—"}` : state === "proving" ? "proving…" : "testnet · not sealed"}
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: sealed ? YELLOW : state === "proven" ? "#caa400" : "rgba(255,255,255,.3)",
              boxShadow: sealed ? `0 0 8px ${YELLOW}` : "none",
            }}
          />
        </div>
      </div>

      {/* gold seal */}
      {sealed && (
        <motion.div
          initial={{ opacity: 0, scale: 1.4, rotate: -24 }}
          animate={{ opacity: 1, scale: 1, rotate: -14 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
          className="pointer-events-none absolute right-4 top-1/2 grid h-24 w-24 -translate-y-1/2 place-items-center rounded-full"
          style={{ border: `2px solid ${YELLOW}`, color: YELLOW, boxShadow: "0 0 0 1px rgba(253,218,36,.2) inset" }}
        >
          <div className="text-center leading-tight">
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-80">verified</div>
            <div className="font-mono text-[13px] font-bold uppercase tracking-tight">on-chain</div>
            <div className="font-mono text-[7px] uppercase tracking-[0.2em] opacity-80">BN254 · Soroban</div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Field({ k, v, mono, accent }: { k: string; v: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/40">{k}</div>
      <div
        className={`truncate text-[12.5px] ${mono ? "font-mono" : "font-medium"}`}
        style={accent ? { color: YELLOW } : { color: "rgba(255,255,255,.92)" }}
      >
        {v}
      </div>
    </div>
  );
}
