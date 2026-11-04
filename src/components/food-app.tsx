"use client";
import { GuestKitchen } from "./guest-kitchen";
import { useEffect, useState } from "react";
import { LittleKitchen } from "./little-kitchen";
import { ParentWizard } from "./parent-wizard";
import { RoleChooser } from "./role-chooser";
import { CHILD_PROGRESS_KEY } from "@/lib/child-progress";
import {
  FAMILY_KEY,
  CHILD_PLANNER_KEY,
  childPlannerSnapshot,
  familySchema,
  type Family,
} from "@/lib/little-kitchen";
import { guestKitchenSchema } from "@/lib/guest-kitchen";

export function FoodApp() {
  const [family, setFamily] = useState<Family | null>(null);
  const [setup, setSetup] = useState(false);
  const [parentArea, setParentArea] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState<"child" | "adult" | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAMILY_KEY);
      if (raw) {
        const saved = familySchema.safeParse(JSON.parse(raw));
        if (saved.success) setFamily(saved.data);
        else
          setNotice(
            "Your child profile could not be restored. Please set up the kitchen again.",
          );
      }
    } catch {
      setNotice(
        "Browser saving is unavailable. Your kitchen will last for this visit.",
      );
    }
    setLoaded(true);
  }, []);
  function save(value: Family) {
    try {
      // Keep measured pantry and budget edits while carrying family food constraints forward.
      const seed = childPlannerSnapshot(value);
      const raw = localStorage.getItem(CHILD_PLANNER_KEY);
      if (raw) {
        let existing: ReturnType<typeof guestKitchenSchema.safeParse> | null = null;
        try { existing = guestKitchenSchema.safeParse(JSON.parse(raw)); } catch { /* Replace invalid saved planner data. */ }
        if (existing?.success) {
          const prior = existing.data;
          const priorLabels = new Set(prior.foods.map((food) => food.label.toLowerCase()));
          const usedIds = new Set(prior.foods.map((food) => food.id));
          seed.foods = [
            ...prior.foods,
            ...seed.foods.filter((food) => !priorLabels.has(food.label.toLowerCase())).map((food) => {
              let id = food.id;
              while (usedIds.has(id)) id = `${id}-new`;
              usedIds.add(id);
              return { ...food, id };
            }),
          ].slice(0, 100);
          seed.profile = {
            ...prior.profile,
            allergies: [...new Set([...prior.profile.allergies, ...seed.profile.allergies])],
            members: seed.profile.members,
            dietaryRestrictions: [...new Set([...prior.profile.dietaryRestrictions, ...seed.profile.dietaryRestrictions])],
            ...(family && family.weeklyBudget !== value.weeklyBudget ? { weeklyBudgetCents: seed.profile.weeklyBudgetCents } : {}),
            ...(family && family.householdSize !== value.householdSize ? { householdSize: seed.profile.householdSize } : {}),
            ...(family && JSON.stringify(family.equipment) !== JSON.stringify(value.equipment) ? { equipment: seed.profile.equipment } : {}),
            ...(family && family.store !== value.store ? { preferredStoreName: seed.profile.preferredStoreName } : {}),
          };
        }
      }
      localStorage.setItem(CHILD_PLANNER_KEY, JSON.stringify(seed));
      localStorage.setItem(FAMILY_KEY, JSON.stringify(value));
      setNotice("");
    } catch {
      setNotice(
        "Your changes could not be saved on this device. They will last for this visit.",
      );
    }
    setFamily(value);
    setSetup(false);
    setParentArea(false);
  }
  function chooseChild() {
    setRole("child");
    if (!family) setSetup(true);
  }
  function chooseAdult() {
    setRole("adult");
    // No Parent PIN for now: a grown-up goes straight to the parent area.
    if (family && family.age < 13) setParentArea(true);
  }
  function switchProfile() {
    setRole(null);
    setSetup(false);
    setParentArea(false);
  }
  function openSettings() {
    if (family) { setRole("adult"); setParentArea(true); }
    else setSetup(true);
  }
  function forget() {
    try {
      localStorage.removeItem(CHILD_PLANNER_KEY);
      localStorage.removeItem(FAMILY_KEY);
      localStorage.removeItem(CHILD_PROGRESS_KEY);
    } catch {
      setNotice(
        "Could not clear saved settings. Use your browser’s site-data settings.",
      );
      return;
    }
    setFamily(null);
    setSetup(false);
    setParentArea(false);
    setRole(null);
    setNotice("Child profile cleared from this browser.");
  }
  if (!loaded)
    return (
      <div className="little-loading" role="status">
        Opening your kitchen…
      </div>
    );
  return (
    <>
      {notice && (
        <p className="family-notice" role="status">
          {notice}
        </p>
      )}
      {!role && !setup ? (
        <RoleChooser
          hasChildProfile={!!family}
          onChild={chooseChild}
          onAdult={chooseAdult}
        />
      ) : setup ? (
        <>
          <ParentWizard
            initial={family}
            onSave={save}
            onCancel={() => {
              setSetup(false);
              if (!family) setRole(null);
            }}
          />
          {family && (
            <div className="family-delete">
              <button onClick={forget}>
                Delete child profile and saved child kitchen
              </button>
            </div>
          )}
        </>
      ) : parentArea && family ? (
        <>
          <div className="family-entry parent-area-entry">
            <span>Parent area · Meal planner</span>
            <div className="parent-area-actions">
              <button onClick={() => setSetup(true)}>Edit child profile</button>
              <button onClick={() => { setParentArea(false); setRole("child"); }}>Back to child kitchen</button>
              <button onClick={switchProfile}>Switch profile</button>
            </div>
          </div>
          <GuestKitchen
            storageKey={CHILD_PLANNER_KEY}
            initialKitchen={childPlannerSnapshot(family)}
          />
        </>
      ) : family && family.age < 13 ? (
        <>
          <LittleKitchen family={family} onSettings={openSettings} />
          <button type="button" className="role-switch" onClick={switchProfile}>
            Switch profile
          </button>
        </>
      ) : (
        <>
          <div className="family-entry">
            <span>Adult meal planner</span>
            <div className="parent-area-actions">
              <button onClick={openSettings}>
                {family ? "Parent settings" : "Set up a child’s kitchen"}
              </button>
              <button onClick={switchProfile}>Switch profile</button>
            </div>
          </div>
          <GuestKitchen
            key={family ? JSON.stringify(family) : "guest"}
            storageKey={family ? CHILD_PLANNER_KEY : undefined}
            initialKitchen={family ? childPlannerSnapshot(family) : undefined}
          />
        </>
      )}
    </>
  );
}
