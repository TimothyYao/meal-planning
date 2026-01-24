# Meal Planning Monorepo

A monorepo for a meal planning and macro tracking application with mobile and web components.

## Structure

```
.
├── apps/
│   ├── mobile/          # Expo React Native app (iOS & Android)
│   └── web/             # Web dashboard (Vite + React)
├── packages/
│   └── shared/          # Shared types, utilities, API clients
└── package.json         # Root workspace configuration
```

## Prerequisites

- Node.js 18+ (20.19+ recommended for Vite)
- npm 9+
- For mobile development: Expo Go app (iOS/Android)

## Setup

```bash
npm install
cd packages/shared && npm run build
```

## Development

```bash
# Mobile app
npm run mobile

# Web dashboard (http://localhost:5173)
npm run web

# Shared package watch mode
cd packages/shared && npm run dev
```

## Building

```bash
cd packages/shared && npm run build
npm run build:mobile
npm run build:web
```

## Workspaces

### `apps/mobile`
React Native app built with Expo for iOS and Android.
- **Tech**: React Native, Expo, TypeScript
- **Run**: `npm run mobile` or `cd apps/mobile && npm start`

### `apps/web`
Web dashboard for planning and analytics.
- **Tech**: Vite, React, TypeScript
- **Run**: `npm run web` or `cd apps/web && npm run dev`

### `packages/shared`
Shared TypeScript types and utilities used by both apps.
- **Tech**: TypeScript (ES modules)
- **Exports**: Types (MacroTargets, FoodItem, Meal, DailyLog, UserProfile), utilities (formatMacroValue, calculateMacros)
- **Build**: `npm run build` or `npm run dev` (watch mode)

## Usage

Import from the shared package:

```typescript
import type { MacroTargets } from '@meal-planning/shared';
import { formatMacroValue, calculateMacros } from '@meal-planning/shared';

const targets: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};
```

## Development Workflow

1. Edit files in `packages/shared/src/`
2. Rebuild: `cd packages/shared && npm run build` or use watch mode: `npm run dev`
3. Import changes in apps - TypeScript will pick up updates automatically

## Troubleshooting

**Blank page or import errors**: Ensure the shared package is built (`cd packages/shared && npm run build`). Verify `packages/shared/dist/` exists.

**Module resolution issues**: Reinstall dependencies from root: `npm install`

## Tech Stack

- **Mobile**: React Native + Expo + TypeScript
- **Web**: Vite + React + TypeScript
- **Shared**: TypeScript (ES modules)
- **Monorepo**: npm workspaces
