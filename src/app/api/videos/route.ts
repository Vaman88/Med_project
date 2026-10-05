import { videoResources } from "../../../lib/resources";
import { apiResponse } from "../../../lib/validation";

export async function GET(): Promise<Response> {
  return apiResponse({ videos: videoResources, message: "Individual videos, captions, and embedding permissions require review before publication." });
}
