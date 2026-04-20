# Traker — Tracker de Hábitos

Aplicação local-first para cadastrar hábitos, marcar dias concluídos,
visualizar streaks (atual/máxima) e um heatmap estilo GitHub dos últimos 12
meses.

## Stack

- **Vite + React 18 + TypeScript**
- **Drizzle ORM + PGlite** — Postgres embarcado no navegador (persistência em
  IndexedDB) e in-memory nos testes
- **shadcn/ui** + Tailwind CSS — componentes base (Dialog, Card, Button, ...)
- **Zustand** — estado de UI (hábito selecionado, modal)
- **Recharts** — gráfico de completude semanal
- **Vitest** — testes unitários (streak + queries de agregação)

## Scripts

```bash
npm install
npm run dev       # Vite em http://localhost:5173
npm run test      # Vitest (streak + queries)
npm run build     # typecheck + build de produção
```

## Estrutura

```
src/
├─ db/              # schema, client PGlite, queries de agregação
├─ lib/             # streak (puro), utilitários de data
├─ hooks/           # useDb, useHabits, useCompletions
├─ store/           # Zustand (UI state)
├─ components/
│  ├─ ui/           # shadcn primitives (Button, Card, Dialog, ...)
│  ├─ HabitList, HabitForm, HabitCard
│  ├─ Heatmap, StreakBadge, WeeklyChart
└─ __tests__/       # streak.test.ts, queries.test.ts
```

## Testes

- `streak.test.ts`: cobertura de `calculateCurrentStreak` e
  `calculateLongestStreak` — lista vazia, hoje/ontem, gaps, duplicatas,
  boundaries de mês.
- `queries.test.ts`: CRUD de hábitos, toggle de completions, range queries,
  agregação semanal por `date_trunc('week', ...)` e taxa de conclusão. Roda
  contra PGlite in-memory (instantâneo).
