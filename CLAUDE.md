# TipApp — Claude Code Guide

## Project overview
"Et lite tips" is a traveler-focused tip calculator for iOS, Android, and web (Expo/React Native). Key features: country-specific tipping percentages for 60+ countries, OCR receipt scanning, bill splitting, NOK currency conversion, and 5-language UI.

## Tech stack
- **Framework:** Expo ~54 with Expo Router 6 (file-based routing)
- **Language:** TypeScript throughout
- **State:** Zustand stores in `store/`
- **i18n:** react-i18next with 5 locale files in `i18n/` (no, en, fr, es, de)
- **Styling:** React Native `StyleSheet` — no external styling library
- **Theme tokens:** `constants/Theme.ts` exports `Colors`, `Typography`, `Radius`

## Dev commands
```bash
npm start          # Expo dev server (scan QR with Expo Go)
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```

> OCR (`@react-native-ml-kit/text-recognition`) requires a **development build** — it does not work in Expo Go.

## Project structure
```
app/
  _layout.tsx              # Root layout, initialises i18n
  (tabs)/
    _layout.tsx            # Tab bar (Calculator / History / Settings)
    index.tsx              # Calculator screen
    two.tsx                # History screen
    settings.tsx           # Settings screen
  scan.tsx                 # OCR receipt scanning screen
  +not-found.tsx           # 404 fallback

components/                # Reusable UI components
  ContinentCountryPicker   # Step 1 & 2 of calculator
  SatisfactionSelector     # Poor / OK / Excellent + custom %
  BillSplitter             # Person count stepper
  ResultCard               # Tip / total / per-person display
  RoundUpSuggestions       # Round-up shortcut buttons
  HistoryItem              # Single history row

store/
  historyStore.ts          # Zustand — persists calculations to AsyncStorage
  scanStore.ts             # Zustand — passes scanned amount back to calculator
  exchangeRateStore.ts     # Zustand — shared live exchange rates (fetched on demand)

hooks/
  useExchangeRates.ts      # Thin wrapper around exchangeRateStore

data/
  tippingData.ts           # Tipping percentages for every country + fallback NOK rates

utils/
  tipCalculations.ts       # calculateTip(), getRoundUpOptions(), formatAmount()

i18n/
  index.ts                 # i18next init, changeLanguage(), supportedLanguages
  no.json / en.json / fr.json / es.json / de.json
```

## Key conventions

### State management
All shared state lives in Zustand stores under `store/`. Local UI state (controlled inputs, modal visibility, etc.) stays in `useState`. Never lift exchange rate, history, or scan state into component-level `useState`.

| Store | Purpose |
|---|---|
| `settingsStore` | User preferences (home currency, dark mode, defaults…) |
| `exchangeRateStore` | Live NOK-based rates + `getHomeAmount()` cross-rate helper |
| `historyStore` | Persisted calculations; entries carry `homeTotal`+`homeCurrency` |
| `scanStore` | Ephemeral OCR amount passed back to calculator |

### Dark mode / colours
Never import `Colors` directly in components — call `useColors()` from `hooks/useColors.ts` instead. It returns `LightColors` or `DarkColors` from `constants/Theme.ts` based on the current setting.

```tsx
const C = useColors();
// Use C.cream, C.darkSlate, etc. in inline styles
```

`Colors` (the static export in `constants/Theme.ts`) still equals `LightColors` and is only used where a hook cannot be called (e.g. `app/scan.tsx`, `app/onboarding.tsx`).

### Translations
Every user-visible string must use `t('key')` from `useTranslation()`. Add new keys to **all five** locale files (`no.json`, `en.json`, `fr.json`, `es.json`, `de.json`) at the same time.

### Styling
`StyleSheet.create` handles layout-only properties (flex, padding, radius). Color-dependent properties go in inline style objects that reference `C.*`. Never hardcode hex values inline — use the colour palette.

### Home currency conversions
`exchangeRateStore.getHomeAmount(amount, fromCurrency, toCurrency)` uses NOK as the cross-rate base. It returns `null` if rates are missing or currencies are the same. The calculator passes the result to `ResultCard` as `homeAmount`/`homeCurrency` props.

### First-launch onboarding
`settingsStore.hasOnboarded` controls the redirect in `app/_layout.tsx`. When `false`, the app replaces the stack with `/onboarding`. On completion, `patch({ hasOnboarded: true })` writes to AsyncStorage and the root layout no longer redirects.

### Adding countries
Edit `data/tippingData.ts`: add an entry under the correct `ContinentKey` with `{ currency, poor, ok, excellent }` tip percentages. Also add a fallback NOK rate to `defaultExchangeRates` in the same file.

## UI conventions

`constants/Theme.ts` exports `Colors`, `Typography`, `Radius`, and `Spacing`. Always import these instead of hardcoding values.

### Color semantics
| Token | Use for |
|---|---|
| `C.rust` | Primary actions, selected states, amounts, CTAs |
| `C.sage` | Secondary/muted labels, inactive chips, minor actions |
| `C.darkSlate` | Body text, participant names |
| `C.cream` | Screen backgrounds, input backgrounds |
| `C.white` | Card surfaces, modal sheets |
| `C.lightBorder` | All borders on cards and inputs |

### Buttons
- **Primary CTA** (Save, Calculate, Confirm): `backgroundColor: C.rust`, `color: '#fff'`, `borderRadius: Radius.md`, `paddingVertical: 14`
- **Secondary / outline** (Cancel, mode toggles unselected): `backgroundColor: C.white`, `borderColor: C.lightBorder`, `borderWidth: 1.5`
- **Active chip** (selected filter/mode): `backgroundColor: C.rust`, `color: '#fff'` — same `borderRadius` as inactive state

### Inputs (`TextInput`)
`backgroundColor: C.cream`, `borderColor: C.lightBorder`, `borderWidth: 1.5`, `borderRadius: Radius.sm`, text color `C.darkSlate`, placeholder color `C.sage`.

### Cards / panels
`backgroundColor: C.white`, `borderWidth: 1.5`, `borderColor: C.lightBorder`, `borderRadius: Radius.md`. Internal padding: `Spacing.lg` (16) horizontal, `Spacing.md` (12) vertical.

### Spacing
Use `Spacing.*` for all padding/margin/gap values — never hardcode numbers. Standard screen content padding: `Spacing.lg` (16). Gap between list items: `Spacing.sm`–`Spacing.md` (8–12).

### Typography
- `Typography.serif` (Georgia): screen titles, card headings, names
- `Typography.mono` (Courier New): amounts, currency codes, uppercase labels, timestamps
- Never hardcode a font family string — always reference `Typography.*`.

### Copy / vocabulary guide
Use these i18n keys — never invent synonyms or inline strings:
| Action | i18n key |
|---|---|
| Dismiss / go back | `cancel` (root) |
| Save to history or trip | `result.save` |
| Settlement screen title | `splitTab.settlement` |
| Currency picker label | `splitTab.currency` |

When adding new user-visible strings: add to **all five** locale files simultaneously (`no/en/fr/es/de`), nest under the relevant screen namespace (e.g. `splitTab.myNewKey`), and use camelCase keys.
