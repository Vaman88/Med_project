"use client";
import { IconEdit } from "@tabler/icons-react";
import { ChefAvatar } from "./chef-avatar";
import { littleRecipes, recipeChoices, type Family } from "@/lib/little-kitchen";

/** Wizard steps, in order: 0 chef, 1 pantry, 2 foods to avoid, 3 family details. */
export type ProfileStep = 0 | 1 | 2 | 3;

function List({ items, empty }: { items: readonly string[] | undefined; empty: string }) {
  if (!items?.length) return <p className="cp-empty">{empty}</p>;
  return <ul className="cp-chips">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

/**
 * Everything saved about the child in one place, for a grown-up to review. Each section has
 * its own Edit button that opens the setup at that step.
 */
export function ChildProfile({ family, onEdit, onBack, onDelete }: {
  family: Family;
  onEdit: (step: ProfileStep) => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const shown = recipeChoices(family).length;
  const hidden = littleRecipes.length - shown;
  const section = (title: string, step: ProfileStep, body: React.ReactNode) => (
    <section className="cp-section" aria-labelledby={`cp-${step}`}>
      <div className="cp-section-head">
        <h2 id={`cp-${step}`}>{title}</h2>
        <button type="button" onClick={() => onEdit(step)} aria-label={`Edit ${title.toLowerCase()}`}>
          <IconEdit size={17} aria-hidden="true" /> Edit
        </button>
      </div>
      {body}
    </section>
  );
  return (
    <main className="kitchen-app cp-app">
      <div className="cp-wrap">
        <header className="cp-head">
          <ChefAvatar avatar={family.avatar ?? { skin: "tan", hair: "curly", apron: "coral" }} size="small" />
          <div>
            <span className="eyebrow">Child profile</span>
            <h1>Chef {family.nickname || "(no nickname)"}</h1>
            <p>Age {family.age} · {shown} of {littleRecipes.length} dishes shown{hidden ? ` · ${hidden} hidden by food settings` : ""}</p>
          </div>
          <button type="button" className="button" onClick={() => onEdit(0)}>Edit everything</button>
        </header>

        {section("Chef", 0, (
          <dl className="cp-facts">
            <div><dt>Nickname</dt><dd>{family.nickname || "Not set"}</dd></div>
            <div><dt>Age</dt><dd>{family.age}</dd></div>
            <div><dt>Look</dt><dd>{family.avatar ? `${family.avatar.skin} skin · ${family.avatar.hair} hair · ${family.avatar.apron} apron` : "Default chef"}</dd></div>
          </dl>
        ))}

        {section("Pantry", 1, <>
          <p className="cp-note">Foods at home. Dishes that need other foods still show, with a note for the grown-up.</p>
          <List items={family.pantry} empty="No foods added yet." />
        </>)}

        {section("Foods to avoid", 2, <>
          <dl className="cp-facts">
            <div><dt>Allergies and exclusions</dt><dd><List items={family.allergies} empty="No known food allergies." /></dd></div>
            <div><dt>Other foods to avoid</dt><dd>{family.otherAllergies.trim() || "None"}</dd></div>
            <div><dt>Eating style</dt><dd><List items={family.dietary} empty="No diet rules." /></dd></div>
          </dl>
          <p className="cp-note">Any dish with one of these foods is hidden from the kids’ menu. The 9 major allergens also carry over to the meal planner.</p>
        </>)}

        {section("Family details", 3, (
          <dl className="cp-facts">
            <div><dt>Weekly grocery budget</dt><dd>{family.weeklyBudget !== undefined ? `$${family.weeklyBudget}` : "Not set"}</dd></div>
            <div><dt>People eating</dt><dd>{family.householdSize ?? "Not set"}</dd></div>
            <div><dt>Kitchen equipment</dt><dd><List items={family.equipment} empty="Not set" /></dd></div>
            <div><dt>Usual store</dt><dd>{family.store || "Not set"}</dd></div>
            <div><dt>Favorite foods</dt><dd><List items={family.favorites} empty="None picked" /></dd></div>
          </dl>
        ))}

        <div className="cp-actions">
          <button type="button" className="button secondary" onClick={onBack}>Back to the meal planner</button>
          <button type="button" className="text-button cp-delete" onClick={onDelete}>Delete child profile and saved child kitchen</button>
        </div>
      </div>
    </main>
  );
}
