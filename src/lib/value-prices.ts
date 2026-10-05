import type { PriceObservation } from './domain';
export interface ValuePrice extends PriceObservation { retailer: string; sourceUrl: string; packageLabel: string; quantityNote?: string }
const checked = '2026-10-05';
// Public online references checked on this date, not live prices or national averages.
// Drained canned quantities and bread slice counts are conservative planning estimates.
const records: [string,string,number,number,string,string,string,string?][] = [
  ['oats','Great Value Old Fashioned Oats',1190,418,'42 oz canister','Walmart','https://www.walmart.com/c/best-sellers/old-fashioned-oats-great-value'],
  ['banana','Fresh banana',1,20,'1 banana (estimated)','Walmart','https://www.walmart.com/c/kp/calories-banana','Sold by weight; the cost of one banana varies.'],
  ['beans','Great Value Black Beans',240,92,'15 oz can','Walmart','https://www.walmart.com/c/kp/great-value-black-beans','240 g drained beans per can is a conservative estimate, not the net label weight.'],
  ['rice','Great Value Ready-to-Heat Brown Rice',249,132,'8.8 oz pouch','Walmart','https://www.walmart.com/c/best-sellers/great-value-brown-rice'],
  ['tomato','Great Value Diced Tomatoes',411,96,'14.5 oz can','Walmart','https://www.walmart.com/c/kp/diced-tomatoes-great-value'],
  ['corn','Great Value Whole Kernel Corn',200,82,'15 oz can','Walmart','https://www.walmart.com/ip/10315427','200 g drained corn per can is a conservative estimate.'],
  ['bread','Great Value Whole Wheat Bread',18,195,'20 oz loaf','Walmart','https://www.walmart.com/c/best-sellers/whole-grain-bread-great-value','18 usable slices per loaf is an estimate. Check your package.'],
  ['peanut-butter','Great Value Creamy Peanut Butter',510,218,'18 oz jar','Walmart','https://www.walmart.com/ip/10315475','Reference listing does not guarantee local stock.'],
  ['yogurt','Great Value Plain Nonfat Yogurt',907,264,'32 oz tub','Walmart','https://www.walmart.com/c/kp/plain-yogurt-great-value'],
  ['carrot','Baby peeled carrots',453,129,'1 lb bag','Walmart','https://www.walmart.com/c/kp/baby-carrots'],
  ['hummus','Marketside Classic Hummus',283,287,'10 oz tub','Walmart','https://www.walmart.com/ip/128642379'],
  ['oats','Good & Gather Old Fashioned Oats',1190,439,'42 oz canister','Target','https://www.target.com/p/-/A-79364999'],
  ['banana','Good & Gather Fresh Banana',1,29,'1 banana','Target','https://www.target.com/p/-/A-15013944'],
  ['beans','Good & Gather Low Sodium Black Beans',240,99,'15.5 oz can','Target','https://www.target.com/p/-/A-78666534','240 g drained beans per can is a conservative estimate, not the net label weight.'],
  ['rice','Good & Gather 90 Second Whole Grain Brown Rice',249,139,'8.8 oz pouch','Target','https://www.target.com/p/-/A-54600505'],
  ['tomato','Good & Gather Diced Tomatoes',411,99,'14.5 oz can','Target','https://www.target.com/p/-/A-79359679'],
  ['corn','Good & Gather Golden Sweet Whole Kernel Corn',200,89,'15.25 oz can','Target','https://www.target.com/p/-/A-79466788','200 g drained corn per can is a conservative estimate.'],
  ['bread','Market Pantry 100% Whole Wheat Sandwich Bread',18,199,'20 oz loaf','Target','https://www.target.com/p/-/A-85593788','18 usable slices per loaf is an estimate. Check your package.'],
  ['peanut-butter','Good & Gather Creamy Peanut Butter',454,199,'16 oz jar','Target','https://www.target.com/p/-/A-84067786','Online ingredients list possible soybean oil. Check the package if soy is a concern.'],
  ['yogurt','Good & Gather Greek Plain Nonfat Yogurt',907,299,'32 oz tub','Target','https://www.target.com/p/-/A-94895373'],
  ['carrot','Good & Gather Fresh Baby-Cut Carrots',453,139,'1 lb bag','Target','https://www.target.com/p/-/A-94669568'],
  ['hummus','Good & Gather Classic Hummus',283,299,'10 oz tub','Target','https://www.target.com/p/-/A-54531895'],
];
export const valuePrices: ValuePrice[] = records.map(([ingredientId,productName,packageQuantity,priceCents,packageLabel,retailer,sourceUrl,quantityNote],index) => ({
  id:`value-price-${index}`, ingredientId,productName,packageQuantity,priceCents,packageLabel,retailer,sourceUrl,quantityNote,
  packageUnit: ['banana','bread'].includes(ingredientId) ? 'each' : 'g', storeId:'value-us', observedAt:checked,
  sourceType:'retailer-reference', locationLabel:'U.S. public online reference; local price and availability vary',
  labelStatus:'unknown', productTags: ingredientId === 'peanut-butter' ? retailer === 'Target' ? ['peanut','soy'] : ['peanut'] : ingredientId === 'yogurt' ? ['milk','dairy'] : ingredientId === 'bread' ? ['wheat','gluten'] : ingredientId === 'hummus' ? ['sesame'] : [],
}));
export const formatMoney = (cents: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
