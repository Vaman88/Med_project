import { matchRecipes } from "../../../lib/planning";
import { foodResources } from "../../../lib/resources";
import { apiHandler, apiResponse, assistantInputSchema, readJson } from "../../../lib/validation";
import { resolvePlanningProfile } from '../../../lib/planning-profile';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const { profile, pantry, prices, message } = await readJson(request, assistantInputSchema);
    const distress = /binge|purge|loss of control|out of control|guilt|guilty|eating disorder|skip.*meal|fasting|compensat/i.test(message);
    const medical = /calorie|weight|bmi|diagnos|diabet|medical|treat|disease/i.test(message);
    const resolved = await resolvePlanningProfile(request, profile);
    const matches = matchRecipes(resolved, pantry, { prices, allowSyntheticDemo: true });
    const response = {
      demo: true,
      mode: "deterministic-fallback",
      message: distress
        ? "Feeling distressed around eating can be hard. You deserve support. A qualified professional can help, and the NIMH resource explains where to seek care. Keep regular meals; this planner does not recommend compensating for eating."
        : medical
          ? "This demo offers practical meal options, not medical treatment or personal calorie targets. Discuss prescribed restrictions with your clinician. Compatible options below follow the restrictions you entered."
          : matches.length
            ? "These prototype options fit your current restrictions and equipment. Open a recipe for its measured ingredients and instructions, or use the planner to calculate purchases. No live AI is connected."
            : "No prototype recipe fits your current settings. Review your equipment and ingredient information, or use the public food-support resources. You can keep planning manually.",
      recipe_ids: matches.slice(0, 3).map((match) => match.recipe.id),
      proposed_action: null,
      clarifying_question: null,
      resource_ids: foodResources.filter((resource) => distress ? resource.topic === "eating-support" : ["food-support", "benefits"].includes(resource.topic)).map((resource) => resource.id),
    };
    return apiResponse(response);
  });
}

