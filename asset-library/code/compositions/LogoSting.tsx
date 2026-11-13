// A reusable logo sting: the line arrives, writes the cradle, the quill docks
// and the name sets. About 6 seconds. Built from the film's Reveal scene with
// the call to action switched off.

import React from "react";
import { Reveal } from "../scenes/Reveal";
import { C } from "../theme";
import { BAR, PRE, REVEAL } from "../timeline";
import { Timeline, type Slot } from "./Film";

const NEVER = 99999;
export const STING_FRAMES = BAR * 2 + 36;

const STING_K: typeof REVEAL = {
  ...REVEAL,
  moveUp: NEVER,
  cta: NEVER,
  underline: NEVER,
  url: NEVER,
  foot: NEVER,
};

export const LogoSting: React.FC<{ audio: string | null }> = ({ audio }) => {
  const slots: Slot[] = [
    {
      id: "sting",
      from: PRE,
      to: STING_FRAMES,
      folio: "01",
      label: "protovinci",
      ground: C.paper,
      render: () => <Reveal k={STING_K} length={STING_FRAMES} />,
    },
  ];
  return <Timeline slots={slots} total={STING_FRAMES} audio={audio} headerOutAt={0} />;
};
