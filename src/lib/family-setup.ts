import { pantryFoods, type Family } from "./little-kitchen";

/** Parent setup steps, in order. There is no chef naming step: every child gets Chef Seedy. */
export const SETUP_STEPS = ["Your pantry", "Foods to avoid", "Family details"] as const;
export type ProfileStep = 0 | 1 | 2;
/** Wizard step index for each child-profile section's Edit button. */
export const PROFILE_STEP = { pantry: 0, avoid: 1, details: 2 } as const satisfies Record<string, ProfileStep>;
export const LAST_SETUP_STEP = (SETUP_STEPS.length - 1) as ProfileStep;

export const DEFAULT_AVATAR = { skin: "tan", hair: "curly", apron: "coral" } as const;

/** The child's age as typed on the Family details step: a whole number from 5 to 17. */
export function validChildAge(age: string): boolean {
  const value = Number(age);
  return age.trim() !== "" && Number.isInteger(value) && value >= 5 && value <= 17;
}

/**
 * Chef fields to save from the setup wizard. The companion is always Chef Seedy, so a nickname from
 * an older save is dropped; an older custom look is kept until a grown-up resets it.
 */
export function keptChefFields(initial: Family | null): Pick<Family, "avatar"> {
  return { avatar: initial?.avatar ?? { ...DEFAULT_AVATAR } };
}

/** Drops a chef nickname saved by an older version of the app. Returns the same object when there is none. */
export function withoutLegacyNickname(family: Family): Family {
  if (!("nickname" in family)) return family;
  const { nickname: _nickname, ...rest } = family;
  return rest;
}

/** Whether an older profile still carries a custom chef look that a parent may reset. */
export function hasCustomChef(family: Family): boolean {
  const look = family.avatar;
  return !!look && (look.skin !== DEFAULT_AVATAR.skin || look.hair !== DEFAULT_AVATAR.hair || look.apron !== DEFAULT_AVATAR.apron);
}

/** Clears a legacy custom chef so the child gets the default companion, Chef Seedy. */
export function resetChef(family: Family): Family {
  const { nickname: _nickname, avatar: _avatar, ...rest } = family;
  return rest;
}

/**
 * Type-ahead pantry search: foods from the app's list whose name contains the typed text anywhere
 * (any case), names that start with it first, at most 8, skipping foods already added. `custom` is
 * the typed text when it is not a known food and not added yet, so it can be saved as a custom food.
 */
export function pantryMatches(query: string, selected: readonly string[]): { matches: string[]; custom: string | null } {
  const term = query.trim();
  const lower = term.toLowerCase();
  if (!term) return { matches: [], custom: null };
  const added = (food: string) => selected.some((item) => item.toLowerCase() === food.toLowerCase());
  const matches = pantryFoods
    .filter((food) => food.toLowerCase().includes(lower) && !added(food))
    .sort((a, b) => Number(b.toLowerCase().startsWith(lower)) - Number(a.toLowerCase().startsWith(lower)))
    .slice(0, 8);
  const known = pantryFoods.some((food) => food.toLowerCase() === lower);
  return { matches, custom: term.length <= 80 && !known && !added(term) ? term : null };
}
