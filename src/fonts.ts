// Font loading. Both families are self-hosted from public/assets/fonts, so a
// render never depends on the network (Google Fonts timed out during
// production). Switzer comes from the files ProtoVinci's site serves; Geist
// Mono is the variable font from Google Fonts (SIL Open Font License).

import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { FONT } from "./theme";

const switzer: Array<[string, string]> = [
  ["500", "assets/fonts/Switzer-Medium.woff2"],
  ["600", "assets/fonts/Switzer-Semibold.woff2"],
  ["700", "assets/fonts/Switzer-Bold.woff2"],
];

for (const [weight, file] of switzer) {
  loadFont({ family: FONT.sans, url: staticFile(file), weight, style: "normal", format: "woff2" });
}

loadFont({
  family: FONT.mono,
  url: staticFile("assets/fonts/GeistMono-Variable.woff2"),
  weight: "100 900",
  style: "normal",
  format: "woff2",
});
