# Design System

This document describes the design system and style tokens used across the meal planning app.

## Overview

The app uses a centralized design system implemented in the `@meal-planning/shared` package. This ensures consistency across both mobile (React Native) and web (React) platforms.

## Style Tokens

All design tokens are defined in `packages/shared/src/tokens.ts` and exported from `@meal-planning/shared`.

### Spacing Tokens

Spacing tokens are used for padding, margins, and gaps throughout the app.

```typescript
import { spacing } from '@meal-planning/shared';

// Available tokens:
spacing.xs    // 4px
spacing.sm    // 8px
spacing.md    // 12px
spacing.lg    // 16px
spacing.xl    // 20px
spacing['2xl'] // 24px
spacing['3xl'] // 30px
spacing['4xl'] // 32px
```

**Usage Examples:**
- `padding: spacing.lg` - Standard padding for cards
- `marginBottom: spacing.xl` - Section spacing
- `gap: spacing.md` - Gap between flex items

### Font Size Tokens

Font size tokens provide consistent typography across the app.

```typescript
import { fontSize } from '@meal-planning/shared';

// Available tokens:
fontSize.xs     // 12px
fontSize.sm     // 14px
fontSize.base   // 16px
fontSize.md     // 17px
fontSize.lg     // 18px
fontSize.xl     // 20px
fontSize['2xl'] // 22px
fontSize['3xl'] // 28px
fontSize['4xl'] // 32px
```

**Usage Examples:**
- `fontSize: fontSize['3xl']` - Large page titles
- `fontSize: fontSize.xl` - Section titles
- `fontSize: fontSize.base` - Body text
- `fontSize: fontSize.sm` - Secondary text

### Font Color Tokens

Font color tokens define text colors with semantic meaning.

```typescript
import { fontColor } from '@meal-planning/shared';

// Available tokens:
fontColor.primary    // #000000 - Main text
fontColor.secondary  // #333333 - Secondary text
fontColor.tertiary   // #666666 - Tertiary text
fontColor.quaternary // #999999 - Quaternary text
fontColor.disabled   // #8E8E93 - Disabled text
fontColor.inverse    // #FFFFFF - Text on dark backgrounds
```

**Usage Examples:**
- `color: fontColor.primary` - Main headings and important text
- `color: fontColor.secondary` - Body text
- `color: fontColor.tertiary` - Labels and secondary information
- `color: fontColor.disabled` - Disabled form fields

### Color Tokens

Color tokens define the app's color palette including primary, secondary, cancel, backgrounds, borders, and status colors.

```typescript
import { colors } from '@meal-planning/shared';

// Primary colors
colors.primary   // #007AFF - Primary brand color (iOS blue)
colors.secondary // #8E8E93 - Secondary color
colors.cancel    // #FF3B30 - Cancel/destructive actions

// Background colors
colors.background.primary   // #FFFFFF - Main background
colors.background.secondary // #F9F9F9 - Card backgrounds
colors.background.tertiary  // #F0F0F0 - Subtle backgrounds
colors.background.inverse    // #000000 - Dark backgrounds

// Border colors
colors.border.light  // #E0E0E0 - Light borders
colors.border.medium // #C7C7CC - Medium borders
colors.border.dark   // #8E8E93 - Dark borders

// Status colors
colors.status.success // #34C759 - Success states
colors.status.error   // #FF3B30 - Error states
colors.status.warning  // #FF9500 - Warning states
colors.status.info     // #007AFF - Info states

// Semantic colors
colors.semantic.destructive // #FF3B30 - Destructive actions
colors.semantic.warning    // #FF9500 - Warning actions
colors.semantic.info        // #1976D2 - Informational actions
```

**Usage Examples:**
- `backgroundColor: colors.primary` - Primary buttons
- `backgroundColor: colors.background.secondary` - Card backgrounds
- `borderColor: colors.border.light` - Card borders
- `color: colors.status.success` - Success messages
- `color: colors.cancel` - Cancel buttons

## Platform-Specific Usage

### React Native (Mobile)

```typescript
import { StyleSheet } from 'react-native';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  title: {
    fontSize: fontSize['3xl'],
    color: fontColor.primary,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: fontSize.base,
    color: fontColor.inverse,
  },
});
```

### React (Web)

```typescript
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

const styles = {
  container: {
    padding: `${spacing.xl}px`,
    backgroundColor: colors.background.primary,
  },
  title: {
    fontSize: `${fontSize['3xl']}px`,
    color: fontColor.primary,
    marginBottom: `${spacing.lg}px`,
  },
  button: {
    backgroundColor: colors.primary,
    padding: `${spacing.md}px ${spacing.xl}px`,
    borderRadius: '8px',
  },
  buttonText: {
    fontSize: `${fontSize.base}px`,
    color: fontColor.inverse,
  },
};
```

Or with CSS:

```css
.container {
  padding: var(--spacing-xl);
  background-color: var(--color-background-primary);
}

.title {
  font-size: var(--font-size-3xl);
  color: var(--font-color-primary);
  margin-bottom: var(--spacing-lg);
}
```

## Best Practices

1. **Always use tokens** - Never hardcode colors, spacing, or font sizes
2. **Use semantic names** - Choose tokens based on meaning, not appearance
3. **Maintain consistency** - Use the same token for similar UI elements
4. **Platform considerations** - React Native uses numbers, web may need units (px)
5. **Accessibility** - Ensure sufficient contrast when using color tokens

## Adding New Tokens

When adding new design tokens:

1. Add the token to `packages/shared/src/tokens.ts`
2. Export it from `packages/shared/src/index.ts`
3. Rebuild the shared package: `npm run build` in `packages/shared`
4. Update this documentation
5. Consider backward compatibility

## Migration Guide

When migrating existing code to use tokens:

1. Replace hardcoded colors with `colors.*` tokens
2. Replace hardcoded spacing with `spacing.*` tokens
3. Replace hardcoded font sizes with `fontSize.*` tokens
4. Replace hardcoded text colors with `fontColor.*` tokens
5. Test on both mobile and web platforms

## Related Documentation

- [Architecture](./architecture.md) - Technical architecture overview
- [Data Models](./data-models.md) - Data structure documentation
