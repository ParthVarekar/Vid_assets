// "Off the Page" — the 60-second master. One composition, three formats.

import React from "react";
import { Automate } from "../scenes/Automate";
import { Hook } from "../scenes/Hook";
import { Proof } from "../scenes/Proof";
import { Reveal } from "../scenes/Reveal";
import { Scale } from "../scenes/Scale";
import { SketchBuild } from "../scenes/SketchBuild";
import { C } from "../theme";
import { REVEAL, SCENES, TOTAL_FRAMES } from "../timeline";
import { CLIMB, LATERAL, Timeline, type FilmProps, type Slot } from "./Film";

export const Master: React.FC<FilmProps> = ({ audio, showWork, url }) => {
  const slots: Slot[] = [
    { id: "hook", ...SCENES.hook, ground: C.paper, exit: LATERAL, render: () => <Hook /> },
    { id: "build", ...SCENES.build, ground: C.paper, exit: LATERAL, render: () => <SketchBuild /> },
    { id: "automate", ...SCENES.automate, ground: C.night, exit: LATERAL, render: () => <Automate /> },
    // The line climbs out of the corner here, so the camera follows it up.
    { id: "scale", ...SCENES.scale, ground: C.night, exit: CLIMB, render: () => <Scale /> },
    { id: "proof", ...SCENES.proof, ground: C.paper, exit: LATERAL, render: () => <Proof showWork={showWork} /> },
    { id: "reveal", ...SCENES.reveal, ground: C.paper, render: () => <Reveal url={url} /> },
  ];
  return (
    <Timeline
      slots={slots}
      total={TOTAL_FRAMES}
      audio={audio}
      headerOutAt={SCENES.reveal.from + REVEAL.land - 8}
    />
  );
};
