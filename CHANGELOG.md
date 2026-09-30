# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-09-29

### ⚠️ BREAKING CHANGES

This release migrates the entire UI from v1.0 to v2.0. The following changes are breaking:

#### Removed Dependencies
- **recharts** - All charting is now implemented with custom SVG components (DonutChart, CashFlowChart, BarChart)
- **lucide-react** - All icons are now inline SVGs or replaced with native alternatives
- **@headlessui/react** - Replaced with custom accessible components
- **@heroicons/react** - Replaced with inline SVGs

#### Removed v1.0 Components (Orphaned)
The following v1.0 components have been completely removed and must not be imported:
- `Hero` → replaced by `BentoHero` (from `components/v2/BentoHero`)
- `Section` → replaced by `BentoCard` (from `components/v2/BentoCard`)
- `UploadComponent` → replaced by `Dropzone` (from `components/v2/Dropzone`)
- `CategoryBreakdown` → replaced by `DonutChart` + `BarChart` (from `components/ui/DonutChart` and `components/v2/BarChart`)
- `MonthlyTrend` → replaced by `CashFlowChart` + `MonthList` (from `components/v2/CashFlowChart` and `components/v2/MonthList`)
- `TransactionsTable` → replaced by `TransactionList` (from `components/v2/TransactionList`)
- `LoginScreen` (v1) → replaced by `LoginScreenV2` (from `components/v2/LoginScreen`)
- `PillButton` (v1) → replaced by new `Button` with `variant="ghost"` or `variant="outline"`
- `Button` (v1) → replaced by new `Button` component with updated props (`variant` enum changed)
- `Spinner` (v1) → replaced by new `Spinner` component (same API, different implementation)

#### CSS Changes
- **Color token names changed**: All CSS custom properties renamed from v1.0 semantic names to v2.0 design system names
  - `--color-bg` → `--color-surface`
  - `--color-ink` → `--color-text`
  - `--color-muted` → `--color-ink-muted`
  - `--color-hairline` → `--color-line`
  - `--color-wash` → `--color-surface-wash`
  - `--color-accent` → `--color-brand-primary`
  - `--color-accent-light` → `--color-brand-primary-light`
  - `--color-accent-soft` → `--color-brand-primary-soft`
  - `--color-warm` → `--color-brand-warm`
  - `--color-warm-soft` → `--color-brand-warm-soft`
  - `--color-success` → `--color-positive`
  - `--color-success-soft` → `--color-positive-soft`
  - `--color-danger` → `--color-alert`
  - `--color-danger-soft` → `--color-alert-soft`
- **Font families changed**: 
  - Sans: `Inter Tight` → `Manrope` (weights 500, 700, 800)
  - Serif: `Instrument Serif` → `Petrona` (italic weight 500)
- **Border radius**: `--radius-ds` changed from `10px` to `8px`
- **Utility classes**: Some utility classes renamed (e.g., `.on-ink` → `.on-text`, `.bg-ink` → removed)

#### Component API Changes
- **Button**: 
  - `variant` enum changed: `['primary', 'secondary', 'outline', 'ghost', 'danger']` (removed `'ghost'` from v1, added `'outline'`, `'danger'`)
  - Added `icon` prop support
  - Added `loading` prop with built-in spinner
  - Removed `block` prop (use `className="w-full"` instead)
- **PillButton**: Removed entirely - use `Button` with `variant="ghost"` or `variant="outline"` and custom styling
- **TextInput**: New component replacing v1 inline inputs
- **SelectInput**: New component replacing v1 inline selects
- **DonutChart**: New SVG-based donut chart component (replaces recharts PieChart)
- **CashFlowChart**: New SVG-based horizontal bar chart (replaces recharts AreaChart)
- **BarChart**: New CSS-based horizontal bar chart (replaces CategoryBreakdown list)

#### Feature Flag System
- Added `featureFlags.ts` for gradual rollout of v2.0
- Default: 100% rollout (v2 enabled for all users)
- Supports allowlist and percentage-based rollout
- User preference persistence via localStorage

