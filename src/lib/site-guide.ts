import type { HouseholdProfile } from './domain';

export type GuideDestination = 'home' | 'meals' | 'learn' | 'help' | 'food' | 'allergies';
export type GuideAction = { label: string; destination: GuideDestination };
export type GuideReply = { text: string; actions: GuideAction[] };
const action = (label: string, destination: GuideDestination): GuideAction => ({ label, destination });

// Answers describe actual site features. No external AI service or credentials are needed.
export function siteGuideReply(message: string, profile: HouseholdProfile, pantryCount: number, previousTopic = ''): GuideReply {
  const text = message.toLowerCase().trim();
  const topic = /^(how|where|show me|take me there|tell me more|yes)[?.! ]*$/.test(text) ? previousTopic : text;
  if (/allerg|nuts?|peanut|sesame/.test(topic)) return {
    text: 'Open My food, choose With a grown-up, then Allergies. Start typing a food and select its name from the menu. If you add free text, confirm the proposed match or clarify it. Member-specific confirmed allergies require caregiver sign-in and Save before meal suggestions. In the demo, you can select shared household allergies on Home.',
    actions: [action('Open allergy settings', 'allergies')],
  };
  if (/no (meals|recipes|options)|nothing.*(fit|match)|not.*(finding|matching)|can.t find/.test(topic)) return {
    text: 'If no meals appear, first check for allergies that still need confirmation in My food. Then check your cooking time, equipment, and exclusions on Home. The demo has a small recipe library, so some combinations have no matches. Keep your actual restrictions and use Help if you need food support.',
    actions: [action('Check My food', 'food'), action('Check Home settings', 'home'), action('Find food support', 'help')],
  };
  if (/budget|cost|price|fee|tax|money|grocer/.test(topic)) return {
    text: `Your weekly budget is ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(profile.weeklyBudgetCents / 100)}. Change it on Home by typing into Weekly groceries. You can also enter a buffer and known fees there. In Meals, Build my week creates a shopping list with full package costs. Open Edit package prices below the list to update a price; totals recalculate. Prices are demo estimates, not live store prices.`,
    actions: [action('Edit budget on Home', 'home'), action('Open Meals', 'meals')],
  };
  if (/pantry|ingredient|photo|upload/.test(topic)) return {
    text: `You have ${pantryCount} pantry items saved. In Meals, choose an ingredient, type the amount, select its unit and preparation state, then choose Add confirmed ingredient. Use the remove button beside an item to delete it. When you change the pantry, find meals or build your week again. Photo upload is not available yet.`,
    actions: [action('Open your pantry', 'meals')],
  };
  if (/support|food bank|snap|benefit|211|afford|hungry/.test(topic)) return {
    text: 'The Help tab has official food-bank, SNAP, and community-support links, including a Call 211 button. Use the food-bank locator with your ZIP code or call 211 for nearby options. Confirm hours and requirements with the provider before visiting.',
    actions: [action('Open food support', 'help')],
  };
  if (/save|account|sign.?in|log.?in|persist|reset|device/.test(topic)) return {
    text: 'In demo mode, your family settings, pantry, and prices save in this browser. Your meal draft and this chat are temporary. Reset demo & clear session changes in the footer restores the defaults. When a Supabase account is connected, caregiver sign-in and Save in My food can sync food settings across devices; pantry and plans do not sync yet.',
    actions: [action('Open My food', 'food')],
  };
  if (/diet|favorite|preference|member|family|vegan|vegetarian|dislike|nutrient/.test(topic)) return {
    text: 'My food has Diet, Allergies, Favorites, and Nutrients tabs. Choose With a grown-up to add a family member or update allergy and health settings. Use Favorites for foods, flavors, and textures you enjoy. Home holds shared settings such as people covered, cooking time, equipment, and meals per day.',
    actions: [action('Open My food', 'food'), action('Open family settings', 'home')],
  };
  if (/learn|cook|instruction|label|video/.test(topic)) return {
    text: 'Learn explains pantry inventory, measuring ingredients, and checking shopping quantities. In Meals, open Ingredients & steps on a compatible recipe for its instructions. Reviewed cooking videos are not available yet.',
    actions: [action('Open Learn', 'learn'), action('Browse meals', 'meals')],
  };
  if (/meal|recipe|plan|week|swap|shopping/.test(topic)) return {
    text: 'Go to Meals after setting up Home and My food. Add your pantry amounts, then choose Find compatible meals to see recipe options. Show more reveals the remaining matches. Build my week makes a seven-day draft and shopping list. Use Swap meal under any meal to change it and recalculate the list. After changing settings, create a fresh draft.',
    actions: [action('Open meal planner', 'meals')],
  };
  if (/medical|diagnos|insulin|dose|calorie|weight|bmi|treat/.test(topic)) return {
    text: 'I can explain the website’s controls and meal-planning steps. For medical advice, medication doses, or individual nutrition targets, ask your care team. You can record existing food restrictions in My food; this guide cannot set a treatment plan.',
    actions: [action('Open My food', 'food')],
  };
  return {
    text: /^(hi|hello|hey|thanks|thank you)[!. ]*$/.test(text)
      ? 'Hi! I can help you get around Healthy Steps. Ask about your budget, adding pantry items, allergies, finding meals, or food support.'
      : 'Start on Home with your household size, budget, cooking time, and equipment. Set food preferences and allergies in My food, then go to Meals to add pantry items and find options. Ask me about a specific step, or use one of the buttons below.',
    actions: [action('Go to Home', 'home'), action('Open My food', 'food'), action('Open Meals', 'meals')],
  };
}
