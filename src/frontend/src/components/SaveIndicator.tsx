import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { saveEvents } from "../utils/saveEvents";

type SaveState = "idle" | "saving" | "saved";

export function SaveIndicator() {
  const [state, setState] = useState<SaveState>("idle");
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleSaving = () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      setState("saving");
    };

    const handleSaved = () => {
      setState("saved");
      fadeTimerRef.current = setTimeout(() => {
        setState("idle");
        fadeTimerRef.current = null;
      }, 2000);
    };

    saveEvents.addEventListener("saving", handleSaving);
    saveEvents.addEventListener("saved", handleSaved);

    return () => {
      saveEvents.removeEventListener("saving", handleSaving);
      saveEvents.removeEventListener("saved", handleSaved);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return (
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {state !== "idle" && (
          <motion.div
            key={state}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg border"
            style={{
              background:
                state === "saving"
                  ? "oklch(0.97 0.01 240)"
                  : "oklch(0.96 0.05 145)",
              borderColor:
                state === "saving"
                  ? "oklch(0.88 0.03 240)"
                  : "oklch(0.85 0.1 145)",
              color:
                state === "saving"
                  ? "oklch(0.4 0.08 240)"
                  : "oklch(0.3 0.12 145)",
            }}
          >
            {state === "saving" ? (
              <>
                <motion.span
                  className="inline-block w-3 h-3 rounded-full border-2"
                  style={{
                    borderColor: "oklch(0.6 0.1 240)",
                    borderTopColor: "transparent",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.7,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                />
                Saving...
              </>
            ) : (
              <>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="text-xs"
                >
                  ✓
                </motion.span>
                Saved
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
