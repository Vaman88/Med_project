# Retailer price references

Reference date: October 5, 2026. Exact source URLs, package descriptions and USD cents are in `src/lib/value-prices.ts` and appear beside shopping items. Listings are public Walmart and Target pages; they are neither a live retailer integration nor a nationwide average. Walmart is the lower reference for oats in the current catalog; the basket compares full-package costs across available eligible references.

No ZIP-specific pricing or availability is claimed. A listing can be unavailable locally even when its reference price is visible. Banana cost is an approximate per-item estimate from a per-pound listing. Bread slice count varies by loaf. Canned beans and corn use approximate drained package amounts, not gross can weight. Mass conversions and package costs are explicit; volume is not converted to ingredient mass without density evidence.

The selector evaluates compatible subsets of up to three recipes from the six-recipe prototype library, deducts confirmed compatible pantry quantities once, then buys whole packages for remaining requirements. It prefers more meal ideas and preference matches within budget, then lower cost. It does not optimize a complete diet or promise the cheapest basket among all US retailers.

The basket accepts references checked in the past 30 days. A cheaper older listing cannot displace a current listing. If required references are older, the site shows compatible meal ideas and source links but does not confirm a shopping basket within budget. Meals that need no purchase can still use confirmed pantry amounts. Update the catalog from retailer listings before the reference date expires.

All product labels and cross-contact information still need checking. Restriction filtering uses the prototype ingredient relationships and known product tags, not a professionally verified product catalog. Recipes are also labelled unreviewed in the website.
