// Textures painted in code (deterministic): the Mumbai view outside the window
// and the red-chalk sketchbook pages.

import * as THREE from "three";
import { seeded } from "../../utilities/rng";

export type TimeOfDay = "day" | "golden" | "night";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

const toTexture = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};

const SKY: Record<TimeOfDay, { top: string; mid: string; horizon: string; sea: string; seaHi: string; far: string; near: string; haze: string }> = {
  day: { top: "#8FB7DA", mid: "#BCD5EA", horizon: "#E8EEF0", sea: "#7FA2B5", seaHi: "#D6E4EA", far: "#A9B8C6", near: "#6F7E8E", haze: "rgba(232,238,240,0.55)" },
  golden: { top: "#5E6E9E", mid: "#E79A6A", horizon: "#FBD9A0", sea: "#9A7A78", seaHi: "#FFD9A0", far: "#B48A86", near: "#5A4652", haze: "rgba(251,205,150,0.45)" },
  night: { top: "#070B1C", mid: "#152045", horizon: "#33406A", sea: "#0E1630", seaHi: "#F2C66D", far: "#26304F", near: "#121830", haze: "rgba(60,72,120,0.35)" },
};

/** The view from the studio window: sky, Arabian Sea, Bandra-Worli Sea Link, towers. */
export const skylineTexture = (tod: TimeOfDay) => {
  const W = 2048;
  const H = 1024;
  const [c, g] = canvas(W, H);
  const p = SKY[tod];
  const rnd = seeded(tod === "day" ? 11 : tod === "golden" ? 12 : 13);
  const horizon = H * 0.66;

  // Sky.
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, p.top);
  sky.addColorStop(0.6, p.mid);
  sky.addColorStop(1, p.horizon);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, horizon + 2);
  if (tod === "night") {
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
      g.fillRect(rnd() * W, rnd() * horizon * 0.7, 1.5, 1.5);
    }
    g.fillStyle = "#F4F1E4";
    g.beginPath();
    g.arc(W * 0.78, H * 0.16, 26, 0, Math.PI * 2);
    g.fill();
  }
  if (tod === "golden") {
    const sun = g.createRadialGradient(W * 0.72, horizon - 40, 10, W * 0.72, horizon - 40, 420);
    sun.addColorStop(0, "rgba(255,240,200,1)");
    sun.addColorStop(0.08, "rgba(255,214,150,0.9)");
    sun.addColorStop(1, "rgba(255,170,110,0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, W, horizon);
  }
  // Soft clouds.
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W;
    const y = horizon * (0.15 + rnd() * 0.45);
    const r = 120 + rnd() * 260;
    const cl = g.createRadialGradient(x, y, 0, x, y, r);
    const a = tod === "night" ? 0.08 : 0.3;
    cl.addColorStop(0, `rgba(255,255,255,${a})`);
    cl.addColorStop(1, "rgba(255,255,255,0)");
    g.save();
    g.scale(1, 0.32);
    g.fillStyle = cl;
    g.beginPath();
    g.arc(x, y / 0.32, r, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Sea.
  const sea = g.createLinearGradient(0, horizon, 0, H);
  sea.addColorStop(0, p.horizon);
  sea.addColorStop(0.08, p.sea);
  sea.addColorStop(1, p.sea);
  g.fillStyle = sea;
  g.fillRect(0, horizon, W, H - horizon);
  g.strokeStyle = p.seaHi;
  for (let i = 0; i < 260; i++) {
    const y = horizon + 6 + Math.pow(rnd(), 1.6) * (H - horizon);
    const x = rnd() * W;
    g.globalAlpha = (tod === "night" ? 0.25 : 0.35) * (1 - (y - horizon) / (H - horizon) * 0.5);
    g.lineWidth = 1 + (y - horizon) / 160;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 10 + rnd() * 50, y);
    g.stroke();
  }
  g.globalAlpha = 1;

  // City: far and near rows of towers along the shore (right side: the city).
  const towers = (x0: number, x1: number, base: number, hMin: number, hMax: number, fill: string, lit: number) => {
    let x = x0;
    while (x < x1) {
      const w = 18 + rnd() * 46;
      const h = hMin + Math.pow(rnd(), 1.8) * (hMax - hMin);
      g.fillStyle = fill;
      g.fillRect(x, base - h, w, h + 2);
      if (rnd() > 0.82) g.fillRect(x + w * 0.45, base - h - 30 - rnd() * 30, 2, 40);
      if (lit > 0) {
        for (let yy = base - h + 6; yy < base - 4; yy += 9)
          for (let xx = x + 4; xx < x + w - 4; xx += 7) if (rnd() < lit) {
            g.fillStyle = tod === "night" ? "rgba(255,214,140,0.95)" : "rgba(255,230,180,0.7)";
            g.fillRect(xx, yy, 3, 4);
          }
      }
      x += w + rnd() * 6;
    }
  };
  const shore = horizon + 4;
  towers(W * 0.42, W, shore, 40, 230, p.far, tod === "night" ? 0.18 : tod === "golden" ? 0.03 : 0);
  g.fillStyle = p.haze;
  g.fillRect(W * 0.4, shore - 260, W * 0.6, 262);
  towers(W * 0.55, W, shore + 6, 30, 140, p.near, tod === "night" ? 0.3 : tod === "golden" ? 0.05 : 0);
  // Low shoreline.
  g.fillStyle = p.near;
  g.fillRect(W * 0.4, shore, W * 0.6, 10);

  // Bandra-Worli Sea Link: long deck over the water, cable-stayed pylons.
  const deckY = (x: number) => shore + 22 - Math.sin((x / W) * Math.PI) * 10;
  const link = tod === "night" ? "#3B4468" : tod === "golden" ? "#6A5258" : "#8A97A6";
  g.strokeStyle = link;
  g.lineWidth = 5;
  g.beginPath();
  for (let x = 0; x <= W * 0.62; x += 8) (x === 0 ? g.moveTo(x, deckY(x)) : g.lineTo(x, deckY(x)));
  g.stroke();
  // Deck piers.
  g.lineWidth = 2;
  for (let x = 20; x < W * 0.62; x += 46) {
    g.beginPath();
    g.moveTo(x, deckY(x));
    g.lineTo(x, shore + 40);
    g.stroke();
  }
  const pylon = (px: number, h: number) => {
    const top = deckY(px) - h;
    const base = deckY(px) + 4;
    g.strokeStyle = link;
    g.lineWidth = 6;
    // Inverted Y: two legs meeting, then a single mast.
    g.beginPath();
    g.moveTo(px - h * 0.12, base);
    g.lineTo(px, top + h * 0.45);
    g.lineTo(px + h * 0.12, base);
    g.moveTo(px, top + h * 0.45);
    g.lineTo(px, top);
    g.stroke();
    // Fan of cables.
    g.lineWidth = 1;
    g.globalAlpha = 0.8;
    for (let i = 1; i <= 9; i++) {
      for (const s of [-1, 1]) {
        const x = px + s * i * h * 0.13;
        g.beginPath();
        g.moveTo(px, top + i * h * 0.035);
        g.lineTo(x, deckY(x));
        g.stroke();
      }
    }
    g.globalAlpha = 1;
    if (tod === "night") {
      g.fillStyle = "#FF5A4A";
      g.beginPath();
      g.arc(px, top - 2, 3, 0, Math.PI * 2);
      g.fill();
    }
  };
  pylon(W * 0.2, 200);
  pylon(W * 0.36, 130);
  if (tod === "night") {
    for (let x = 6; x < W * 0.62; x += 14) {
      g.fillStyle = "rgba(255,210,130,0.95)";
      g.fillRect(x, deckY(x) - 3, 3, 3);
    }
  }
  // Atmospheric haze over everything near the horizon.
  const haze = g.createLinearGradient(0, horizon - 200, 0, horizon + 40);
  haze.addColorStop(0, "rgba(0,0,0,0)");
  haze.addColorStop(1, p.haze);
  g.fillStyle = haze;
  g.fillRect(0, horizon - 200, W, 240);
  return toTexture(c);
};

