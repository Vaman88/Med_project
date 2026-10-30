"use client";

interface Props {
  hasChildProfile: boolean;
  onChild: () => void;
  onAdult: () => void;
}

export function RoleChooser({ hasChildProfile, onChild, onAdult }: Props) {
  return (
    <main className="rc-app">
      <header className="rc-head">
        <span className="rc-kicker">Healthy Steps</span>
        <h1>Who is cooking today?</h1>
        <p>Pick a kitchen to continue.</p>
      </header>
      <div className="rc-grid">
        <button type="button" className="rc-card rc-child" onClick={onChild}>
          <span className="rc-art" aria-hidden="true">🧑‍🍳</span>
          <span className="rc-title">Continue as a child</span>
          <span className="rc-text">
            Play the cooking game, make dishes step by step and fill your cookbook.
          </span>
          <span className="rc-go">
            {hasChildProfile ? "Open my kitchen" : "Set up with a grown-up"}
          </span>
        </button>
        <button type="button" className="rc-card rc-adult" onClick={onAdult}>
          <span className="rc-art" aria-hidden="true">🛒</span>
          <span className="rc-title">Continue as an adult</span>
          <span className="rc-text">
            Plan meals from your pantry, check your budget and avoid allergies.
          </span>
          <span className="rc-go">Open the meal planner</span>
        </button>
      </div>
    </main>
  );
}
