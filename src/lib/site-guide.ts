import type { HouseholdProfile } from './domain';
export type GuideDestination = 'home' | 'meals' | 'learn' | 'help' | 'food' | 'allergies' | 'budget' | 'suggestions';
export type GuideAction = { label: string; destination: GuideDestination };
export type GuideReply = { text: string; actions: GuideAction[] };
const action = (label: string, destination: GuideDestination): GuideAction => ({ label, destination });

// Local, rule-based website help: no messages are sent to an AI service.
export function siteGuideReply(message: string, profile: HouseholdProfile, pantryCount: number, previousTopic = ''): GuideReply {
  const text = message.toLowerCase().trim();
  const topic = /^(how|where|show me|take me there|tell me more|yes)[?.! ]*$/.test(text) ? previousTopic : text;
  if (/allerg|nuts?|peanut|sesame/.test(topic)) return {
    text: 'Open Account, then Food settings. Start typing an allergy and select the exact food from the menu. Confirm any proposed matches before saving. Choose no known food allergies only if that applies to you. Meal suggestions keep these restrictions in place.',
    actions: [action('Open allergy settings', 'allergies')],
  };
  if (/no (meals|recipes|options)|nothing.*(fit|match)|not.*(finding|matching)|can.t find/.test(topic)) return {
    text: 'Check your pantry amounts, preparation states, budget, cooking time and equipment. The recipe library is small, so some combinations have no matches. Keep your real allergies and restrictions. Food support links are below this chat.',
    actions: [action('Check pantry', 'home'), action('Check food settings', 'food')],
  };
  if (/budget|cost|price|fee|tax|money|grocer/.test(topic)) return {
    text: `Your current food budget is ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(profile.weeklyBudgetCents / 100)}. In the second Home step, type your shopping budget and any known fees. Suggestions use whole packages and stay within that amount. Dated retailer references are estimates; verify local prices and stock before shopping.`,
    actions: [action('Edit budget', 'budget')],
  };
  if (/pantry|ingredient|photo|upload/.test(topic)) return {
    text: `You have ${pantryCount} pantry items entered. Home starts with your pantry: choose a food, type its measured amount, choose its unit and preparation state, then Add to pantry. Confirmed usable quantities are deducted before buying more. Canned beans and corn use drained amounts. Photo upload is not available.`,
    actions: [action('Open your pantry', 'home')],
  };
  if (/support|food bank|snap|benefit|211|afford|hungry/.test(topic)) return {
    text: 'Official food-bank, SNAP and community-support resources are below this chat in Help. Use the locator for nearby options or call 211. Confirm hours and requirements with the provider before visiting.',
    actions: [action('Open food support', 'help')],
  };
  if (/save|account|sign.?in|log.?in|persist|reset|device|privacy|delete/.test(topic)) return {
    text: 'Connected accounts save food settings and pantry when you continue or save. Account contains your terms receipt and account deletion control. The labelled preview creates no account and clears changes when you leave or refresh. This help chat stays in browser memory and is temporary.',
    actions: [action('Open Account', 'food')],
  };
  if (/diet|favorite|preference|member|family|vegan|vegetarian|dislike|nutrient/.test(topic)) return {
    text: 'Account contains Food settings: allergies, dietary preferences, foods you enjoy and foods to skip. Open Kitchen, exclusions and other food needs for household size, equipment and existing care-team restrictions. Save changes, then get new suggestions on Home.',
    actions: [action('Open food settings', 'food')],
  };
  if (/medical|diagnos|insulin|dose|calorie|weight|bmi|treat/.test(topic)) return {
    text: 'I can explain website controls and food-planning steps. Ask your care team about medication doses, medical advice or individual nutrition targets. Food settings can record restrictions you already follow.',
    actions: [action('Open food settings', 'food')],
  };
  if (/meal|recipe|plan|week|swap|shopping|cook|instruction/.test(topic)) return {
    text: 'Home has three steps: pantry, budget, then suggestions. Your basket buys only missing ingredients for up to three meal ideas. It is not a full week of food. Open Ingredients and steps on a meal to see quantities and instructions. Other compatible meals are alternatives, not purchases added to your basket.',
    actions: [action('Start on Home', 'home'), action('See suggestions', 'suggestions')],
  };
  return {
    text: /^(hi|hello|hey|thanks|thank you)[!. ]*$/.test(text)
      ? 'Hi! Ask me about the pantry, budget, food allergies, meal ideas or food support.'
      : 'Start on Home: add pantry foods, enter a shopping budget, then find suggestions. Account holds food preferences and allergies. Help combines this website guide with food support links.',
    actions: [action('Go to Home', 'home'), action('Open food settings', 'food')],
  };
}
