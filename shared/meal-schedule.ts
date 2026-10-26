import type { MealPreferences } from './types';

export function mealSlotsForPreferences(preferences: MealPreferences): string[] {
  if (preferences.mealSlots?.length === preferences.mealsPerDay) return preferences.mealSlots;
  return preferences.mealsPerDay === 1
    ? [preferences.singleMeal || (preferences.wants.includes('breakfast') ? '早餐' : '晚餐')]
    : preferences.mealsPerDay === 2
      ? ['午餐', '晚餐']
      : preferences.mealsPerDay === 3
        ? ['早餐', '午餐', '晚餐']
        : ['早餐', '午餐', '晚餐', '加餐'];
}
