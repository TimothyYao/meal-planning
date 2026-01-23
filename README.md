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

## Getting Started

### Prerequisites

- Node.js 18+ (20.19+ recommended for Vite)
- npm 9+
- For mobile: Expo Go app on your phone (iOS/Android) - download from App Store/Play Store

### Installation

```bash
# Install all dependencies (installs for all workspaces)
npm install

# Build shared package (required before using in apps)
cd packages/shared && npm run build
```

### Development

```bash
# Start mobile app (Expo)
npm run mobile
# Then scan QR code with Expo Go app

# Start web dashboard (runs on http://localhost:5173)
npm run web

# Run both (in separate terminals)
npm run mobile & npm run web
```

### Building

```bash
# Build shared package first
cd packages/shared && npm run build

# Build mobile app
npm run build:mobile

# Build web dashboard
npm run build:web
```

## Workspaces

### `apps/mobile`
React Native app built with Expo for iOS and Android.
- **Tech**: React Native, Expo, TypeScript
- **Features**: Barcode scanning, camera, push notifications, offline support
- **Run**: `npm run mobile` or `cd apps/mobile && npm start`

### `apps/web`
Web dashboard for advanced planning and analytics.
- **Tech**: Vite, React, TypeScript
- **Features**: Detailed charts, meal planning, data export
- **Run**: `npm run web` or `cd apps/web && npm run dev`

### `packages/shared`
Shared TypeScript types, utilities, and API clients used by both apps.
- **Tech**: TypeScript
- **Exports**: Types (MacroTargets, FoodItem, Meal, etc.), utility functions
- **Usage**: Import with `@meal-planning/shared`

## Using the Shared Package

Both apps can import from the shared package:

```typescript
import { MacroTargets, FoodItem, calculateMacros } from '@meal-planning/shared';

const targets: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};
```

## Development Workflow

1. **Make changes to shared package**: Edit files in `packages/shared/src/`
2. **Rebuild shared package**: `cd packages/shared && npm run build`
3. **Use in apps**: Import from `@meal-planning/shared` - TypeScript will pick up changes

For faster development, you can run the shared package in watch mode:
```bash
cd packages/shared && npm run dev
```

## Tech Stack

- **Mobile**: React Native + Expo + TypeScript
- **Web**: Vite + React + TypeScript
- **Shared**: TypeScript utilities and types
- **Monorepo**: npm workspaces

## Next Steps

- Add food database integration
- Implement barcode scanning (Expo Camera)
- Add charting library for progress tracking
- Set up state management (Redux/Zustand)
- Add API layer for syncing data

