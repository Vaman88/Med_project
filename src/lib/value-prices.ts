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
];
export const valuePrices: ValuePrice[] = records.map(([ingredientId,productName,packageQuantity,priceCents,packageLabel,retailer,sourceUrl,quantityNote],index) => ({
  id:`value-price-${index}`, ingredientId,productName,packageQuantity,priceCents,packageLabel,retailer,sourceUrl,quantityNote,
  packageUnit: ['banana','bread'].includes(ingredientId) ? 'each' : 'g', storeId:'value-us', observedAt:checked,
  sourceType:'retailer-reference', locationLabel:'U.S. public online reference; local price and availability vary',
  labelStatus:'unknown', productTags: ingredientId === 'peanut-butter' ? ['peanut'] : ingredientId === 'yogurt' ? ['milk','dairy'] : ingredientId === 'bread' ? ['wheat','gluten'] : ingredientId === 'hummus' ? ['sesame'] : [],
}));
export const formatMoney = (cents: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
