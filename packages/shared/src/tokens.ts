/**
 * Design tokens for the meal planning app
 * These tokens provide a consistent design system across mobile and web platforms
 */

/**
 * Spacing tokens
 * Used for padding, margins, and gaps
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 32,
} as const;

/**
 * Font size tokens
 * Used for typography across the app
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 17,
  lg: 18,
  xl: 20,
  '2xl': 22,
  '3xl': 28,
  '4xl': 32,
} as const;

/**
 * Font color tokens
 * Used for text colors
 */
export const fontColor = {
  primary: '#000000',
  secondary: '#333333',
  tertiary: '#666666',
  quaternary: '#999999',
  disabled: '#8E8E93',
  inverse: '#FFFFFF',
} as const;

/**
 * Color tokens
 * Used for backgrounds, borders, and UI elements
 */
export const colors = {
  // Primary brand color
  primary: '#007AFF',
  
  // Secondary color
  secondary: '#8E8E93',
  
  // Cancel/destructive color
  cancel: '#FF3B30',
  
  // Background colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9F9F9',
    tertiary: '#F0F0F0',
    inverse: '#000000',
  },
  
  // Border colors
  border: {
    light: '#E0E0E0',
    medium: '#C7C7CC',
    dark: '#8E8E93',
  },
  
  // Status colors
  status: {
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#007AFF',
  },
  
  // Semantic colors
  semantic: {
    destructive: '#FF3B30',
    warning: '#FF9500',
    info: '#1976D2',
  },
} as const;

/**
 * Type exports for TypeScript
 */
export type Spacing = typeof spacing[keyof typeof spacing];
export type FontSize = typeof fontSize[keyof typeof fontSize];
export type FontColor = typeof fontColor[keyof typeof fontColor];
export type Color = typeof colors[keyof typeof colors];
