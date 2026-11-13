// Font loading. Switzer is loaded from the same files ProtoVinci's site serves;
// Geist Mono, the site's label face, comes from Google Fonts.

import { loadFont } from "@remotion/fonts";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { staticFile } from "remotion";
import { FONT } from "./theme";

const switzer: Array<[string, string]> = [
  ["500", "assets/fonts/Switzer-Medium.woff2"],
  ["600", "assets/fonts/Switzer-Semibold.woff2"],
  ["700", "assets/fonts/Switzer-Bold.woff2"],
];

for (const [weight, file] of switzer) {
  loadFont({
    family: FONT.sans,
    url: staticFile(file),
    weight,
    style: "normal",
    format: "woff2",
  });
}

loadGeistMono("normal", { weights: ["400", "500"], subsets: ["latin"] });
