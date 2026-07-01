import { useEffect, useState } from "react";
import { Coins, ShieldCheck, Stamp, Check, Key } from "./icons";
import { Card, cx } from "./primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type BadgeType = "first_task" | "quest_master" | "level_10" | "veteran" | "top_earner";

interface AgentBadge {
  agentId: string;
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  awardedAt: string;
}

const iconByType = {
  first_task: Check,
  quest_master: Stamp,
  level_10: ShieldCheck,
  veteran: Key,
  top_earner: Coins,
} satisfies Record<BadgeType, typeof Check>;

const toneByType = {
  first_task: "text-cyan bg-cyan/10 border-cyan/20",
  quest_master: "text-violet-soft bg-violet/10 border-violet/20",
  level_10: "text-verified bg-verified/10 border-verified/20",
  veteran: "text-amber bg-amber/10 border-amber/20",
  top_earner: "text-fg bg-black/[0.04] border-black/10",
} satisfies Record<BadgeType, string>;

export function AgentBadgeGrid({ agentId }: { agentId?: string }) {
  const [badges, setBadges] = useState<AgentBadge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setBadges([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/agents/${encodeURIComponent(agentId)}/badges`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { badges: [] as AgentBadge[] };
        return response.json() as Promise<{ badges: AgentBadge[] }>;
      })
      .then((payload) => {
        if (!cancelled) setBadges(payload.badges ?? []);
      })
      .catch(() => {
        if (!cancelled) setBadges([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  return (
    <Card className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Agent detail</p>
          <h3 className="mt-2 text-lg font-semibold text-fg">Badges</h3>
        </div>
        {agentId ? <span className="font-mono text-[11px] text-faint">{badges.length} unlocked</span> : null}
      </div>

      {!agentId ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Generate a passport to load the agent profile and any milestone badges.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded border border-line bg-black/[0.03]"
                  />
                ))
              : badges.map((badge) => {
                  const Icon = iconByType[badge.type];
                  return (
                    <Tooltip key={badge.type}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cx(
                            "flex h-20 flex-col items-center justify-center gap-2 rounded border transition-transform hover:-translate-y-0.5",
                            toneByType[badge.type],
                          )}
                          aria-label={badge.title}
                        >
                          <Icon width={20} height={20} />
                          <span className="text-center text-[11px] font-medium leading-tight">{badge.title}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={8}>
                        <div className="max-w-48">
                          <p className="font-semibold">{badge.title}</p>
                          <p className="mt-1 text-[11px] leading-relaxed opacity-90">{badge.description}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
          </div>

          {!loading && badges.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">No badges unlocked yet for this agent.</p>
          ) : null}
        </>
      )}
    </Card>
  );
}
