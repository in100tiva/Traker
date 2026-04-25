# Roadmap de implementação — Hook Model & Gamificação

Plano em 4 PRs para entregar as 10 features de backend e 10 de UX
solicitadas, sem virar um único monstro inviável de revisar.

## Fase 1 — Núcleo (este PR: `feat/fase-1-gamification-core`)

Foco: motores puros + persistência. Sem UI nova.

- **Migration 0006**
  - `habits.trigger_type` (text) e `habits.trigger_value` (jsonb) — habit
    stacking e gatilho contextual
  - `xp_log(id, habit_id?, amount, kind, created_at)` — kinds:
    `habit_check | streak_bonus | drop | milestone | freeze_grant`
  - `events(id, type, payload jsonb, created_at)` — tracking interno
  - `freezes(id, used_at, month_key, restored_for_habit_id?)`
- **`lib/gamification.ts`**
  - Curva de níveis não-linear (cresce ~1.4× por nível)
  - `xpForCheck(habit, streak)` com bônus crescente
  - 12 títulos identitários ("Aprendiz" → "Lenda Viva")
- **`lib/streak-freeze.ts`** — quota mensal, marcação de uso,
  restauração de streak
- **`lib/random-rewards.ts`** — variable reward sem ficar previsível
- **`lib/analytics.ts`** — tracking de ativação, D1/D7/D30, churn,
  cohort grouping
- **`lib/feature-flags.ts`** — bucketing determinístico por install_id
- **`lib/timezone.ts`** — Intl-based, virada de dia consciente
- **`lib/notifications-engine.ts`** — aprende horário ideal pelos events
- **Queries**: `recordXp`, `recordEvent`, `useFreeze`, `getRetention`,
  `getXpTotal`, `getEventTimings`
- **App bootstrap**: gera `install_id` + `timezone` + registra evento
  `app_open`, ativação no primeiro habit_check
- **30+ testes novos**

## Fase 2 — Onboarding + Home + Streak (`feat/fase-2-onboarding-home-streak`)

Frontend que toca o usuário no primeiro minuto.

- `OnboardingFlow` 3 telas (≤60s pra primeiro hábito), progressive
  disclosure, endowed progress 35%, BJ Fogg simplificado
- `HabitCreatorBJFogg` (3 steps: gatilho → ação mínima → recompensa,
  preview ao vivo)
- `TodayView` redesign: 1 toque, sem confirmação, animação de XP burst
- `StreakFlame` com cor escalonando (amarelo → laranja → vermelho →
  fúcsia), glow e pulse
- `lib/haptics` reforçado + framer-motion em pontos críticos +
  canvas-confetti em milestones

## Fase 3 — Recovery + Notifs in-app + Identidade + Hábitos contextuais (`feat/fase-3-recovery-notifs-identity`)

- `RecoveryDialog` quando streak quebra (acolhedor, oferece freeze)
- `InAppBanner` com copy emocional ("Sua versão de amanhã agradece")
- `IdentityProfile` — perfil reforçando identidade não números
- `HabitForm`: campo de gatilho (tempo/local/após X) com habit stacking
- Engine de notificações sugere horário ideal aprendido dos events

## Fase 4 — Comunidade (mock) + Recompensa variável + Admin + A/B (`feat/fase-4-social-rewards-admin`)

- `CommunityFeed` design Strava (mock local persistido)
- `VariableReward` toasts especiais quando o random-reward dispara
- `AdminDashboard` rota `/admin` com cohort retention, churn, top hábitos
- Feature flags UI + alternar variantes no preview

## Limites honestos

- **App é local-first (PGlite/IndexedDB).** Não há backend externo
- **Comunidade real** exige servidor → entregue como **mock local** com
  UI pixel-perfect e dados seedados + posts do próprio usuário
- **Push real D3/D7/D30 por email** é impossível sem servidor → entregue
  como **re-engagement local** (banner ao voltar após N dias, baseado em
  events log)
- **A/B em produção real** precisa backend → bucketing determinístico no
  client funciona pra teste local + flags toggleable na UI
- **Análise de retenção** roda contra os events da própria DB local
  (cada usuário vê só seus dados — não há cohort cruzado entre usuários)
