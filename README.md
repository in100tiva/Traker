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

## Deploy na Vercel

A branch `main` é auto-deployada pela Vercel. Configurações importantes
estão em `vercel.json`:

- **Framework**: Vite (auto-detectado)
- **Build**: `npm run build` (tsc + vite build) → `dist/`
- **Install**: `npm ci`
- **Node**: `>=20` (via `.nvmrc` + `engines`)
- **SPA rewrites**: qualquer rota sem extensão de arquivo cai no
  `index.html` (fallback do client-side router)
- **Headers**:
  - `/sw.js` sem cache (`must-revalidate`) + `Service-Worker-Allowed: /`
  - `/manifest.webmanifest` com `Content-Type` correto
  - `/assets/*` com `Cache-Control: immutable` (Vite hashea os nomes)
  - `*.wasm` com `Content-Type: application/wasm` e cache imutável
  - Headers de segurança globais (XFO, Referrer-Policy, Permissions-Policy)

### Primeira configuração na Vercel

1. Importar o repositório GitHub
2. Root directory: `/` (raiz)
3. Framework preset: **Vite** (deve ser detectado automaticamente)
4. Build command: `npm run build` (já no `vercel.json`)
5. Output directory: `dist` (já no `vercel.json`)
6. Não há variáveis de ambiente — app é local-first (PGlite + IndexedDB)
7. Deploy: preview em cada PR, produção quando merge em `main`

### Notas

- O app não faz nenhuma chamada HTTP externa em runtime (sem backend).
- O Service Worker (`/sw.js`) só entra em produção (`import.meta.env.PROD`).
- PGlite carrega o WASM/data (~13MB) sob demanda via `import()`
  dinâmico — o bundle inicial fica em ~44KB + ~368KB (Recharts + deps).
