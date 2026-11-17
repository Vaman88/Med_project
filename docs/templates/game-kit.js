/* Shared drawing kit for the two game style sheets. Each page passes a style object S
   (outline, colours, faces) and gets every food, station, dish and tool drawn in that style. */
(function () {
  const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (c, t, a) => "#" + hx(c).map((v, i) => Math.round(v + (hx(t)[i] - v) * a).toString(16).padStart(2, "0")).join("");
  const dk = (c, a = 0.3) => mix(c, "#22100a", a);
  const lt = (c, a = 0.4) => mix(c, "#ffffff", a);
  window.kitColor = { mix, dk, lt };

  window.makeKit = function (S) {
    const pal = S.pal;
    const st = (c, w) => (S.stroke ? S.stroke(c, w) : "");
    const thin = (c) => (S.thin ? S.thin(c) : "");
    const P = (d, c, x = "") => `<path d="${d}" fill="${c}" ${st(c)} ${x}/>`;
    const C = (cx, cy, r, c, x = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" ${st(c)} ${x}/>`;
    const E = (cx, cy, rx, ry, c, x = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" ${st(c)} ${x}/>`;
    const R = (x, y, w, h, r, c, e = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}" ${st(c)} ${e}/>`;
    const flat = (d, c, o = 1) => `<path d="${d}" fill="${c}" opacity="${o}"/>`;
    const fe = (cx, cy, rx, ry, c, o = 1, x = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${o}" ${x}/>`;
    const line = (d, c, w = 2.5, o = 1, x = "") => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}" ${x}/>`;
    const shine = (d, w = 4, o = 0.6) => line(d, "#fff", w, o);
    const rope = (d, c, w) => line(d, dk(c, 0.45), w + (S.ropeEdge ?? 3)) + line(d, c, w);
    const face = (x, y, s = 1, m) => (S.face ? S.face(x, y, s, m) : "");
    const ground = (rx = 30, cy = 90, cx = 50) => (S.ground ? fe(cx, cy, rx, Math.max(4, rx * 0.16), "#000", S.ground) : "");

    /* ------------------------------ foods (100 x 100) ------------------------------ */
    const LEAF = "#4fb03a";
    const coin = (x, y, r, rim, inner, deco = "") => `<g transform="translate(${x} ${y})">${C(0, 0, r, rim)}<circle r="${r - 3.6}" fill="${inner}"/>${deco}</g>`;
    const three = (fn) => fn(50, 38) + fn(31, 63) + fn(69, 63);
    const banDeco = [0, 120, 240].map((a) => `<ellipse cx="0" cy="-3.8" rx="1.4" ry="2.3" fill="#b98f3a" transform="rotate(${a})"/>`).join("");
    const cukeDeco = `<circle r="8" fill="none" stroke="#c5e59c" stroke-width="1.4"/>` + [0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-5" rx="1.4" ry="2.5" fill="#fbffe9" stroke="#b7d88f" stroke-width=".6" transform="rotate(${a})"/>`).join("");
    const carDeco = [0, 60, 120].map((a) => `<path d="M-7 0 H7" stroke="#f0862a" stroke-width="1.5" stroke-linecap="round" transform="rotate(${a})"/>`).join("") + `<circle r="2.2" fill="#ffe2b8"/>`;
    const cube = (x, y, s, c) => `<g transform="translate(${x} ${y})">${P(`M0 ${-s} L${s} ${-s / 2} L${s} ${s / 2} L0 ${s} L${-s} ${s / 2} L${-s} ${-s / 2}Z`, c)}${flat(`M0 ${-s} L${s - 1.5} ${-s / 2} L0 0 L${-s + 1.5} ${-s / 2}Z`, lt(c, 0.4))}${flat(`M0 0 L${s - 1.5} ${-s / 2} L${s - 1.5} ${s / 2 - 1} L0 ${s - 1.5}Z`, dk(c, 0.2))}<circle cx="${-s * 0.5}" cy="${s * 0.25}" r="1.7" fill="#ffe08a"/><circle cx="${s * 0.5}" cy="${s * 0.15}" r="1.5" fill="#ffe08a"/></g>`;
    const HEART = "M0 -13 C10 -18 17 -6 12 4 C9 10 4 14 0 16 C-4 14 -9 10 -12 4 C-17 -6 -10 -18 0 -13Z";
    const HEART_IN = "M0 -8 C6 -11 10 -4 7 2 C5 6 2 9 0 10 C-2 9 -5 6 -7 2 C-10 -4 -6 -11 0 -8Z";
    const sSlice = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(1.15)">${P(HEART, "#f23a52")}${flat(HEART_IN, "#ffc4ca")}${line("M0 -5 V6 M0 -1 l-3 -2 M0 -1 l3 -2", "#fff", 1.3, 0.9)}</g>`;
    const berry = (x, y) => `<g transform="translate(${x} ${y})">${C(0, 0, 14, "#5468d8")}${flat("M-4 -3 l2.4 -3.4 l2.2 2.6 l2.6 -2.6 l1.4 3.8 Z", "#27307a")}${fe(-5, -6, 3.6, 2, "#fff", 0.55, 'transform="rotate(-30 -5 -6)"')}</g>`;
    const MOUND = "M12 78 C14 54 32 38 50 38 C68 38 86 54 88 78 Q50 92 12 78Z";
    const SPOTS = [[50, 47], [35, 54], [65, 54], [24, 66], [43, 63], [58, 64], [76, 67], [33, 76], [52, 77], [69, 78]];
    const mound = (base, grain) => ground(40, 88) + P(MOUND, base) + SPOTS.map(([x, y], i) => `<g transform="translate(${x} ${y}) rotate(${((i * 47) % 180) - 90})">${grain}</g>`).join("");
    const BREAD = "M18 38 C12 18 38 12 50 22 C62 12 88 18 82 38 L80 78 Q80 86 72 86 L28 86 Q20 86 20 78Z";
    const CRUMB = "M26 40 C22 27 40 23 50 31 C60 23 78 27 74 40 L73 74 Q73 79 68 79 L32 79 Q27 79 27 74Z";

    const FOOD = {
      banana: ground(34, 88) + P("M12 30 C10 78 70 92 90 44 L80 40 C68 62 38 58 28 26 Z", "#ffd43b") + shine("M18 44 C24 66 50 76 72 60", 4, 0.65) + P("M12 30 l-1 -9 l10 1 l7 4 Z", "#8a6a2e") + line("M90 44 l-9 -4", "#8a6a2e", 4.5),
      bananaSlices: ground(36, 86) + three((x, y) => coin(x, y, 17, "#f2c53a", "#fff6cf", banDeco)),
      bananaMash: ground(36, 84) + P("M14 64 C8 48 24 36 38 41 C42 28 64 28 68 41 C82 38 92 54 84 66 C78 80 24 80 14 64Z", "#ffe89a") + shine("M26 58 q8 -8 16 0 M46 52 q8 -7 16 1 M34 68 q9 -5 18 0", 3.4, 0.9),
      strawberry: ground(22, 93) + P("M50 28 C72 14 92 36 78 60 C70 76 56 86 50 90 C44 86 30 76 22 60 C8 36 28 14 50 28Z", "#f23a52") + [[34, 46], [50, 44], [66, 46], [28, 58], [42, 60], [58, 60], [72, 58], [40, 74], [60, 74], [50, 82]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="2.7" fill="#ffe59a"/>`).join("") + shine("M29 42 C31 35 37 32 42 33", 4, 0.6) + P("M50 30 C38 16 26 20 24 26 C34 30 42 32 50 30 C58 32 66 30 76 26 C74 20 62 16 50 30Z", LEAF) + line("M50 30 V17", "#3a8a26", 4),
      strawberrySlices: ground(36, 86) + sSlice(50, 38, 0) + sSlice(31, 63, -16) + sSlice(69, 63, 16),
      tomato: ground(26, 93) + C(50, 58, 31, "#f0412e") + shine("M29 50 C32 41 39 36 46 35", 5, 0.6) + P("M50 27 l6 7 l10 -2 l-5 8 l5 7 l-10 -1 l-6 7 l-6 -7 l-10 1 l5 -7 l-5 -8 l10 2Z", LEAF) + line("M50 36 V23", "#3a8a26", 4),
      tomatoDice: ground(36, 86) + cube(50, 40, 15, "#ee3b2b") + cube(32, 64, 15, "#ee3b2b") + cube(68, 64, 15, "#ee3b2b"),
      carrot: ground(36, 82) + P("M18 50 C6 38 8 30 13 27 C13 37 17 42 20 45 C18 32 23 25 30 25 C25 35 25 40 23 45Z", LEAF) + P("M16 42 C36 34 76 50 90 62 C76 72 36 76 16 62 C8 56 8 46 16 42Z", "#ff8f26") + line("M40 43 v7 M56 49 v6 M70 55 v5 M30 66 v-6 M48 70 v-6", "#c85e0c", 1.8, 0.6) + shine("M20 47 q14 -1 28 5", 3.5, 0.6),
      carrotCoins: ground(36, 86) + three((x, y) => coin(x, y, 17, "#f57c14", "#ffb866", carDeco)),
      pepper: ground(26, 93) + P("M50 30 C66 20 86 34 80 60 C77 78 64 90 57 85 C52 90 48 90 43 85 C36 90 23 78 20 60 C14 34 34 20 50 30Z", "#ffb81c") + line("M50 34 C49 52 49 70 50 86 M66 34 C72 50 70 70 60 84", "#c27c06", 1.8, 0.5) + shine("M28 44 C25 54 27 66 32 74", 5, 0.6) + line("M50 30 C48 20 51 13 58 11", "#3a8a26", 6) + P("M40 31 q10 -7 20 0 q-10 5 -20 0Z", LEAF),
      pepperStrips: ground(36, 86) + ["M20 46 Q50 22 80 46", "M20 62 Q50 38 80 62", "M20 78 Q50 54 80 78"].map((d) => rope(d, "#ffb81c", 9) + line(d, "#fff", 2, 0.5, 'transform="translate(0 -2)"')).join(""),
      egg: ground(24, 93) + P("M50 16 C68 16 78 42 78 60 C78 78 66 88 50 88 C34 88 22 78 22 60 C22 42 32 16 50 16Z", "#fff4e3") + shine("M34 38 C35 30 41 24 46 23", 5, 0.9),
      eggFried: ground(36, 86) + P("M14 56 C8 38 28 26 42 31 C52 18 78 24 78 42 C92 47 92 70 74 75 C62 85 28 82 18 72 C13 67 12 61 14 56Z", "#fffdf5") + C(52, 52, 15, "#ffb81c") + fe(46, 46, 5, 3, "#fff", 0.8, 'transform="rotate(-25 46 46)"'),
      bread: ground(30, 92) + P(BREAD, "#c98a44") + flat(CRUMB, "#fde9bd") + [[38, 44], [56, 42], [64, 56], [36, 60], [50, 66], [62, 70], [44, 52]].map(([x, y]) => fe(x, y, 2.4, 1.6, "#e9cc8e", 0.9)).join(""),
      toast: ground(30, 92) + P(BREAD, "#8a4f1c") + flat(CRUMB, "#eaa94e") + line("M34 44 H66 M34 56 H66 M34 68 H66", "#a8681f", 3.4, 0.9) + P("M40 40 l17 -4 l4 12 l-17 4Z", "#ffe680"),
      cheese: ground(38, 86) + P("M12 56 L90 48 L90 78 L12 78Z", "#f7b52a") + P("M12 56 L72 28 L90 48Z", "#ffd95a") + fe(30, 68, 5, 4, "#c9860a") + fe(58, 66, 4, 3.2, "#c9860a") + fe(76, 70, 3, 2.6, "#c9860a") + fe(62, 41, 5, 2.6, "#f2b21e"),
      cheeseShreds: ground(34, 84) + ["M22 72 Q34 60 46 70", "M40 76 Q52 64 66 74", "M56 68 Q68 58 80 70", "M28 60 Q40 50 52 60", "M48 58 Q60 48 72 58", "M36 48 Q48 40 60 48"].map((d, i) => rope(d, i % 2 ? "#ffdc6e" : "#ffc93c", 5)).join(""),
      cheeseMelt: ground(38, 84) + P("M12 58 C12 42 32 38 40 46 C48 32 72 36 74 48 C90 46 94 64 84 68 C86 80 74 82 70 74 C60 84 38 80 34 72 C24 80 10 72 12 58Z", "#ffc93c") + shine("M24 56 q12 -9 24 0", 4, 0.8) + shine("M54 50 q8 -5 16 0", 3.4, 0.8),
      rice: mound("#efe4c9", `<ellipse rx="7" ry="3.4" fill="#fffef8" ${thin("#cdbf9c")}/>`),
      beans: mound("#3d2219", `<ellipse rx="7" ry="4.8" fill="#6a4032" ${thin("#2a140e")}/><ellipse cx="-2" cy="-1.6" rx="2.6" ry="1" fill="#fff" opacity=".45"/>`),
      corn: mound("#f2b01e", `<rect x="-5" y="-4.5" width="10" height="9" rx="4" fill="#ffe066" ${thin("#d98f0a")}/><rect x="-3" y="-3" width="3.4" height="2" rx="1" fill="#fff" opacity=".75"/>`),
      oats: mound("#d9bd84", `<ellipse rx="7" ry="4.2" fill="#f6e7c1" ${thin("#b3955a")}/><path d="M-4 0 H4" stroke="#c9a868" stroke-width="1.1"/>`),
      blueberries: ground(38, 86) + berry(36, 42) + berry(64, 42) + berry(23, 64) + berry(50, 66) + berry(77, 64),
      cucumber: ground(36, 86) + three((x, y) => coin(x, y, 17, "#3f9a34", "#e4f5c8", cukeDeco)),
      yogurt: ground(36, 86) + P("M18 70 C10 54 26 42 38 46 C38 30 58 24 62 40 C74 34 88 46 80 60 C90 68 82 82 68 80 C56 88 28 86 18 70Z", "#fffdf8") + line("M30 64 C38 52 58 52 64 64 M40 72 q10 -6 20 0", "#e0d5c0", 3) + shine("M28 54 C32 46 40 43 46 45", 4, 0.9),
      pasta: ground(38, 86) + ["M16 66 C16 44 84 44 84 66", "M16 66 C20 86 80 86 84 66", "M24 68 C26 52 74 52 76 68", "M24 68 C30 80 70 80 76 68", "M34 66 C38 58 62 58 66 66", "M34 67 C40 74 60 74 66 67"].map((d, i) => rope(d, i % 2 ? "#f7c244" : "#ffd66b", 6)).join(""),
    };

    /* ------------------------------ stations and dishes ------------------------------ */
    const SIZE = { board: [230, 160], pot: [220, 190], pan: [250, 150], burner: [220, 120], oven: [220, 200], mixbowl: [220, 170], tray: [230, 150], bowl: [220, 180], plate: [230, 120], glass: [160, 200] };
    const flames = [50, 80, 110, 140, 170].map((x) => P(`M${x} 76 c-11 -14 -3 -24 0 -36 c3 12 11 22 0 36Z`, "#ff8a1f") + flat(`M${x} 74 c-5 -7 -1 -12 0 -18 c1 6 5 11 0 18Z`, "#ffe27a")).join("");
    const bowlBack = E(110, 70, 86, 26, pal.dishRim) + fe(110, 72, 74, 19, dk(pal.dish, 0.45));
    const bowlFront = P("M24 70 C28 132 72 162 110 162 C148 162 192 132 196 70 A86 26 0 0 1 24 70Z", pal.dish) + shine("M40 104 C46 124 58 138 74 146", 6, 0.4) + (S.face ? face(110, 128, 1.15) : line("M46 112 C70 140 150 140 174 112", pal.dishDot, 7, 1, 'stroke-dasharray="1 14"'));
    const ST = {
      board: ground(96, 150, 104) + R(12, 34, 176, 104, 20, pal.wood) + line("M30 62 q58 -8 118 0 M30 90 q68 8 140 0 M40 116 q56 -6 112 0", dk(pal.wood, 0.2), 2, 0.8) + C(168, 54, 6, dk(pal.wood, 0.25)) +
        `<g transform="translate(192 80) rotate(16)">${P("M0 0 L8 -58 C17 -54 19 -26 15 0Z", pal.steel)}${shine("M4 -6 L9 -50", 2, 0.8)}${R(-3, 0, 21, 42, 8, pal.handle)}</g>`,
      pot: ground(84, 180, 110) + R(8, 92, 30, 16, 8, dk(pal.pot, 0.25)) + R(182, 92, 30, 16, 8, dk(pal.pot, 0.25)) + P("M34 80 L42 156 C44 176 176 176 178 156 L186 80Z", pal.pot) + shine("M52 98 L57 150", 6, 0.4) +
        E(110, 80, 78, 22, lt(pal.pot, 0.35)) + fe(110, 82, 66, 16, dk(pal.pot, 0.45)) + fe(110, 86, 62, 12, "#ffd166") + fe(94, 83, 12, 3, "#fff1bf") + fe(130, 89, 5, 2.4, "#fff1bf") +
        [82, 110, 138].map((x, i) => shine(`M${x} 56 q-8 -9 0 -18 q8 -9 0 -18`, 5, 0.75 - i * 0.1)).join("") + face(110, 128, 1.2),
      pan: ground(92, 136, 100) + `<g transform="rotate(-8 180 76)">${R(170, 66, 74, 18, 9, pal.handle)}</g>` + E(100, 84, 92, 44, pal.pan) + fe(100, 82, 80, 35, dk(pal.pan, 0.3)) + fe(100, 86, 74, 30, dk(pal.pan, 0.48)) + shine("M38 70 C54 54 90 48 118 52", 5, 0.4),
      burner: R(10, 42, 200, 68, 16, pal.steel) + fe(110, 70, 72, 20, "#2b2f36") + flames + C(34, 98, 6, pal.knob) + C(186, 98, 6, pal.knob),
      oven: ground(92, 192, 110) + R(16, 12, 188, 172, 18, pal.oven) + line("M18 60 H202", dk(pal.oven, 0.3), 2.5) + [46, 84, 122].map((x) => C(x, 36, 12, pal.knob) + line(`M${x} 36 v-8`, "#fff", 3)).join("") +
        `<rect x="146" y="22" width="48" height="28" rx="6" fill="#22303a"/><text x="170" y="42" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="15" fill="#7dffa0">180°</text>` +
        R(34, 72, 152, 80, 12, dk(pal.oven, 0.4)) + `<rect x="44" y="82" width="132" height="60" rx="8" fill="#ffb347"/>` + fe(110, 108, 52, 22, "#ffe08a", 0.85) + `<rect x="60" y="130" width="100" height="6" rx="3" fill="#5a4a3a"/>` +
        [80, 110, 140].map((x) => P(`M${x - 13} 130 q13 -28 26 0Z`, "#c9843c") + fe(x - 3, 118, 3, 1.6, "#f0c48f")).join("") + R(54, 160, 112, 11, 5.5, "#ffffff"),
      mixbowl: ground(84, 162, 110) + P("M22 66 C26 128 66 156 110 156 C154 156 194 128 198 66Z", pal.bowl) + shine("M40 82 C48 112 64 130 84 138", 6, 0.45) + E(110, 66, 88, 24, lt(pal.bowl, 0.4)) + fe(110, 68, 76, 17, dk(pal.bowl, 0.3)) + fe(110, 72, 70, 12, "#fff0b8") +
        `<g transform="translate(152 8) rotate(20)">${R(-4, 0, 9, 44, 4.5, pal.handle)}${line("M0 42 c-14 14 -12 32 0 38 c12 -6 14 -24 0 -38 M0 44 v34 M-7 56 q7 14 14 0", pal.steelLine, 2.8)}</g>` + face(110, 118, 1.15),
      tray: ground(98, 138, 115) + R(12, 26, 206, 104, 14, pal.steel) + `<rect x="26" y="38" width="178" height="80" rx="8" fill="${lt(pal.steel, 0.45)}"/>` +
        [[62, 60], [115, 60], [168, 60], [62, 96], [115, 96], [168, 96]].map(([x, y]) => C(x, y, 15, "#dba25c") + `<circle cx="${x - 5}" cy="${y - 3}" r="2.4" fill="#5a3418"/><circle cx="${x + 5}" cy="${y + 2}" r="2.4" fill="#5a3418"/><circle cx="${x + 1}" cy="${y - 6}" r="2" fill="#5a3418"/><circle cx="${x - 2}" cy="${y + 6}" r="2" fill="#5a3418"/>`).join(""),
      bowlBack, bowlFront,
      bowl: ground(80, 172, 110) + R(84, 156, 52, 14, 6, dk(pal.dish, 0.3)) + bowlBack + bowlFront,
      plate: ground(100, 100, 115) + E(115, 58, 104, 38, pal.dishRim) + `<ellipse cx="115" cy="58" rx="91" ry="31" fill="none" stroke="${pal.dish}" stroke-width="4.5"/>` + fe(115, 60, 68, 22, dk(pal.dishRim, 0.07)) + shine("M48 46 C68 32 106 26 136 28", 5, 0.9),
      glass: ground(48, 188, 80) + P("M30 30 L46 172 C48 186 112 186 114 172 L130 30Z", "#dff4f1", 'fill-opacity=".62"') + E(80, 30, 50, 12, "#f4fcfb", 'fill-opacity=".88"') + shine("M42 52 L54 158", 7, 0.85),
    };

    /* ------------------------------ tools (80 x 80) ------------------------------ */
    const TOOL = {
      Knife: `<g transform="translate(40 42) rotate(40)">${P("M-6 6 L2 -34 C10 -30 12 -12 8 6Z", pal.steel)}${R(-8, 6, 18, 28, 7, pal.handle)}</g>`,
      Spoon: `<g transform="translate(40 40) rotate(35)">${R(-4, -4, 8, 40, 4, pal.wood)}${E(0, -18, 13, 17, pal.wood)}${fe(-3, -22, 4, 6, "#fff", 0.4)}</g>`,
      Spatula: `<g transform="translate(40 40) rotate(35)">${R(-4, 0, 8, 34, 4, pal.handle)}${R(-13, -32, 26, 34, 6, pal.steel)}${line("M-6 -26 v20 M0 -26 v20 M6 -26 v20", pal.steelLine, 2.6)}</g>`,
      Whisk: `<g transform="translate(40 40) rotate(35)">${R(-4, 2, 8, 32, 4, pal.handle)}${line("M0 4 c-16 -14 -14 -34 0 -40 c14 6 16 26 0 40Z M0 2 v-36 M-8 -10 q8 -16 16 0", pal.steelLine, 3)}</g>`,
      Masher: `<g transform="translate(40 40) rotate(20)">${R(-4, -34, 8, 34, 4, pal.knob)}${line("M0 0 v10", pal.steelLine, 5)}${R(-18, 10, 36, 14, 5, pal.steel)}${line("M-10 13 v8 M-3 13 v8 M4 13 v8 M11 13 v8", pal.steelLine, 2.4)}</g>`,
      "Oven mitt": P("M24 66 L22 34 C22 18 44 16 46 32 L46 40 C52 30 64 34 60 46 L54 66Z", pal.mitt) + R(20, 62, 38, 10, 5, "#ffe08a") + shine("M30 34 C30 28 38 28 38 34", 3, 0.6),
    };

    /* Sprig, the companion (200 x 200), is the same character in every style. */
    const SPRIG = `<ellipse cx="80" cy="176" rx="14" ry="7" fill="#8a5528"/><ellipse cx="122" cy="176" rx="14" ry="7" fill="#8a5528"/><path d="M58 104 C56 64 142 58 148 100 C154 142 130 176 100 174 C66 172 60 140 58 104 Z" fill="#c98a4b"/><path d="M70 92 C74 74 96 68 112 72" fill="none" stroke="#e6b27a" stroke-width="6" stroke-linecap="round"/><path d="M102 66 C100 50 102 38 104 26" fill="none" stroke="#4c9a2a" stroke-width="6" stroke-linecap="round"/><path d="M104 30 C80 6 52 18 60 38 C76 44 94 40 104 30 Z" fill="#6cc04a"/><path d="M104 30 C128 6 156 16 148 36 C132 42 114 40 104 30 Z" fill="#7fd156"/><g transform="translate(103 112)"><path d="M-21 -3 Q-14 -13 -7 -3 M7 -3 Q14 -13 21 -3" fill="none" stroke="#2d1b0f" stroke-width="4" stroke-linecap="round"/><path d="M-12 7 Q0 25 12 7 Z" fill="#7a2a1a"/><ellipse cx="-25" cy="9" rx="6.5" ry="4" fill="#ff7f86" opacity=".6"/><ellipse cx="25" cy="9" rx="6.5" ry="4" fill="#ff7f86" opacity=".6"/></g>`;

    return { FOOD, ST, TOOL, SIZE, SPRIG, P, C, E, R, flat, fe, line, shine, face };
  };
})();
