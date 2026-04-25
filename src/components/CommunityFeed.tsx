import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HIcon } from "./icons/HIcon";
import { cn } from "@/lib/utils";
import {
  buildFeed,
  relativeTime,
  type CommunityPost,
  type ReactionKind,
} from "@/lib/community";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import { listEvents, getSetting, setSetting } from "@/db/queries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: DbBundle | null;
  habits: Habit[];
}

const REACTION_ICONS: Record<ReactionKind, string> = {
  fire: "🔥",
  heart: "💜",
  clap: "👏",
};

const TONE_ACCENT: Record<CommunityPost["tone"], string> = {
  milestone: "rgb(232, 255, 58)",
  perfect_day: "rgb(163, 230, 53)",
  comeback: "rgb(217, 70, 239)",
  new_habit: "rgb(125, 211, 252)",
  achievement: "rgb(232, 121, 249)",
  drop: "rgb(232, 255, 58)",
};

const REACTION_KEY = "community.reactions";

export function CommunityFeed({
  open,
  onOpenChange,
  bundle,
  habits,
}: Props) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  /** Ids the user has already reacted to + the kind they chose */
  const [myReactions, setMyReactions] = useState<Record<string, ReactionKind>>(
    {},
  );

  useEffect(() => {
    if (!open || !bundle) return;
    let cancelled = false;
    (async () => {
      const events = await listEvents(bundle.db, 1000);
      const persistedReactions =
        (await getSetting<Record<string, ReactionKind>>(
          bundle.db,
          REACTION_KEY,
        )) ?? {};
      if (cancelled) return;
      setMyReactions(persistedReactions);
      setPosts(
        buildFeed({
          habits,
          events: events.map((e) => ({
            type: e.type,
            payload: e.payload,
            createdAt: e.createdAt,
          })),
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bundle, habits]);

  const myStats = useMemo(() => {
    const own = posts.filter((p) => p.authorTag === "self").length;
    const reactionsGiven = Object.keys(myReactions).length;
    return { own, reactionsGiven };
  }, [posts, myReactions]);

  async function react(postId: string, kind: ReactionKind) {
    if (!bundle) return;
    const next = { ...myReactions };
    if (next[postId] === kind) {
      delete next[postId];
    } else {
      next[postId] = kind;
    }
    setMyReactions(next);
    await setSetting(bundle.db, REACTION_KEY, next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-border p-4 pr-12">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="font-display text-[18px] tracking-tighter">
                Comunidade
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[12px]">
                Conquistas dos amigos + suas próprias.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 -space-x-2">
              {["🌸", "🚀", "🌿", "🎸"].map((e, i) => (
                <div
                  key={i}
                  className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 ring-2 ring-surface text-base"
                >
                  {e}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* My summary strip */}
        <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3">
          <SummaryPill
            icon="sparkles"
            label="Suas conquistas no feed"
            value={myStats.own}
          />
          <SummaryPill
            icon="trophy"
            label="Reações dadas"
            value={myStats.reactionsGiven}
          />
        </div>

        {/* Feed */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {posts.length === 0 && (
            <div className="px-3 py-6 text-center font-mono text-[11px] text-ink-mute">
              Carregando feed…
            </div>
          )}
          <ul className="flex flex-col gap-2.5">
            {posts.map((p) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-border bg-surface p-3.5"
                style={{
                  borderColor:
                    p.authorTag === "self"
                      ? "rgba(232,255,58,0.25)"
                      : "rgb(var(--border))",
                  background:
                    p.authorTag === "self"
                      ? "rgba(232,255,58,0.04)"
                      : "rgb(var(--surface))",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl"
                    style={{
                      background:
                        p.authorTag === "self"
                          ? "rgba(232,255,58,0.15)"
                          : "rgb(var(--surface-2))",
                      border:
                        p.authorTag === "self"
                          ? "1.5px solid rgba(232,255,58,0.5)"
                          : "1px solid rgb(var(--border))",
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[14px] font-semibold tracking-tighter text-ink">
                        {p.message}
                      </span>
                    </div>
                    {p.subtitle && (
                      <div
                        className="mt-1 font-mono text-[11px]"
                        style={{ color: TONE_ACCENT[p.tone] }}
                      >
                        {p.subtitle}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                      <span>{relativeTime(p.createdAt)}</span>
                      <span>·</span>
                      <span>
                        {p.authorTag === "self" ? "Você" : "Amigo"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reactions */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5">
                  {(["fire", "heart", "clap"] as ReactionKind[]).map((kind) => {
                    const count =
                      p.reactions[kind] +
                      (myReactions[p.id] === kind ? 1 : 0);
                    const active = myReactions[p.id] === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => react(p.id, kind)}
                        className={cn(
                          "inline-flex h-7 items-center gap-1 rounded-pill border px-2.5 text-[12px] transition-all",
                          active
                            ? "border-accent bg-accent-soft text-ink"
                            : "border-border bg-transparent text-ink-dim hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        <span>{REACTION_ICONS[kind]}</span>
                        <span className="font-mono tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Privacy footer */}
        <div className="border-t border-border bg-surface-2/40 px-4 py-2.5 text-center font-mono text-[10px] text-ink-mute">
          Modo solo · suas reações ficam apenas neste dispositivo
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: "sparkles" | "trophy";
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-bg p-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2">
        <HIcon name={icon} size={14} color="rgb(var(--text-dim))" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-[16px] font-bold leading-none tracking-tighter text-ink tabular-nums">
          {value}
        </div>
        <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wide text-ink-mute">
          {label}
        </div>
      </div>
    </div>
  );
}
