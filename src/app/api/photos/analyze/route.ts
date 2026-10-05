import { apiResponse } from "../../../../lib/validation";

export async function POST(): Promise<Response> {
  // Deliberately never read, upload, store, or send a photo in this local demo.
  return apiResponse({
    error: { code: "PHOTO_PROCESSING_DISABLED", message: "Photo processing is unavailable in this demo. Add ingredients manually; planning is still available." },
    manualEntryAvailable: true,
  }, 503);
}
