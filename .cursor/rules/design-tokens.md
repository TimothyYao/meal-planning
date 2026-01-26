# Design Tokens - Agent Instructions

## Overview

This project uses a centralized design system with style tokens defined in `@meal-planning/shared`. **Always use these tokens instead of hardcoded values** when working with styling, colors, spacing, or typography.

## Importing Tokens

```typescript
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
```

## Rules for Using Design Tokens

### 1. Spacing
- **ALWAYS** use `spacing.*` tokens for padding, margins, and gaps
- **NEVER** hardcode spacing values like `padding: 20` or `margin: 16`
- Available tokens: `xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 20`, `2xl: 24`, `3xl: 30`, `4xl: 32`

**Examples:**
```typescript
// ✅ CORRECT
padding: spacing.xl
marginBottom: spacing.lg
gap: spacing.md

// ❌ WRONG
padding: 20
marginBottom: 16
gap: 12
```

### 2. Font Sizes
- **ALWAYS** use `fontSize.*` tokens for typography
- **NEVER** hardcode font sizes like `fontSize: 16` or `fontSize: 20`
- Available tokens: `xs: 12`, `sm: 14`, `base: 16`, `md: 17`, `lg: 18`, `xl: 20`, `2xl: 22`, `3xl: 28`, `4xl: 32`

**Examples:**
```typescript
// ✅ CORRECT
fontSize: fontSize['3xl']  // for large titles
fontSize: fontSize.xl     // for section titles
fontSize: fontSize.base    // for body text
fontSize: fontSize.sm      // for secondary text

// ❌ WRONG
fontSize: 28
fontSize: 20
fontSize: 16
```

### 3. Font Colors
- **ALWAYS** use `fontColor.*` tokens for text colors
- **NEVER** hardcode text colors like `color: '#000'` or `color: '#666'`
- Available tokens: `primary`, `secondary`, `tertiary`, `quaternary`, `disabled`, `inverse`

**Examples:**
```typescript
// ✅ CORRECT
color: fontColor.primary    // main text
color: fontColor.secondary  // body text
color: fontColor.tertiary   // labels
color: fontColor.disabled   // disabled text

// ❌ WRONG
color: '#000'
color: '#333'
color: '#666'
```

### 4. Colors
- **ALWAYS** use `colors.*` tokens for all colors (backgrounds, borders, buttons, etc.)
- **NEVER** hardcode colors like `backgroundColor: '#007AFF'` or `color: '#fff'`
- Use semantic color names based on purpose, not appearance

**Examples:**
```typescript
// ✅ CORRECT
backgroundColor: colors.primary              // primary buttons
backgroundColor: colors.background.secondary // card backgrounds
borderColor: colors.border.light            // borders
color: colors.status.success                // success messages
color: colors.cancel                         // cancel buttons

// ❌ WRONG
backgroundColor: '#007AFF'
backgroundColor: '#f9f9f9'
borderColor: '#e0e0e0'
color: '#34c759'
```

## Platform-Specific Considerations

### React Native (Mobile)
- Tokens are numbers, use directly:
```typescript
const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
});
```

### React (Web)
- May need to add 'px' units for CSS:
```typescript
const styles = {
  container: {
    padding: `${spacing.xl}px`,
    backgroundColor: colors.background.primary,
  },
};
```

## Common Patterns

### Buttons
```typescript
// Primary button
backgroundColor: colors.primary
color: fontColor.inverse
paddingVertical: spacing.md
paddingHorizontal: spacing.xl
fontSize: fontSize.base

// Cancel button
backgroundColor: 'transparent'
color: colors.cancel
borderColor: colors.border.medium
```

### Cards
```typescript
backgroundColor: colors.background.secondary
padding: spacing.lg
borderRadius: 12
borderWidth: 1
borderColor: colors.border.light
```

### Text Styles
```typescript
// Page title
fontSize: fontSize['3xl']
color: fontColor.primary
fontWeight: 'bold'
marginBottom: spacing.lg

// Section title
fontSize: fontSize.xl
color: fontColor.primary
fontWeight: '600'
marginBottom: spacing.md

// Body text
fontSize: fontSize.base
color: fontColor.secondary

// Secondary text
fontSize: fontSize.sm
color: fontColor.tertiary
```

## When Adding New Components

1. **Import tokens first** at the top of the file
2. **Use tokens for all styling** - no hardcoded values
3. **Choose semantic tokens** - use `colors.primary` not `colors.status.info` for primary actions
4. **Maintain consistency** - use the same tokens for similar UI elements across the app

## Migration Checklist

When updating existing code:
- [ ] Replace all hardcoded spacing values with `spacing.*` tokens
- [ ] Replace all hardcoded font sizes with `fontSize.*` tokens
- [ ] Replace all hardcoded text colors with `fontColor.*` tokens
- [ ] Replace all hardcoded colors with `colors.*` tokens
- [ ] Test on both mobile and web platforms
- [ ] Verify visual consistency

## Reference

- Full documentation: `doc/design-system.md`
- Token definitions: `packages/shared/src/tokens.ts`
- Export location: `packages/shared/src/index.ts`
