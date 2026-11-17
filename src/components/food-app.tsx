"use client";
import { GuestKitchen } from "./guest-kitchen";
import { useCallback, useEffect, useRef, useState } from "react";
import { ParentGate } from "./parent-gate";
import { INACTIVITY_LOCK_MS } from "@/lib/parent-lock";
import { LittleKitchen } from "./little-kitchen";
import { ParentWizard } from "./parent-wizard";
import { RoleChooser } from "./role-chooser";
import { ChildProfile, type ProfileStep } from "./child-profile";
import { resetChef } from "@/lib/family-setup";
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
  // The child profile page (every saved setting, each with an Edit button) and the setup step it opens.
  const [profileOpen, setProfileOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<ProfileStep>(0);
  const [notice, setNotice] = useState("");
  // Parent PIN gate: a shared-device family control, not authentication (see README).
  const [unlocked, setUnlocked] = useState(false);
  const [gate, setGate] = useState<{ reason: string; then: () => void } | null>(null);
  const lock = useCallback(() => {
    setUnlocked(false);
    setGate(null);
  }, []);
  // Lock again after a stretch without taps or key presses.
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!unlocked) return;
    const restart = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, INACTIVITY_LOCK_MS);
    };
    restart();
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, restart, { passive: true }));
    return () => {
      clearTimeout(idleTimer.current);
      events.forEach((name) => window.removeEventListener(name, restart));
    };
  }, [unlocked, lock]);
  function requireParent(reason: string, then: () => void) {
    if (unlocked) then();
    else setGate({ reason, then });
  }
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
  /** Stores the family and its child planner seed without changing which screen is open. */
  function persist(value: Family) {
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
  }
  function save(value: Family) {
    persist(value);
    // Returning to the child kitchen is a role change, so the parent area locks again. Otherwise the
    // grown-up who saved came through the PIN (or just created it), so the parent view stays open.
    if (role !== "adult" || value.age < 13) lock();
    else setUnlocked(true);
    // Land at the top of the kitchen, not part-way down where the setup form was scrolled.
    window.scrollTo({ top: 0, behavior: "instant" });
    setSetup(false);
    setParentArea(false);
    setProfileOpen(false);
  }
  function editProfile(step: ProfileStep) {
    setSetupStep(step);
    setSetup(true);
  }
  function chooseChild() {
    lock();
    setRole("child");
    if (!family) setSetup(true);
  }
  function chooseAdult() {
    // With a child profile saved, the planner holds the child's food settings: ask for the PIN.
    if (family)
      requireParent("open the meal planner and family settings", () => {
        setRole("adult");
        setParentArea(true);
      });
    else setRole("adult");
  }
  function switchProfile() {
    lock();
    setRole(null);
    setSetup(false);
    setParentArea(false);
    setProfileOpen(false);
  }
  function openSettings() {
    if (family)
      requireParent("open Parent settings", () => {
        setRole("adult");
        setParentArea(true);
      });
    else setSetup(true);
  }
  function backToChildKitchen() {
    lock();
    setParentArea(false);
    setProfileOpen(false);
    setRole("child");
  }
  function forget() {
    // Deleting child data is parent-only; the views that offer it are behind the gate too.
    if (family && !unlocked) requireParent("delete the child profile", clearChildData);
    else clearChildData();
  }
  function clearChildData() {
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
    setProfileOpen(false);
    setRole(null);
    lock();
    setNotice("Child profile cleared from this browser.");
  }
  if (!loaded)
    return (
      <div className="little-loading" role="status">
        Opening your kitchen…
      </div>
    );
  // Views that show or change the child's food settings, or can delete them, are parent-only.
  const parentView =
    !!family &&
    (setup ||
      profileOpen ||
      parentArea ||
      (!!role && role !== "child" && family.age >= 13));
  const showGate = !!family && (!!gate || (parentView && !unlocked));
  return (
    <>
      {notice && (
        <p className="family-notice" role="status">
          {notice}
        </p>
      )}
      {showGate && family && (
        <ParentGate
          key={gate?.reason ?? "locked"}
          family={family}
          reason={gate?.reason ?? "keep using the parent area"}
          onCreatePin={(pin) => {
            persist({ ...family, ...pin });
            setUnlocked(true);
            gate?.then();
            setGate(null);
          }}
          onUnlock={() => {
            setUnlocked(true);
            gate?.then();
            setGate(null);
          }}
          onCancel={() => {
            // A requested action is simply dropped; a parent view that locked itself closes.
            if (gate) setGate(null);
            else switchProfile();
          }}
        />
      )}
      {/* The screen behind the gate stays mounted but hidden, so an idle lock keeps unsaved edits. */}
      <div style={{ display: showGate ? "none" : "contents" }}>
      {!role && !setup ? (
        <RoleChooser
          hasChildProfile={!!family}
          onChild={chooseChild}
          onAdult={chooseAdult}
        />
      ) : setup ? (
        <>
          <ParentWizard
            key={setupStep}
            initial={family}
            startStep={family ? setupStep : 0}
            onSave={save}
            onCancel={() => {
              setSetup(false);
              setSetupStep(0);
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
      ) : profileOpen && family ? (
        <ChildProfile
          family={family}
          onEdit={editProfile}
          onResetChef={() => persist(resetChef(family))}
          onBack={() => setProfileOpen(false)}
          onDelete={forget}
        />
      ) : parentArea && family ? (
        <>
          <div className="family-entry parent-area-entry">
            <span>Parent area · Meal planner</span>
            <div className="parent-area-actions">
              <button onClick={() => setProfileOpen(true)}>Child profile</button>
              <button onClick={backToChildKitchen}>Back to child kitchen</button>
              <button onClick={switchProfile}>Switch profile</button>
            </div>
          </div>
          <GuestKitchen
            storageKey={CHILD_PLANNER_KEY}
            initialKitchen={childPlannerSnapshot(family)}
          />
        </>
      ) : family && (role === "child" || family.age < 13) ? (
        // Any child profile (ages 5 to 17) opens the kids' kitchen from "Continue as a child".
        // Teens can still use the meal planner from "Continue as an adult".
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
      </div>
    </>
  );
}
