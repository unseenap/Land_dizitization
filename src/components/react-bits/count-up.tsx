"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function CountUp({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [motionValue, reduceMotion, value]);

  return <>{(reduceMotion ? value : display).toLocaleString()}</>;
}
