/** The chef companion every child gets; there is no naming step. */
export const DEFAULT_CHEF_NAME = "Seedy";

/**
 * "Eli" and "Chef Eli" both become "Chef Eli", never "Chef Chef Eli". Profiles saved before the
 * naming step was removed may still carry a nickname; with none, the chef is "Chef Seedy".
 */
export function chefTitle(nickname?: string): string {
  const name = (nickname ?? "").trim().replace(/^chef\b[\s,.:-]*/i, "").trim();
  return `Chef ${name || DEFAULT_CHEF_NAME}`;
}
