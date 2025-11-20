# Map Style Color Mapping

This document defines how the original map colors are mapped to Nimiq design system colors.

## Nimiq Color System

Colors are defined in `~/nimiq/ui/packages/nimiq-css/src/colors.ts` using OKLCH color space.

### Key Colors Available

- **Neutral**: `neutral-0` to `neutral-900` (light to dark grays/blues)
- **Blue**: `blue` (primary), `blue-400` to `blue-600` (tints)
- **Green**: `green` (primary), `green-400` to `green-600` (tints)
- **Orange**: `orange` (primary), `orange-400` to `orange-600` (tints)
- **Gold**: `gold` (primary), `gold-400` to `gold-600` (tints)
- **Red**: `red` (primary), `red-400` to `red-600` (tints)
- **Purple**: `purple` (primary), `purple-400` to `purple-600` (tints)

## Color Mapping Strategy

### Background & Base Colors

- **Background** `rgba(252, 247, 229, 1)` → `oklch(0.9881 0 89.88)` (neutral-50) - Warm light background
- **Residential** `rgba(233, 227, 210, 0.8)` → `oklch(0.9677 0.0027 286.35)` (neutral-200) with opacity
- **Roads base** grays → neutral-400 to neutral-600 range

### Green/Nature Colors

- **Grass/Parks** green tones → `oklch(0.9637 0.017 187.9)` (green-400) - Very light green
- **Forest** darker greens → `oklch(0.9307 0.034 185.2)` (green-500) - Light green
- **Park outlines** `rgba(167, 203, 131, 1)` → `oklch(0.9154 0.0432 185.62)` (green-600) - Soft green

### Water Colors

- **Water bodies** blues → `oklch(0.9545 0.0167 236.69)` (blue-400) - Very light blue
- **Water outlines** darker blues → `oklch(0.9109 0.0327 232.24)` (blue-500) - Light blue

### Special Purpose

- **Hospital** pinkish → `oklch(0.9544 0.0166 26.65)` (red-400) - Very light red
- **School/Stadium** yellowish → `oklch(0.9765 0.022 89.79)` (gold-400) - Very light gold

### Text & Labels

- **Primary text** → `oklch(0.2737 0.068 276.29)` (neutral/darkblue) - Dark text
- **Secondary text** → `oklch(0.4374 0.0495 279.71)` (neutral-900 light mode) - Medium dark

### Roads & Infrastructure

- **Major roads** → neutral-700 to neutral-800
- **Minor roads** → neutral-400 to neutral-500
- **Bridges/tunnels** → neutral-600

## Implementation Notes

1. All colors use OKLCH for perceptual uniformity
2. Opacity values preserved from original where applicable
3. Light mode colors used (first value in light-dark arrays)
4. Consider adding dark mode variant later using second values

## Color Format Conversion

MapLibre accepts:

- `rgba(r, g, b, a)` format
- `hsl(h, s%, l%)` format
- `oklch(l c h)` format ✅ (preferred for Nimiq)

We'll convert all colors to OKLCH format for consistency with Nimiq design system.
