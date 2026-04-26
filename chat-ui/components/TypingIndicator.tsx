"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <div className="flex w-full mb-6 justify-start px-4">
      <div className="flex items-center gap-3">
        {/* Avatar Placeholder for AI */}
        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-sm shadow-sm">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
            />
          ))}
          <span className="ml-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            Thinking
          </span>
        </div>
      </div>
    </div>
  );
}