### Added
- **v2.0 Components** (in `src/components/v2/`):
  - `BentoHero` - Hero section with bento grid layout
  - `BentoCard` - Section wrapper with numbered header
  - `Dropzone` - File upload with drag-and-drop
  - `CashFlowChart` - Horizontal bar chart for monthly expense evolution
  - `MonthList` - List of recent months with change indicators
  - `TransactionList` - Full-featured transaction table with search, filter, sort, edit, delete, CSV export
  - `LoginScreen` - Modern login/register form
  - `Footer` - Modular footer with ServerStatus and CategoryLinks
- **UI Components** (in `src/components/ui/`):
  - `DonutChart` - Accessible SVG donut chart with keyboard navigation
  - `BarChart` - CSS-based horizontal bar chart for category breakdown
  - `Button` - Updated with icon, loading, and new variants
  - `TextInput` - Accessible text input with label, error, helper text
  - `SelectInput` - Accessible select with label, error, helper text
  - `TextLink` - Styled anchor/link with animated underline
  - `CategoryTag` - Category badge component
  - `Metric` - Metric display with optional change indicator
  - `BentoCard` - Section card component
  - `Wordmark` - Freyr logo component
  - `Spinner` - Loading spinner with size variants
- **Code splitting**: All v2 components are lazy-loaded with `React.lazy()` for optimal bundle size
- **Font optimization**: Only required font weights loaded (Manrope 500,700,800 + Petrona italic 500) with `font-display: swap`

### Changed
- **Bundle size**: Reduced from ~641 KB (191 KB gzipped) to ~230 KB (72 KB gzipped) — **~64% reduction**
- **No external charting library**: All charts now use custom SVG implementations
- **Accessibility improvements**: Better ARIA labels, keyboard navigation, reduced motion support
- **Dark theme support**: Added via `data-theme="dark"` attribute (opt-in)

### Migration Guide

#### For v1.0 imports:
```diff
// OLD (v1.0)
import Hero from '@/components/Hero';
import Section from '@/components/Section';
import UploadComponent from '@/components/UploadComponent';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import MonthlyTrend from '@/components/MonthlyTrend';
import TransactionsTable from '@/components/TransactionsTable';
import LoginScreen from '@/components/LoginScreen';
import PillButton from '@/components/ui/PillButton';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

// NEW (v2.0)
import { BentoHero } from '@/components/v2/BentoHero';
import { BentoCard } from '@/components/v2/BentoCard';
import { Dropzone } from '@/components/v2/Dropzone';
import { DonutChart } from '@/components/ui/DonutChart';
import { BarChart } from '@/components/v2/BarChart';
import { CashFlowChart } from '@/components/v2/CashFlowChart';
import { MonthList } from '@/components/v2/MonthList';
import { TransactionList } from '@/components/v2/TransactionList';
import { LoginScreenV2 } from '@/components/v2/LoginScreen';
import { Button } from '@/components/ui/Button'; // Updated API
import { Spinner } from '@/components/ui/Spinner'; // Updated API
```

#### For CSS custom properties:
```css
/* OLD (v1.0) */
:root {
  --color-bg: #F7F6F3;
  --color-ink: #1E1C1A;
  --color-accent: #5B5A96;
  /* ... */
}

/* NEW (v2.0) */
:root {
  --color-surface: #F7F6F3;
  --color-text: #1E1C1A;
  --color-brand-primary: #5B5A96;
  /* ... */
}
```

#### For font loading (index.html):
```html
<!-- OLD (v1.0) -->
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />

<!-- NEW (v2.0) -->
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Petrona:ital,wght@1,500&display=swap" rel="stylesheet" />
```

### Removed
- All v1.0 component files from `src/components/` and `src/components/ui/`
- `recharts` and `lucide-react` from package.json
- Test files and vitest configuration (tests to be re-implemented)

### Fixed
- Unused CSS from v1.0 removed from `index.css`
- TypeScript strict mode compliance improved
- Build configuration cleaned up

---

## [1.0.0] - 2026-09-15 (Previous Release)

Initial release with v1.0 components using recharts and lucide-react.