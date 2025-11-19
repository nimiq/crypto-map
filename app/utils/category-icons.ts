/**
 * Map category IDs to icon names
 * Icons are loaded from public/assets/icons/categories/*.svg
 */

export const CATEGORY_ICONS = {
    DEFAULT: 'misc',
} as const

// Category patterns to icon mappings (ordered by specificity)
const ICON_PATTERNS: Array<{ pattern: RegExp, icon: string }> = [
    // Food & Drink
    { pattern: /restaurant|food|meal|buffet|grill|lunch|dinner/, icon: 'restaurant' },
    { pattern: /cafe|coffee|tea|juice|ice_cream|bakery|dessert/, icon: 'cafe' },
    { pattern: /bar|pub|club|wine|beer|brewery/, icon: 'bar' },

    // Retail
    { pattern: /supermarket|grocery|convenience/, icon: 'grocery' },
    { pattern: /pharmacy|drugstore/, icon: 'pharmacy' },
    { pattern: /shopping|store|mall|clothing|fashion|jewelry|retail/, icon: 'shopping' },

    // Services
    { pattern: /atm/, icon: 'atm' },
    { pattern: /bank|finance/, icon: 'bank' },
    { pattern: /gas_station|fuel/, icon: 'gas' },
    { pattern: /post_office|mail/, icon: 'post_office' },
    { pattern: /lodging|hotel|motel|hostel/, icon: 'lodging' },

    // Entertainment
    { pattern: /movie|cinema|film/, icon: 'movie' },
    { pattern: /theater|theatre|concert/, icon: 'theater' },
    { pattern: /museum|gallery|art/, icon: 'museum' },
    { pattern: /aquarium/, icon: 'aquarium' },
    { pattern: /casino|gambling/, icon: 'misc' }, // Fallback

    // Transportation
    { pattern: /airport/, icon: 'airport' },
    { pattern: /train|subway|metro|rail/, icon: 'train' },
    { pattern: /bus/, icon: 'bus' },

    // Outdoor
    { pattern: /golf/, icon: 'golf' },
    { pattern: /park|garden|nature/, icon: 'golf' }, // Fallback to golf or misc? golf is specific. Let's use misc for generic park if no tree icon.
    { pattern: /historic|monument|landmark/, icon: 'historic' },

    // Emergency
    { pattern: /hospital|medical|clinic|doctor/, icon: 'pharmacy' }, // Fallback
]

/**
 * Get icon name for a category ID
 */
export function getCategoryIcon(categoryId: string): string {
    for (const { pattern, icon } of ICON_PATTERNS) {
        if (pattern.test(categoryId)) {
            return icon
        }
    }
    return CATEGORY_ICONS.DEFAULT
}
