export interface PublicResource {
  id: string; title: string; publisher: string; url: string; description: string;
  topic: "food-support" | "benefits" | "eating-support"; verifiedAt: string; phone?: string;
}
// Link existence and destination checked September 30, 2026. Local hours and eligibility are not inferred.
export const foodResources: PublicResource[] = [
  { id: "feeding-america", title: "Find a food bank", publisher: "Feeding America", url: "https://www.feedingamerica.org/find-your-local-foodbank", description: "Enter your ZIP on the locator to find your network food bank and its local pantry referrals. Confirm distribution sites and hours with the provider.", topic: "food-support", verifiedAt: "2026-09-30" },
  { id: "211", title: "Talk to someone about food support", publisher: "United Way 211", url: "https://www.211.org/get-help/food-programs-food-benefits", description: "Find food programs and application help in your community. You can also call 211.", topic: "food-support", verifiedAt: "2026-09-30", phone: "211" },
  { id: "snap", title: "Find your official SNAP application", publisher: "USA.gov", url: "https://www.usa.gov/food-stamps", description: "Follow the official guide to your state or local SNAP office. Your state determines eligibility and explains the documents and interview it needs.", topic: "benefits", verifiedAt: "2026-09-30" },
  { id: "nimh", title: "Support for distress around eating", publisher: "National Institute of Mental Health", url: "https://www.nimh.nih.gov/health/publications/eating-disorders", description: "Read about eating concerns and finding professional help. If eating feels distressing or out of control, you deserve support from a qualified care professional.", topic: "eating-support", verifiedAt: "2026-09-30" }
];
// Individual video destinations, captions, suitability and embed permissions need review before publication.
export const videoResources: PublicResource[] = [];
