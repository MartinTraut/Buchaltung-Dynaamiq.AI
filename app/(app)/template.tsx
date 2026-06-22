"use client"

import { motion } from "motion/react"

/**
 * App-Router template.tsx remountet bei jedem Routenwechsel → sanfter
 * Seitenübergang (Fade + leichtes Rise). Premium, dezent, performant.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
