/** "Eli" and "Chef Eli" both become "Chef Eli", never "Chef Chef Eli". */
export function chefTitle(nickname?: string): string {
  const name = (nickname ?? "").trim().replace(/^chef\b[\s,.:-]*/i, "").trim();
  return `Chef ${name || "Friend"}`;
}
