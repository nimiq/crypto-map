/**
 * Time-based contextual categories algorithm
 * Returns relevant category suggestions based on the current time of day
 */

export interface ContextualCarousel {
  title: string
  icon: string
  categories: string[]
}

export interface TimeContext {
  primary: ContextualCarousel
  secondary: ContextualCarousel
}

/**
 * Get contextual category suggestions based on current time
 * Uses Lugano timezone (Europe/Zurich) for consistency
 */
export function getContextualCategories(date: Date = new Date()): TimeContext {
  // Convert to Lugano timezone
  const luganoTime = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
  const hour = luganoTime.getHours()

  // Early Morning (5:00 - 8:00) - Start Your Day
  if (hour >= 5 && hour < 8) {
    return {
      primary: { title: 'contextual.startYourDay', icon: 'i-tabler:coffee', categories: ['coffee_shop', 'cafe', 'bakery'] },
      secondary: { title: 'contextual.morningWorkout', icon: 'i-tabler:barbell', categories: ['gym', 'fitness_center'] },
    }
  }

  // Morning (8:00 - 11:00) - Morning Essentials
  if (hour >= 8 && hour < 11) {
    return {
      primary: { title: 'contextual.morningCoffee', icon: 'i-tabler:coffee', categories: ['coffee_shop', 'cafe', 'bakery'] },
      secondary: { title: 'contextual.selfCare', icon: 'i-tabler:scissors', categories: ['hair_salon', 'barber_shop', 'beauty_salon'] },
    }
  }

  // Lunch Time (11:00 - 14:30) - Lunch Spots
  if (hour >= 11 && hour < 15) {
    return {
      primary: { title: 'contextual.lunchSpots', icon: 'i-tabler:tools-kitchen-2', categories: ['restaurant', 'italian_restaurant', 'pizza_restaurant', 'sandwich_shop', 'deli'] },
      secondary: { title: 'contextual.quickBite', icon: 'i-tabler:cup', categories: ['cafe', 'cafeteria', 'food_delivery'] },
    }
  }

  // Afternoon (14:30 - 17:00) - Afternoon Break
  if (hour >= 15 && hour < 17) {
    return {
      primary: { title: 'contextual.afternoonBreak', icon: 'i-tabler:ice-cream-2', categories: ['cafe', 'coffee_shop', 'ice_cream_shop', 'dessert_shop'] },
      secondary: { title: 'contextual.relaxation', icon: 'i-tabler:massage', categories: ['beauty_salon', 'nail_salon', 'spa', 'massage'] },
    }
  }

  // Early Evening (17:00 - 19:00) - After Work
  if (hour >= 17 && hour < 19) {
    return {
      primary: { title: 'contextual.afterWork', icon: 'i-tabler:glass-cocktail', categories: ['restaurant', 'bar', 'pub', 'wine_bar'] },
      secondary: { title: 'contextual.eveningWorkout', icon: 'i-tabler:barbell', categories: ['gym', 'fitness_center'] },
    }
  }

  // Evening (19:00 - 22:00) - Dinner & Drinks
  if (hour >= 19 && hour < 22) {
    return {
      primary: { title: 'contextual.dinnerTime', icon: 'i-tabler:tools-kitchen-2', categories: ['restaurant', 'italian_restaurant', 'seafood_restaurant', 'pizza_restaurant'] },
      secondary: { title: 'contextual.drinks', icon: 'i-tabler:glass-cocktail', categories: ['bar', 'pub', 'wine_bar'] },
    }
  }

  // Late Night (22:00 - 2:00) - Nightlife
  if (hour >= 22 || hour < 2) {
    return {
      primary: { title: 'contextual.nightlife', icon: 'i-tabler:moon-stars', categories: ['bar', 'pub', 'wine_bar'] },
      secondary: { title: 'contextual.lateNight', icon: 'i-tabler:clock-hour-11', categories: ['restaurant', 'meal_takeaway'] },
    }
  }

  // Very Late (2:00 - 5:00) - Open Now focus
  return {
    primary: { title: 'contextual.openNow', icon: 'i-tabler:clock', categories: [] }, // Empty means "any category, just open now"
    secondary: { title: 'contextual.emergency', icon: 'i-tabler:first-aid-kit', categories: ['pharmacy', 'drugstore', 'hospital'] },
  }
}
