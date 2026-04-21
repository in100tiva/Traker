# Traker — Changelog de melhorias

## v2 → v3 → v4

### v4: Polimento visual / UX (esta leva)

**Sistema de design**
- Tokens de cor com surface-1/2/3, sombras, glow no dark mode
- Tipografia em escala: Inter (corpo) + Space Grotesk (display), self-hosted via @fontsource
- Numerais tabulares no mono/KPIs
- Border radius padronizado (xl/lg/md/sm)
- Focus rings com offset; respeita prefers-reduced-motion
- Scrollbar customizada

**Identidade**
- Logo mark + wordmark
- Saudação personalizada na TodayView (Bom dia/Boa tarde + data + status)
- Ícones do hábito: emoji escolhível ou bolinha de cor

**Today dashboard**
- Hero com ProgressRing animado (donut com CountUp) + saudação
- Agrupamento por tag com heading e contador por grupo
- Streak inline em cada linha (🔥 7d)
- AnimatedCheckbox com SVG path-draw
- Haptics (vibrate) ao marcar em mobile
- Gradient linha-feita usando a cor do hábito
- Barra de alvo diário inline quando habit.targetPerDay
- Skeleton shimmer enquanto carrega
- Empty state ilustrado

**Streak viz**
- Número grande (display-md) com CountUp animado
- Chama pulsante com gradiente quente (amarelo→laranja→vermelho→fuchsia)
- MilestoneChips (3/7/14/30/60/100/180/365/730) visualizando jornada
- WeeklyProgressDots — 7 caixas Mon-Sun com hoje destacado
- 3 cards: Sequência / Recorde / Meta semanal

**Heatmap**
- Células 14×14 (era 11×11)
- Labels de mês no topo (abreviados)
- Labels de weekday na lateral (Seg/Qua/Sex)
- Today glow animado (pulse suave de 2.2s)
- Cross-hair hover (destaca linha + coluna)
- Gradiente mais suave (0.08 → 0.28 → 0.48 → 0.72 → 1)
- Tooltip rico com cor do hábito, capitalize data, nota
- Contador do mês visível ("18 de 30 dias marcados")
- Scroll horizontal em telas estreitas

**HabitForm**
- Dialog maior com preview ao vivo no topo (emoji + cor + nome + meta)
- Tabs: Básico / Meta / Visual
- Validação visual (borda vermelha + mensagem)
- Emoji picker (Popover, 40 emojis curados)
- Color picker expandido (12 cores), check ao selecionar
- Autocomplete de tag com sugestões baseadas em hábitos existentes

**Navegação**
- Command palette (⌘K / Ctrl+K): buscar hábitos, ações, atalhos
- Sidebar com wordmark no topo
- Indicador de hábito ativo: barra lateral colorida
- Page transitions via Framer Motion (fade + slide)
- Conteúdo centralizado em max-w-5xl

**Charts**
- Cores: destaque visual em weeks que bateram a meta (cor cheia vs 50%)
- Cantos arredondados maiores (6/6/2/2)
- Grid dashed sutil
- Tooltip rico com comparação week-over-week (± %)
- Labels de weekday no histograma com destaque para dia top
- Empty state com ícone quando ausente de dados

**Mobile**
- Header enxuto (só logo mark no mobile)
- Drawer com backdrop blur
- Command palette acessível via botão
- Export/Import escondidos no mobile header (acessíveis pelo command palette)

**Toast**
- Sonner com theme reativo (dark/light)
- Rich colors + close button

**Schema**
- Migration 0004: coluna `emoji TEXT` em habits

### v3: Dashboard, pausa, counter, milestones
(ver commit anterior)

### v2: Live reactivity, archive, target
(ver commit anterior)

## Deferido (justificativa)

- **Sync multi-device** / Electric-SQL: requer backend + protocolo de replicação
- **i18n (i18next)**: refactor pesado de todas as strings
- **E2E com Playwright**: exige browser + infra CI
- **CI (GitHub Actions)**: fora do código da aplicação
- **Criptografia do IndexedDB**: trade-offs de UX
- **Import de Loop/Streaks/Habitica**: parsers específicos por formato
- **Anexos (fotos)**: blob storage em IndexedDB, UI de upload
- **Correlações estatísticas**: precisa >30 dias de dados + UI de análise
- **Habit stacking**: requer modelagem de relações entre hábitos
- **Split pane em desktop grande**: escopo adicional
- **Swipe-to-mark mobile**: interação de gesto avançada, risco de conflito com scroll
- **Tab bar inferior mobile**: cobertura sobrepõe com drawer atual
- **Animated odometer para streaks grandes**: CountUp do react-countup já dá rolamento
