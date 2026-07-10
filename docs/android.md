# Android (Capacitor 8)

O app Android é um WebView Capacitor que embute o build web do Vite.

- **appId**: `com.in100tiva.streaks`
- **appName**: `Streaks`
- **webDir**: `dist`
- **Projeto nativo**: pasta `android/` (commitada no repo; artefatos de build são ignorados pelo `android/.gitignore`)

## Pré-requisitos (instalar na máquina)

| Requisito | Versão | Observação |
|---|---|---|
| Android Studio | versão estável recente | Instala e gerencia o SDK; já embute o JDK (JBR) |
| JDK | **21** | O embutido no Android Studio atende; não precisa instalar à parte |
| Android SDK Platform | **API 36** (`compileSdk`/`targetSdk` = 36) | Instalável pelo SDK Manager do Android Studio |
| Dispositivo/emulador | Android 7.0+ (`minSdk` = 24) | |

Valide o ambiente com: `npx cap doctor`

## Fluxo de trabalho

```bash
# 1. Rebuild do web + cópia para o projeto Android (rodar após QUALQUER mudança no src/)
npm run build:android

# 2. Abrir o projeto no Android Studio
npm run open:android
```

No Android Studio:

- **Rodar em emulador/dispositivo**: botão ▶ Run (`Shift+F10`).
- **APK de teste (debug)**: `Build > Build App Bundle(s) / APK(s) > Build APK(s)` —
  o APK sai em `android/app/build/outputs/apk/debug/app-debug.apk`.
- **AAB de release (Play Store)**: `Build > Generate Signed App Bundle / APK`,
  criando/usando um keystore. Via terminal: `cd android && ./gradlew bundleRelease`
  (exige signing config). O AAB sai em `android/app/build/outputs/bundle/release/`.

> ⚠️ Guarde o keystore com segurança e fora do git — sem ele não é possível
> atualizar o app na Play Store.

## Adaptações ao WebView (implementadas)

Correções da auditoria de compatibilidade, com ramificação por
`Capacitor.isNativePlatform()` (o comportamento web permanece intacto):

| Área | No app nativo | Plugin |
|---|---|---|
| Lembretes | Agendados via AlarmManager — funcionam com o app fechado | `@capacitor/local-notifications` |
| Export de backup | `Filesystem.writeFile` + share sheet (blob `<a download>` não baixa no WebView) | `@capacitor/filesystem` + `@capacitor/share` |
| Botão voltar | Fecha diálogos/drawer → volta p/ "Hoje" → minimiza | `@capacitor/app` |
| Haptics | `Haptics.impact/notification` (vibrate é inconsistente no WebView) | `@capacitor/haptics` |
| Safe area | `env(safe-area-inset-*)` na Topbar, drawer e BottomNav | — |
| Auto Backup | `app_webview/` (IndexedDB do PGlite) excluído das regras de backup/transfer; `navigator.storage.persist()` no boot do banco | — |
