"use client";

import { IconLock } from "@tabler/icons-react";
import { SeedySays } from "./onboarding";
import { SprigArt } from "./sprig";

/**
 * The last screen of sign-up, and the first screen for anyone returning: pick the child account
 * (the kids' cooking game) or the parent account (meal planner and settings, behind the Parent PIN).
 */
export function AccountChooser({
  parentName,
  justFinished,
  onChild,
  onParent,
}: {
  parentName?: string;
  justFinished: boolean;
  onChild: () => void;
  onParent: () => void;
}) {
  const name = parentName?.trim();
  return (
    <div className="ob-app ob-chooser">
      {justFinished && (
        <header className="ob-top">
          <span className="ob-back-space" aria-hidden="true" />
          <div className="ob-progress is-done" role="progressbar" aria-label="Sign-up progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100} aria-valuetext="Sign-up complete">
            <span style={{ width: "100%" }} />
          </div>
        </header>
      )}
      <main className="ob-screen ob-in-fwd">
        <SeedySays mood="cheer">
          <h1>{justFinished ? `You’re all set${name ? `, ${name}` : ""}!` : `Welcome back${name ? `, ${name}` : ""}!`}</h1>
          <p>Who’s cooking today? Pick an account.</p>
        </SeedySays>
        <div className="ob-accounts">
          <button type="button" className="ob-account-card ob-account-child" onClick={onChild}>
            <span className="ob-account-art" aria-hidden="true"><SprigArt mood="cheer" dishes={2} /></span>
            <span className="ob-account-title">Child account</span>
            <span className="ob-account-text">Play the cooking game with Chef Seedy and fill your cookbook.</span>
            <span className="ob-account-go">Let’s cook!</span>
          </button>
          <button type="button" className="ob-account-card ob-account-parent" onClick={onParent}>
            <span className="ob-account-art" aria-hidden="true"><SprigArt mood="encourage" /></span>
            <span className="ob-account-title">Parent account</span>
            <span className="ob-account-text">Meal planner, pantry, budget and your child’s food settings.</span>
            <span className="ob-account-go"><IconLock size={16} aria-hidden="true" /> Parent PIN</span>
          </button>
        </div>
      </main>
    </div>
  );
}