/**
 * A sketchbook page in red chalk (sanguine): wireframes of an app screen and a
 * web page, a little bird doodle, arrows and notes. `side` picks the page.
 */
export const sketchTexture = (side: "left" | "right") => {
  const W = 1024;
  const H = 1400;
  const [c, g] = canvas(W, H);
  const rnd = seeded(side === "left" ? 41 : 42);
  // Paper.
  g.fillStyle = "#F7F1E4";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(120,100,70,${rnd() * 0.05})`;
    g.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  // Faint dot grid.
  g.fillStyle = "rgba(150,130,100,0.25)";
  for (let y = 60; y < H; y += 40) for (let x = 60; x < W; x += 40) g.fillRect(x, y, 2, 2);
  // Gutter shadow.
  const gut = g.createLinearGradient(side === "left" ? W : 0, 0, side === "left" ? W - 90 : 90, 0);
  gut.addColorStop(0, "rgba(90,70,40,0.28)");
  gut.addColorStop(1, "rgba(90,70,40,0)");
  g.fillStyle = gut;
  g.fillRect(0, 0, W, H);

  const chalk = "#B5452E";
  const j = (v: number, a = 2.5) => v + (rnd() - 0.5) * a;
  // Sketchy line: two or three jittered passes, like chalk.
  const line = (x0: number, y0: number, x1: number, y1: number, w = 3) => {
    for (let pass = 0; pass < 2 + (rnd() > 0.5 ? 1 : 0); pass++) {
      g.strokeStyle = chalk;
      g.globalAlpha = 0.55 + rnd() * 0.3;
      g.lineWidth = w * (0.6 + rnd() * 0.6);
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(j(x0), j(y0));
      const mx = (x0 + x1) / 2 + (rnd() - 0.5) * 6;
      const my = (y0 + y1) / 2 + (rnd() - 0.5) * 6;
      g.quadraticCurveTo(mx, my, j(x1), j(y1));
      g.stroke();
    }
    g.globalAlpha = 1;
  };
  const rect = (x: number, y: number, w: number, h: number, lw = 3) => {
    line(x - 6, y, x + w + 6, y, lw);
    line(x + w, y - 6, x + w, y + h + 6, lw);
    line(x + w + 6, y + h, x - 6, y + h, lw);
    line(x, y + h + 6, x, y - 6, lw);
  };
  const circle = (x: number, y: number, r: number, lw = 3) => {
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = chalk;
      g.globalAlpha = 0.6 + rnd() * 0.3;
      g.lineWidth = lw;
      g.beginPath();
      for (let a = 0; a <= Math.PI * 2.1; a += 0.15) {
        const rr = r + (rnd() - 0.5) * 3;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (a === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  };
  const hatch = (x: number, y: number, w: number, h: number) => {
    for (let k = -h; k < w; k += 14) line(x + Math.max(0, k), y + Math.max(0, -k), x + Math.min(w, k + h), y + Math.min(h, w - k), 1.5);
  };
  const scribble = (x: number, y: number, w: number) => {
    g.font = "italic 34px Georgia, serif";
    g.fillStyle = chalk;
    g.globalAlpha = 0.75;
    const words = ["flow", "v2", "tap!", "ship it", "ok", "AI agent", "+ CRM", "clean", "→ email"];
    g.fillText(words[Math.floor(rnd() * words.length)], x, y);
    g.globalAlpha = 1;
    void w;
  };

  if (side === "left") {
    // Phone wireframe.
    rect(120, 170, 330, 640, 4);
    line(240, 205, 330, 205, 3);
    rect(160, 260, 250, 150);
    hatch(160, 260, 250, 150);
    for (let i = 0; i < 4; i++) line(160, 450 + i * 40, 160 + 120 + rnd() * 120, 450 + i * 40, 2.5);
    rect(160, 640, 250, 70);
    scribble(190, 685, 200);
    // Arrow to the note.
    line(470, 420, 640, 360, 3);
    line(640, 360, 612, 352, 3);
    line(640, 360, 622, 380, 3);
    scribble(660, 360, 200);
    // Little bird doodle (Quill).
    circle(720, 900, 110, 4);
    circle(690, 880, 26, 3);
    circle(752, 880, 26, 3);
    line(712, 925, 730, 945, 3);
    line(730, 945, 748, 925, 3);
    line(720, 790, 745, 700, 4);
    line(745, 700, 760, 790, 3);
    scribble(620, 1080, 200);
    // Flow boxes.
    rect(120, 980, 160, 90);
    rect(330, 1150, 160, 90);
    line(280, 1025, 410, 1150, 3);
    scribble(130, 1300, 200);
  } else {
    // Web page wireframe.
    rect(90, 160, 820, 560, 4);
    line(90, 220, 910, 220, 3);
    for (let i = 0; i < 4; i++) circle(130 + i * 26, 190, 7, 2);
    line(140, 300, 520, 300, 6);
    line(140, 350, 470, 350, 6);
    for (let i = 0; i < 3; i++) line(140, 410 + i * 30, 440, 410 + i * 30, 2);
    rect(140, 520, 160, 56, 3);
    rect(580, 270, 280, 300);
    hatch(580, 270, 280, 300);
    // Cards row.
    for (let i = 0; i < 3; i++) rect(110 + i * 270, 800, 230, 230);
    for (let i = 0; i < 3; i++) circle(225 + i * 270, 880, 40, 3);
    scribble(140, 1110, 200);
    line(380, 1150, 600, 1260, 3);
    line(600, 1260, 572, 1262, 3);
    line(600, 1260, 586, 1236, 3);
    scribble(620, 1290, 200);
    // Big check mark.
    line(700, 1110, 740, 1160, 6);
    line(740, 1160, 840, 1040, 6);
  }
  return toTexture(c);
};
