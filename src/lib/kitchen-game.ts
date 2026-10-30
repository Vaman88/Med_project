import type { LittleRecipe } from "./little-kitchen";

export type GamePhase =
  | "place-prep"
  | "prepare"
  | "move-prep"
  | "add-ingredients"
  | "mix"
  | "fill-pan"
  | "assemble"
  | "spread-sauce"
  | "load"
  | "close-door"
  | "set-heat"
  | "heating"
  | "flip"
  | "open-door"
  | "serve"
  | "finished";
export type GameTool = "knife" | "masher" | "whisk" | "spatula";
export type GameZone =
  "board" | "bowl" | "prep-cup" | "tray" | "pan" | "oven" | "stove" | "plate";
export type GameAction =
  | {
      type: "MOVE";
      item: string;
      zone: GameZone;
      point?: { x: number; y: number };
    }
  | { type: "TOOL"; tool: GameTool; zone?: GameZone }
  | { type: "WORK"; index?: number }
  | { type: "CLOSE_DOOR" }
  | { type: "OPEN_DOOR" }
  | { type: "START_HEAT" }
  | { type: "SKIP_HEAT" }
  | { type: "TICK" };

export interface GameState {
  phase: GamePhase;
  pieces: number[];
  added: string[];
  tool: GameTool | null;
  strokes: number;
  seconds: number;
  cookRound: number;
  toppingSpots: { food: string; x: number; y: number }[];
}
export const initialGameState = (): GameState => ({
  phase: "place-prep",
  pieces: [0, 0, 0, 0],
  added: [],
  tool: null,
  strokes: 0,
  seconds: 0,
  cookRound: 1,
  toppingSpots: [],
});
export const prepFood = (recipe: LittleRecipe) =>
  recipe.id === "pizza" ? "Bell pepper" : "Banana";
export const prepTool = (recipe: LittleRecipe): GameTool =>
  recipe.id === "pizza" ? "knife" : "masher";
export const ingredientSequence = (recipe: LittleRecipe) =>
  recipe.id === "pizza"
    ? ["Whole wheat pita", "Tomato", "Mozzarella", "prepared"]
    : recipe.ingredients.map((i) => i.food).filter((food) => food !== "Banana");
export const cookingVessel = (recipe: LittleRecipe): GameZone =>
  recipe.id === "pancakes" ? "pan" : "tray";
export const appliance = (recipe: LittleRecipe): GameZone =>
  recipe.id === "pancakes" ? "stove" : "oven";
