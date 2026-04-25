/**
 * Local-only "community" seed.
 *
 * The app is local-first — there's no backend. To still convey the social
 * accountability mechanic from the design (Strava-style feed), we ship
 * curated/seed posts AND derive your own posts from the events log.
 *
 * The seed is deterministic — same posts for everyone — but ages by
 * relative time so the feed always feels "alive". Reactions are stored
 * client-side via setSetting (in queries.ts) and merge into the seed at
 * render time.
 */

import { fromDateKey } from "./date";
import type { Habit } from "@/db/schema";

export type ReactionKind = "fire" | "heart" | "clap";

export interface CommunityPost {
  id: string;
  /** ISO timestamp — relative aging means "X minutes ago" / "X days ago" */
  createdAt: string;
  /** Display name */
  author: string;
  avatar: string;
  /** "you" if generated from your own events; otherwise display name */
  authorTag: "friend" | "self";
  /** Friendly tier word that maps onto the design palette */
  tone: "milestone" | "perfect_day" | "comeback" | "new_habit" | "achievement" | "drop";
  /** Headline (already in pt-BR). */
  message: string;
  /** Optional sub-detail (habit name, streak count, etc.) */
  subtitle?: string;
  /** Default counts (live counts get added on top of these) */
  reactions: Record<ReactionKind, number>;
}

const NAMES = [
  { name: "Bea", emoji: "🌸" },
  { name: "Caio", emoji: "🚀" },
  { name: "Júlia", emoji: "🌿" },
  { name: "Renato", emoji: "🎸" },
  { name: "Marina", emoji: "🌊" },
  { name: "Tiago", emoji: "⚡" },
  { name: "Ana", emoji: "🍵" },
  { name: "Rafa", emoji: "🏔️" },
] as const;

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

const SEED_POSTS: CommunityPost[] = [
  {
    id: "seed-1",
    createdAt: ago(2),
    author: NAMES[0].name,
    avatar: NAMES[0].emoji,
    authorTag: "friend",
    tone: "milestone",
    message: "Bea bateu 100 dias seguidos meditando 🧘",
    subtitle: "Marco lendário · +1.800 XP",
    reactions: { fire: 12, heart: 4, clap: 6 },
  },
  {
    id: "seed-2",
    createdAt: ago(5),
    author: NAMES[1].name,
    avatar: NAMES[1].emoji,
    authorTag: "friend",
    tone: "perfect_day",
    message: "Caio fechou 5 de 5 hábitos hoje",
    subtitle: "Dia perfeito",
    reactions: { fire: 8, heart: 3, clap: 5 },
  },
  {
    id: "seed-3",
    createdAt: ago(20),
    author: NAMES[2].name,
    avatar: NAMES[2].emoji,
    authorTag: "friend",
    tone: "comeback",
    message: "Júlia voltou depois de 9 dias e marcou hoje",
    subtitle: "Recomeço sem culpa",
    reactions: { fire: 4, heart: 11, clap: 2 },
  },
  {
    id: "seed-4",
    createdAt: ago(32),
    author: NAMES[3].name,
    avatar: NAMES[3].emoji,
    authorTag: "friend",
    tone: "new_habit",
    message: 'Renato começou "Tocar violão 15 min"',
    subtitle: "Bom começar pequeno",
    reactions: { fire: 3, heart: 5, clap: 1 },
  },
  {
    id: "seed-5",
    createdAt: ago(50),
    author: NAMES[4].name,
    avatar: NAMES[4].emoji,
    authorTag: "friend",
    tone: "achievement",
    message: "Marina desbloqueou Mente Calma",
    subtitle: "Conquista incomum",
    reactions: { fire: 6, heart: 7, clap: 4 },
  },
  {
    id: "seed-6",
    createdAt: ago(72),
    author: NAMES[5].name,
    avatar: NAMES[5].emoji,
    authorTag: "friend",
    tone: "drop",
    message: "Tiago recebeu um drop épico 👑",
    subtitle: "+150 XP de bônus",
    reactions: { fire: 9, heart: 2, clap: 3 },
  },
];

