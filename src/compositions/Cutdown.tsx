// The 15-second cutdown: the same scenes on compressed event tables, one bar
// each, then the logo and call to action. The proposition is readable inside
// the first two seconds and the brand header is present from the first frame.

import React from "react";
import { Automate } from "../scenes/Automate";
import { Hook } from "../scenes/Hook";
import { Reveal } from "../scenes/Reveal";
import { Scale } from "../scenes/Scale";
import { SketchBuild } from "../scenes/SketchBuild";
import { C } from "../theme";
import {
  CUT_AUTOMATE,
  CUT_BUILD,
  CUT_HOOK,
  CUT_REVEAL,
  CUT_SCALE,
  CUT_SCENES,
  CUT_TOTAL_FRAMES,
} from "../timeline";
import { CLIMB, LATERAL, Timeline, type FilmProps, type Slot } from "./Film";

const len = (s: { from: number; to: number }) => s.to - s.from;

export const Cutdown: React.FC<FilmProps> = ({ audio, url }) => {
  const S = CUT_SCENES;
  const slots: Slot[] = [
    { id: "hook", ...S.hook, ground: C.paper, exit: LATERAL, render: () => <Hook k={CUT_HOOK} length={len(S.hook)} /> },
    { id: "build", ...S.build, ground: C.paper, exit: LATERAL, render: () => <SketchBuild k={CUT_BUILD} length={len(S.build)} /> },
    { id: "automate", ...S.automate, ground: C.night, exit: LATERAL, render: () => <Automate k={CUT_AUTOMATE} length={len(S.automate)} /> },
    { id: "scale", ...S.scale, ground: C.night, exit: CLIMB, render: () => <Scale k={CUT_SCALE} length={len(S.scale)} /> },
    {
      id: "reveal",
      ...S.reveal,
      ground: C.paper,
      render: () => <Reveal k={CUT_REVEAL} length={len(S.reveal)} url={url} fromCorner />,
    },
  ];
  return (
    <Timeline
      slots={slots}
      total={CUT_TOTAL_FRAMES}
      audio={audio}
      headerOutAt={S.reveal.from + CUT_REVEAL.land - 8}
    />
  );
};
