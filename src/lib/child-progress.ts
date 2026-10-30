import { z } from "zod";
import { dishSchema, type DishState } from "./cooking";

export const CHILD_PROGRESS_KEY = "healthy-steps-child-progress-v1";
export const childProgressSchema = z
  .object({
    version: z.literal(1),
    completed: z.record(z.string(), z.number().int().min(0).max(999)),
    stars: z.number().int().min(0).max(9999),
    // The dish the child actually made, kept per recipe for the cookbook.
    creations: z.record(z.string().max(40), dishSchema).optional(),
  })
  .strict();
export type ChildProgress = z.infer<typeof childProgressSchema>;
export const emptyProgress = (): ChildProgress => ({
  version: 1,
  completed: {},
  stars: 0,
});

export function awardRecipe(
  progress: ChildProgress,
  recipeId: string,
  quizStars: number,
): ChildProgress {
  return childProgressSchema.parse({
    ...progress,
    completed: {
      ...progress.completed,
      [recipeId]: Math.min(999, (progress.completed[recipeId] ?? 0) + 1),
    },
    stars: Math.min(9999, progress.stars + 1 + quizStars),
  });
}

export function saveCreation(
  progress: ChildProgress,
  recipeId: string,
  dish: DishState,
): ChildProgress {
  return childProgressSchema.parse({
    ...progress,
    creations: { ...progress.creations, [recipeId]: dish },
  });
}