interface DerivePostsArgs {
  habits: Habit[];
  events: Array<{
    type: string;
    payload: unknown;
    createdAt: Date | string;
  }>;
}

/**
 * Derive posts from your own activity. Picks the latest milestone,
 * drop, perfect day, comeback, or habit_create events.
 */
export function derivePostsFromEvents(args: DerivePostsArgs): CommunityPost[] {
  const out: CommunityPost[] = [];
  const habitsById = new Map(args.habits.map((h) => [h.id, h]));

  for (const e of args.events) {
    const ts =
      typeof e.createdAt === "string"
        ? e.createdAt
        : e.createdAt.toISOString();

    if (e.type === "habit_check") {
      const p = e.payload as { habitId?: string; streak?: number } | null;
      const habit = p?.habitId ? habitsById.get(p.habitId) : undefined;
      if (!habit || !p?.streak) continue;
      // Milestone-grade post
      if ([7, 14, 30, 60, 100, 365].includes(p.streak)) {
        out.push({
          id: `self-milestone-${ts}`,
          createdAt: ts,
          author: "Você",
          avatar: habit.emoji ?? "🔥",
          authorTag: "self",
          tone: "milestone",
          message: `Você bateu ${p.streak} dias seguidos em ${habit.name}`,
          subtitle: "Marco desbloqueado",
          reactions: { fire: 0, heart: 0, clap: 0 },
        });
      }
    } else if (e.type === "drop_grant") {
      const p = e.payload as
        | { rarity?: string; bonusXp?: number; dropId?: string }
        | null;
      if (!p) continue;
      out.push({
        id: `self-drop-${ts}`,
        createdAt: ts,
        author: "Você",
        avatar: p.rarity === "epic" ? "👑" : p.rarity === "rare" ? "💎" : "✨",
        authorTag: "self",
        tone: "drop",
        message: `Você recebeu um drop ${p.rarity ?? "comum"}`,
        subtitle: p.bonusXp ? `+${p.bonusXp} XP de bônus` : undefined,
        reactions: { fire: 0, heart: 0, clap: 0 },
      });
    } else if (e.type === "habit_create") {
      const p = e.payload as { method?: string } | null;
      out.push({
        id: `self-create-${ts}`,
        createdAt: ts,
        author: "Você",
        avatar: "🌱",
        authorTag: "self",
        tone: "new_habit",
        message: "Você criou um novo hábito",
        subtitle: p?.method === "bj_fogg" ? "Método guiado" : undefined,
        reactions: { fire: 0, heart: 0, clap: 0 },
      });
    } else if (e.type === "freeze_used") {
      const p = e.payload as { habitId?: string; brokenStreak?: number } | null;
      const habit = p?.habitId ? habitsById.get(p.habitId) : undefined;
      out.push({
        id: `self-freeze-${ts}`,
        createdAt: ts,
        author: "Você",
        avatar: "💜",
        authorTag: "self",
        tone: "comeback",
        message: `Você protegeu uma sequência${
          habit ? ` de ${habit.name}` : ""
        }`,
        subtitle: p?.brokenStreak
          ? `${p.brokenStreak} dias salvos`
          : undefined,
        reactions: { fire: 0, heart: 0, clap: 0 },
      });
    }
  }

  return out;
}

/**
 * Compose the feed: own posts (most recent first) interleaved with seed
 * posts. Caps at `limit`.
 */
export function buildFeed(
  args: DerivePostsArgs,
  limit = 30,
): CommunityPost[] {
  const own = derivePostsFromEvents(args);
  const all = [...own, ...SEED_POSTS].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return all.slice(0, limit);
}

/** Friendly relative time (pt-BR) — "agora", "há 3 min", "ontem", "há 4 d" */
export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `há ${w} sem`;
  // Fallback to absolute
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

// silence lint: re-export ago for tests
export { ago, fromDateKey };
