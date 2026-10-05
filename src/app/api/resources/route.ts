import { foodResources } from "../../../lib/resources";
import { apiResponse } from "../../../lib/validation";

export async function GET(): Promise<Response> {
  return apiResponse({ resources: foodResources, scope: "National entry points only. No local availability, hours, eligibility, or distance claims." });
}
