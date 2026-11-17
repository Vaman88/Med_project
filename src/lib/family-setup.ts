import type { Family } from "./little-kitchen";

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
 * Chef fields to save from the setup wizard. Profiles saved before the naming step was removed keep
 * their nickname and look; new profiles get the default look and no nickname (shown as Chef Seedy).
 */
export function keptChefFields(initial: Family | null): Pick<Family, "nickname" | "avatar"> {
  return { nickname: initial?.nickname, avatar: initial?.avatar ?? { ...DEFAULT_AVATAR } };
}

/** Whether an older profile still carries a custom chef name or look that a parent may clear. */
export function hasCustomChef(family: Family): boolean {
  const look = family.avatar;
  return (
    !!family.nickname?.trim() ||
    (!!look && (look.skin !== DEFAULT_AVATAR.skin || look.hair !== DEFAULT_AVATAR.hair || look.apron !== DEFAULT_AVATAR.apron))
  );
}

/** Clears a legacy custom chef so the child gets the default companion, Chef Seedy. */
export function resetChef(family: Family): Family {
  const { nickname: _nickname, avatar: _avatar, ...rest } = family;
  return rest;
}
