# Convenções do projeto

## Branches

Sempre criar uma branch nova a partir de `main` para cada unidade de trabalho.
Nome da branch segue o padrão **Conventional Branches**:

- `feat/<slug-curto>` — nova feature
- `fix/<slug-curto>` — correção de bug
- `melhorias/<slug-curto>` — polimento, UX, refactor não-breaking
- `chore/<slug-curto>` — infra, deps, config (CI, Vercel, etc.)
- `docs/<slug-curto>` — mudanças só de documentação
- `refactor/<slug-curto>` — refactor estrutural sem mudança de comportamento
- `perf/<slug-curto>` — otimização de performance
- `test/<slug-curto>` — só testes

**Não usar `claude/*` como prefixo.**

Slug em kebab-case curto, em português quando fizer sentido:
`feat/command-palette`, `fix/heatmap-hoje-off-by-one`, `melhorias/onboarding-presets`.

## Commits

Conventional Commits no subject line (`feat:`, `fix:`, `chore:`, ...) e corpo
em português explicando o "porquê" além do "o quê". Uma vírgula técnica ao
final para assinatura do Claude Code é opcional e pode ser omitida a pedido.

## Deploy

- Branch default: `main`
- Vercel auto-deploy em `main`; PRs ganham preview
- Config em `vercel.json` (rewrites SPA + headers de cache/segurança)
- Ver `README.md` para detalhes
