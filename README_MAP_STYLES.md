# Map Styles Guide

This project includes MapLibre GL styles adapted for the Nimiq design system.

## Files

- **`app/assets/nimiq-map-style.json`** - Original style from `~/nimiq/ui/packages/nimiq-maplibre-styles`
- **`app/assets/nimiq-map-style-adapted.json`** - Adapted version using Nimiq OKLCH colors
- **`scripts/adapt-map-colors.mjs`** - Automated color conversion script
- **`COLOR_MAPPING.md`** - Detailed color mapping documentation

## Usage

### In Your MapLibre Component

```typescript
import mapStyle from '~/assets/nimiq-map-style-adapted.json'

const map = new maplibregl.Map({
  container: 'map',
  style: mapStyle,
  // ... other options
})
```

### Re-running Color Adaptation

If you update the original style or want to adjust color mappings:

```bash
# Edit color mappings in scripts/adapt-map-colors.mjs
node scripts/adapt-map-colors.mjs
```

## Color System

All colors use **OKLCH** format for perceptual uniformity:

- `oklch(lightness chroma hue)` - Standard format
- `oklch(l c h) / opacity` - With transparency

### Key Color Mappings

- **Backgrounds**: neutral-50, neutral-100 (warm light tones)
- **Nature/Parks**: green-400 to green-600 (subtle greens)
- **Water**: blue-400 (very light blue)
- **Roads/Infrastructure**: neutral-300 to neutral-800 (grays)
- **Buildings**: red-400 (hospitals), gold-400 (schools)

## Design Principles

1. **Subtle colors** - Uses lighter tints (400-600 range) for map elements
2. **High contrast text** - Reserves dark colors (700+) for labels/roads
3. **Perceptual uniformity** - OKLCH ensures consistent brightness across hues
4. **Brand consistency** - All colors from Nimiq CSS design system

## Updating from Upstream

To pull latest styles from `~/nimiq/ui`:

```bash
cp ~/nimiq/ui/packages/nimiq-maplibre-styles/nimiq-maplibre-light.json app/assets/nimiq-map-style.json
node scripts/adapt-map-colors.mjs
```

## Statistics

- **Total color replacements**: 54
- **Original size**: 87KB
- **Adapted size**: 130KB (includes formatted JSON)
- **Color palette**: 7 Nimiq colors with variants

See `COLOR_MAPPING.md` for complete color mapping details.