export function gameReducer(
  state: GameState,
  action: GameAction,
  recipe: LittleRecipe,
): GameState {
  switch (action.type) {
    case "MOVE": {
      const { item, zone } = action;
      if (
        state.phase === "place-prep" &&
        item === prepFood(recipe) &&
        zone === "board"
      )
        return { ...state, phase: "prepare" };
      if (
        state.phase === "move-prep" &&
        item === "prepared" &&
        zone === (recipe.id === "pizza" ? "prep-cup" : "bowl")
      )
        return {
          ...state,
          phase: recipe.id === "pizza" ? "assemble" : "add-ingredients",
          tool: null,
        };
      if (state.phase === "add-ingredients" && zone === "bowl") {
        const needed = ingredientSequence(recipe);
        if (!needed.includes(item) || state.added.includes(item)) return state;
        const added = [...state.added, item];
        return {
          ...state,
          added,
          phase: added.length === needed.length ? "mix" : "add-ingredients",
        };
      }
      if (state.phase === "assemble" && zone === "tray") {
        const needed = ingredientSequence(recipe);
        if (
          !needed.includes(item) ||
          state.added.includes(item) ||
          item !== needed[state.added.length]
        )
          return state;
        // Chopped pepper is a small bowl of pieces. Let the child choose three
        // spots on the pizza before the tray is ready for the oven.
        const pepperCount = state.toppingSpots.filter(
          (spot) => spot.food === "prepared",
        ).length;
        const added =
          item === "prepared" && pepperCount < 2
            ? state.added
            : [...state.added, item];
        const position = action.point ?? { x: 50, y: 50 };
        return {
          ...state,
          added,
          toppingSpots: ["Mozzarella", "prepared"].includes(item)
            ? [
                ...state.toppingSpots,
                {
                  food: item,
                  x: Math.max(15, Math.min(85, position.x)),
                  y: Math.max(15, Math.min(85, position.y)),
                },
              ]
            : state.toppingSpots,
          phase:
            item === "Tomato"
              ? "spread-sauce"
              : added.length === needed.length
                ? "load"
                : "assemble",
        };
      }
      if (
        state.phase === "fill-pan" &&
        item === "batter" &&
        zone === cookingVessel(recipe)
      )
        return { ...state, phase: "load" };
      if (
        state.phase === "load" &&
        item === "dish" &&
        zone === appliance(recipe)
      )
        return {
          ...state,
          phase: recipe.id === "pancakes" ? "set-heat" : "close-door",
          tool: null,
        };
      if (state.phase === "serve" && item === "dish" && zone === "plate")
        return { ...state, phase: "finished" };
      return state;
    }
    case "TOOL": {
      const right =
        (state.phase === "prepare" &&
          action.tool === prepTool(recipe) &&
          action.zone === "board") ||
        (state.phase === "mix" &&
          action.tool === "whisk" &&
          action.zone === "bowl") ||
        (state.phase === "flip" &&
          action.tool === "spatula" &&
          action.zone === "stove");
      return right ? { ...state, tool: action.tool } : state;
    }
    case "WORK": {
      if (
        state.phase === "prepare" &&
        state.tool === prepTool(recipe) &&
        action.index !== undefined &&
        action.index >= 0 &&
        action.index < 4
      ) {
        const pieces = [...state.pieces];
        if (pieces[action.index] >= 3) return state;
        pieces[action.index]++;
        return {
          ...state,
          pieces,
          phase: pieces.every((value) => value === 3) ? "move-prep" : "prepare",
        };
      }
      if (state.phase === "mix" && state.tool === "whisk") {
        const strokes = Math.min(8, state.strokes + 1);
        return { ...state, strokes, phase: strokes === 8 ? "fill-pan" : "mix" };
      }
      if (state.phase === "spread-sauce") {
        const strokes = Math.min(5, state.strokes + 1);
        return {
          ...state,
          strokes,
          phase: strokes === 5 ? "assemble" : "spread-sauce",
        };
      }
      if (state.phase === "flip" && state.tool === "spatula") {
        const strokes = Math.min(3, state.strokes + 1);
        return {
          ...state,
          strokes,
          phase: strokes === 3 ? "set-heat" : "flip",
          cookRound: strokes === 3 ? 2 : 1,
        };
      }
      return state;
    }
    case "CLOSE_DOOR":
      return state.phase === "close-door"
        ? { ...state, phase: "set-heat" }
        : state;
    case "OPEN_DOOR":
      return state.phase === "open-door" ? { ...state, phase: "serve" } : state;
    case "START_HEAT":
      return state.phase === "set-heat"
        ? { ...state, phase: "heating", seconds: 6, strokes: 0 }
        : state;
    case "SKIP_HEAT":
      return state.phase === "heating"
        ? gameReducer({ ...state, seconds: 1 }, { type: "TICK" }, recipe)
        : state;
    case "TICK": {
      if (state.phase !== "heating") return state;
      const seconds = Math.max(0, state.seconds - 1);
      if (seconds > 0) return { ...state, seconds };
      return {
        ...state,
        seconds: 0,
        phase:
          recipe.id === "pancakes" && state.cookRound === 1
            ? "flip"
            : recipe.id === "pancakes"
              ? "serve"
              : "open-door",
        tool: null,
      };
    }
  }
}
export function gameTask(
  state: GameState,
  recipe: LittleRecipe,
): { title: string; hint: string; done: number; total: number } {
  const food = prepFood(recipe).toLowerCase();
  const tool = prepTool(recipe);
  switch (state.phase) {
    case "place-prep":
      return {
        title: `Move ${food} to the cutting board`,
        hint: "Drag the food from the shelf, or tap it and then tap the board.",
        done: 0,
        total: 1,
      };
    case "prepare":
      return {
        title: recipe.id === "pizza" ? "Chop the pepper" : "Mash the banana",
        hint: `Choose the ${tool}, then work each piece three times. Watch its shape change.`,
        done: state.pieces.reduce((a, b) => a + b, 0),
        total: 12,
      };
    case "move-prep":
      return {
        title: `Move the prepared ${food}`,
        hint: `Drag it to the ${recipe.id === "pizza" ? "little prep cup" : "mixing bowl"}.`,
        done: 0,
        total: 1,
      };
    case "add-ingredients":
      return {
        title: "Add the other ingredients",
        hint: "Move each named food from the shelf into the mixing bowl.",
        done: state.added.length,
        total: ingredientSequence(recipe).length,
      };
    case "assemble":
      return {
        title: "Build your mini pizza",
        hint: "Start with pita and tomato, spread the sauce, add cheese, then place three pepper pieces wherever you like.",
        done:
          state.added.length +
          state.toppingSpots.filter((spot) => spot.food === "prepared").length -
          (state.added.includes("prepared") ? 1 : 0),
        total: 6,
      };
    case "spread-sauce":
      return {
        title: "Spread the tomato",
        hint: "Move your finger or pointer across the pizza, or tap five times.",
        done: state.strokes,
        total: 5,
      };
    case "mix":
      return {
        title: "Mix the batter",
        hint: "Choose the whisk and stir eight times. See the ingredients come together.",
        done: state.strokes,
        total: 8,
      };
    case "fill-pan":
      return {
        title: `Pour into the ${recipe.id === "pancakes" ? "pan" : "baking tray"}`,
        hint: "Drag the bowl of batter across the counter.",
        done: 0,
        total: 1,
      };
    case "load":
      return {
        title: `Move the ${recipe.id === "pancakes" ? "pan to the stove" : "tray into the oven"}`,
        hint: "Drag it across the counter, or tap it and tap the appliance.",
        done: 0,
        total: 1,
      };
    case "close-door":
      return {
        title: "Close the oven door",
        hint: "Tap the oven handle. A grown-up handles a real hot oven.",
        done: 0,
        total: 1,
      };
    case "set-heat":
      return {
        title:
          recipe.id === "pancakes" && state.cookRound === 2
            ? "Cook the other side"
            : "Turn the heat dial",
        hint: "Start the pretend cooking timer and watch the food change.",
        done: 0,
        total: 6,
      };
    case "heating":
      return {
        title: "Watch it cook",
        hint:
          recipe.id === "pancakes"
            ? "Watch the pancake turn golden."
            : "Watch the oven glow as the food bakes.",
        done: 6 - state.seconds,
        total: 6,
      };
    case "flip":
      return {
        title: "Flip the pancakes",
        hint: "Choose the spatula and turn the pancake three times.",
        done: state.strokes,
        total: 3,
      };
    case "open-door":
      return {
        title: "Open the oven",
        hint: "Tap the handle and look at what you made.",
        done: 0,
        total: 1,
      };
    case "serve":
      return {
        title: "Serve your food",
        hint: "Move the cooked dish to the plate.",
        done: 0,
        total: 1,
      };
    case "finished":
      return {
        title: "You cooked it!",
        hint: "You used ingredients and tools to make this meal.",
        done: 1,
        total: 1,
      };
  }
}
