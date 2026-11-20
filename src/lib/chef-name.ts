/** The chef companion every child gets; there is no naming step anywhere in the app. */
export const DEFAULT_CHEF_NAME = "Seedy";

/**
 * The companion's title. It is always "Chef Seedy": a nickname saved by an older version of the
 * app (when children could name their chef) is ignored, so no profile shows a custom chef name.
 * The parameter stays so older callers keep compiling.
 */
export function chefTitle(_legacyNickname?: string): string {
  return `Chef ${DEFAULT_CHEF_NAME}`;
}
