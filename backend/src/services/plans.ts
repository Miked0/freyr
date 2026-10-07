/**
 * What an account may use. Every account is on the free plan for now; the subscription plans will each
 * get their own limits here.
 */
export const FREE_PLAN = {
  /** Categories a user may create on top of the default ones. */
  customCategories: 10,
} as const;
