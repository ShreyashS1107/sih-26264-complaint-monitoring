import type { Variants } from "motion/react";

/**
 * Reusable Motion & Animation System for AICTE Institutional Intelligence
 * Powered by motion/react with native reduced-motion fallback.
 */

// 1. Fade & Rise Entrance
export const fadeInUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// 2. Simple Opacity Fade
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

// 3. Staggered Container for Lists and Grids
export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

// 4. Subtle Scale-in for Modals and Highlight Cards
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// 5. Expand & Collapse Accordion / Drawer
export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "visible",
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// 6. Interactive Button Press & Hover Props
export const interactiveButtonProps = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.12, ease: "easeOut" as const },
};
