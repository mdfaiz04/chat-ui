"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ChatWindow from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";
import LoginCard from "@/components/Auth/LoginCard";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Bot, X } from "lucide-react";

/**
 * @component Home
 * @desc Root page component. 
 *       - Guest: Landing Page + Login Modal
 *       - User: Full Chat Application
 */
export default function Home() {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // 1. Loading state
  if (status === "loading") {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-[#05070d]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Landing Page for guests
  if (!session) {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#0a0f1f] dark:via-[#05070d] dark:to-black transition-colors duration-500 relative overflow-hidden px-4">

        {/* Decorative Background Effects - More Dynamic and Vibrant */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 dark:bg-blue-600/20 blur-[140px] rounded-full -z-0"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 dark:bg-purple-600/20 blur-[140px] rounded-full -z-0"
        />

        {/* --- LANDING UI --- */}
        <div className="max-w-4xl w-full text-center z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Next-Generation Intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6"
          >
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Nexus AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-base md:text-lg text-gray-600 dark:text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Experience the future of conversation with our advanced AI assistant.
            Smart, fast, and always ready to help you build something amazing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold shadow-xl shadow-blue-500/25 hover:scale-105 transition-all"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* --- LOGIN MODAL --- */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-5xl z-10"
              >
                {/* Close Button UI */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute -top-14 right-4 md:right-0 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10 shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>

                <LoginCard />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="absolute bottom-8 left-0 right-0 text-center text-sm text-gray-400 dark:text-zinc-600">
          Built with speed & intelligence. © 2026 Nexus AI.
        </div>
      </main>
    );
  }

  // 3. Authenticated App logic
  return (
    <main className="flex h-[100dvh] overflow-hidden bg-white dark:bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        <ChatWindow />
      </div>
    </main>
  );
}