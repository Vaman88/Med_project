"use client";

import Image from "next/image";
import { IconArrowLeft, IconArrowRight, IconChefHat } from "@tabler/icons-react";
import type { LittleRecipe } from "@/lib/little-kitchen";

const requests: Record<string, { customer: string; words: string }> = {
  brownies: {
    customer: "Jo",
    words: "Could you make fudgy bean brownies? Please mash the banana for the batter!",
  },
  pizza: {
    customer: "Ari",
    words: "I'd love rainbow mini pizzas with colorful bell peppers, please!",
  },
  pancakes: {
    customer: "Malik",
    words: "Could you make banana oat pancakes? I like the banana mashed into the mix!",
  },
  parfait: {
    customer: "Jo",
    words: "May I have a banana berry yogurt parfait with banana and strawberries?",
  },
  "veggie-dippers": {
    customer: "Ari",
    words: "Can you make rainbow veggie dippers with carrots and hummus?",
  },
  "bean-salad": {
    customer: "Malik",
    words: "I'd like a bean and corn rainbow bowl with tomato, please!",
  },
};

export function CustomerOrder({
  recipe,
  chefName,
  onAccept,
  onBack,
}: {
  recipe: LittleRecipe;
  chefName: string;
  onAccept: () => void;
  onBack: () => void;
}) {
  const request = requests[recipe.id] ?? {
    customer: "A customer",
    words: `Could you make ${recipe.title.toLowerCase()}, please?`,
  };

  return (
    <div className="little-app order-app">
      <header className="order-header">
        <span className="little-brand"><IconChefHat aria-hidden="true" /> Healthy Steps <b>little kitchen</b></span>
        <button type="button" onClick={onBack}><IconArrowLeft size={18} aria-hidden="true" /> Back to menu</button>
      </header>
      <main className="order-main">
        <section className="order-stage" aria-label="Customer order">
          <div className="order-scene">
            <Image
              src="/images/customer-counter.webp"
              alt="Three friendly customers waiting at a kitchen counter"
              width={1672}
              height={941}
              priority
              unoptimized
            />
            <span className="order-scene-heading">A customer is here!</span>
          </div>
          <div className="order-ticket">
            <span className="little-kicker">Take the order</span>
            <h1 id="customer-order-heading">{request.customer} has a request for Chef {chefName}</h1>
            <blockquote>“{request.words}”</blockquote>
            <div className="order-dish">
              <Image src={recipe.image} alt="" width={96} height={96} unoptimized />
              <div><span>Your dish</span><h2>{recipe.title}</h2></div>
            </div>
            <p>Listen to the order, then make this dish in your play kitchen.</p>
            <div className="order-actions">
              <button className="little-primary" type="button" onClick={onAccept}>
                Start cooking <IconArrowRight size={20} aria-hidden="true" />
              </button>
              <button className="order-back" type="button" onClick={onBack}>Choose another dish</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
