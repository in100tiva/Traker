# Tracker de Hábitos — Pacote de Melhorias v2

Documenta o escopo da segunda leva de melhorias. Mantido curto como checklist
para o próprio projeto. Não é para usuários finais.

## Feito nesta leva

### Schema (migration 0003)
- `habits.sort_order` para reordenação drag-and-drop
- `habits.paused_at` (pausa temporária sem quebrar streak)
- `habits.is_negative` (hábito de abstinência: marca quando NÃO fez)
- `habits.unit` + `habits.target_per_day` (quantitativo por dia)
- `habits.tag` (agrupamento)
- `completions.note` (diário curto por dia)
- tabela `settings` (k/v) para tema, limite retroativo, flag de onboarding

### Lógica
- `calculateWeeklyGoalStreak` — streak de SEMANAS batendo a meta (mais honesto que streak de dias consecutivos quando a meta é < 7/semana)
- `getPendingToday` — query real (substitui heurística no Reminders)
- `getWeekdayHistogram` — completude por dia-da-semana (`EXTRACT(dow FROM date)`)
- `getStreakHistory` — série temporal do streak para o gráfico de linha
- Hábitos negativos: lógica inverte (marcar = fez, absence = sucesso)
- Guard retroativo: bloqueia marcar dias > limite configurável

### UI — interação
- Tela "Hoje": dashboard com checklist de todos os hábitos ativos
- Toggle dark/light persistido em `settings`
- Atalhos de teclado globais (`N`, `Space`, `?`, `←/→`, `T`, `/`)
- Help modal de atalhos
- Undo toast (Sonner action) em archive/delete — sem `window.confirm`
- Onboarding com presets (Ler, Meditar, Exercitar, Água) para primeira visita
- Error boundary global
- Drawer mobile para a sidebar (responsivo)
- Drag reorder na sidebar (@dnd-kit)
- Empty state com seta no heatmap

### UI — visualizações
- Navegação mês-a-mês no heatmap (← / →)
- Histograma por dia da semana
- Gráfico de linha do streak histórico
- Milestones (7/30/100/365 dias) com confete (`canvas-confetti`)
- Notas diárias acessíveis via popover sobre célula do heatmap
- Barra de progresso do alvo diário (quando `target_per_day`)

### HabitForm
- Campo `unit` (ex.: "páginas", "km", "copos")
- Campo `target_per_day` (quando quantitativo)
- Toggle "hábito negativo"
- Campo `tag` (livre)

### Acessibilidade & PWA
- `role="grid"` + `aria-rowindex`/`colindex` no heatmap
- Tooltip no mobile (tap-to-show fallback)
- `manifest.webmanifest` + ícones
- CSP meta tag
- Theme color

## Deferido (justificativa)

- **Sync multi-device** / Electric-SQL: requer backend + protocolo de replicação
- **Conflict resolution CRDT**: depende de sync
- **i18n (i18next)**: refactor pesado de todas as strings
- **E2E com Playwright**: exige browser + infra CI
- **CI (GitHub Actions)**: fora do código da aplicação
- **Criptografia do IndexedDB**: trade-offs de UX (perda de senha = perda de dados)
- **Import de Loop/Streaks/Habitica**: parsers específicos por formato
- **Anexos (fotos)**: blob storage em IndexedDB, UI de upload
- **Correlações estatísticas**: precisa >30 dias de dados + UI de análise
- **Habit stacking**: requer modelagem de relações entre hábitos
- **Structured logs / Sentry**: infra de observabilidade

## Verificação

- `npm run test` — alvo: 45+ testes passando
- `npm run build` — typecheck + Vite build OK
- `npm run dev` + roteiro manual:
  1. Primeira visita → onboarding
  2. Selecionar presets → criar hábitos
  3. `Space` marca hoje; `N` abre form; `?` mostra atalhos
  4. `←`/`→` navegam meses do heatmap
  5. Clique em célula passada → popover com nota
  6. Excluir → toast com "desfazer" (5s)
  7. Bater streak de 7 dias → confete
  8. Toggle tema → persistido após reload
  9. Resize para mobile → sidebar vira drawer
  10. Reordenar hábitos arrastando
