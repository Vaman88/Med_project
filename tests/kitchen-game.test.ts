import test from "node:test";
import assert from "node:assert/strict";
import { littleRecipes } from "../src/lib/little-kitchen";
import {
  gameReducer,
  gameTask,
  initialGameState,
  type GameAction,
  type GameState,
} from "../src/lib/kitchen-game";

for (const recipe of littleRecipes.filter((item) => item.game !== "assembly")) {
  test(`${recipe.title} requires real preparation, the right tool, cooking and serving`, () => {
    let game = initialGameState();
    const send = (action: GameAction) =>
      (game = gameReducer(game, action, recipe));
    const prep = recipe.id === "pizza" ? "Bell pepper" : "Banana";
    assert.equal(
      send({ type: "MOVE", item: "dish", zone: "plate" }).phase,
      "place-prep",
    );
    send({ type: "MOVE", item: prep, zone: "board" });
    assert.equal(game.phase, "prepare");
    send({ type: "WORK", index: 0 });
    assert.equal(game.pieces[0], 0);
    send({
      type: "TOOL",
      tool: recipe.id === "pizza" ? "masher" : "knife",
      zone: "board",
    });
    assert.equal(game.tool, null);
    send({
      type: "TOOL",
      tool: recipe.id === "pizza" ? "knife" : "masher",
      zone: "board",
    });
    for (let piece = 0; piece < 4; piece++)
      for (let hit = 0; hit < 3; hit++) send({ type: "WORK", index: piece });
    assert.deepEqual(game.pieces, [3, 3, 3, 3]);
    assert.equal(game.phase, "move-prep");
    assert.equal(gameTask(game, recipe).title.includes("prepared"), true);
    send({
      type: "MOVE",
      item: "prepared",
      zone: recipe.id === "pizza" ? "prep-cup" : "bowl",
    });
    if (recipe.id === "pizza") {
      assert.equal(game.phase, "assemble");
      send({ type: "MOVE", item: "Tomato", zone: "tray" });
      assert.deepEqual(game.added, []);
      send({ type: "MOVE", item: "Whole wheat pita", zone: "tray" });
      send({ type: "MOVE", item: "Tomato", zone: "tray" });
      assert.equal(game.phase, "spread-sauce");
      for (let stroke = 0; stroke < 5; stroke++) send({ type: "WORK" });
      assert.equal(game.phase, "assemble");
      send({
        type: "MOVE",
        item: "Mozzarella",
        zone: "tray",
        point: { x: 28, y: 38 },
      });
      send({
        type: "MOVE",
        item: "prepared",
        zone: "tray",
        point: { x: 70, y: 63 },
      });
      assert.equal(game.phase, "assemble");
      assert.equal(gameTask(game, recipe).done, 4);
      send({
        type: "MOVE",
        item: "prepared",
        zone: "tray",
        point: { x: 35, y: 65 },
      });
      assert.equal(game.phase, "assemble");
      send({
        type: "MOVE",
        item: "prepared",
        zone: "tray",
        point: { x: 65, y: 35 },
      });
      assert.equal(game.phase, "load");
      assert.equal(
        game.toppingSpots.filter((spot) => spot.food === "prepared").length,
        3,
      );
      assert.deepEqual(
        game.toppingSpots.map((spot) => [spot.x, spot.y]),
        [
          [28, 38],
          [70, 63],
          [35, 65],
          [65, 35],
        ],
      );
    } else {
      for (const item of recipe.ingredients
        .map((i) => i.food)
        .filter((food) => food !== "Banana"))
        send({ type: "MOVE", item, zone: "bowl" });
      assert.equal(game.phase, "mix");
      send({ type: "WORK" });
      assert.equal(game.strokes, 0);
      send({ type: "TOOL", tool: "whisk", zone: "bowl" });
      for (let hit = 0; hit < 8; hit++) send({ type: "WORK" });
      assert.equal(game.phase, "fill-pan");
      send({
        type: "MOVE",
        item: "batter",
        zone: recipe.id === "pancakes" ? "pan" : "tray",
      });
    }
    assert.equal(game.phase, "load");
    send({
      type: "MOVE",
      item: "dish",
      zone: recipe.id === "pancakes" ? "stove" : "oven",
    });
    if (recipe.id !== "pancakes") {
      assert.equal(game.phase, "close-door");
      send({ type: "CLOSE_DOOR" });
    }
    send({ type: "START_HEAT" });
    assert.equal(game.phase, "heating");
    for (let second = 0; second < 6; second++) send({ type: "TICK" });
    if (recipe.id === "pancakes") {
      assert.equal(game.phase, "flip");
      send({ type: "WORK" });
      assert.equal(game.strokes, 0);
      send({ type: "TOOL", tool: "spatula", zone: "stove" });
      for (let hit = 0; hit < 3; hit++) send({ type: "WORK" });
      send({ type: "START_HEAT" });
      for (let second = 0; second < 6; second++) send({ type: "TICK" });
    } else {
      assert.equal(game.phase, "open-door");
      send({ type: "OPEN_DOOR" });
    }
    assert.equal(game.phase, "serve");
    send({ type: "MOVE", item: "dish", zone: "plate" });
    assert.equal(game.phase, "finished");
  });
}
