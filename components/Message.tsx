"use client";

import { useState } from "react";
import { Copy, Check, User, Bot, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
  image?: string;
}

export default function Message({ role, content, timestamp, image }: MessageProps) {
  const [copied, setCopied] = useState(false);

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isUser = role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>

        {/* Header Area (Role & Time) */}
        <div className={`flex items-center gap-2 mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-600 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <div className={`flex items-center gap-1.5 ${isUser ? "text-blue-600 dark:text-blue-400" : ""}`}>
            {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-indigo-500" />}
            <span>{isUser ? "You" : "Nexus AI"}</span>
          </div>
          <span className="opacity-40">•</span>
          <span>{formattedTime}</span>
        </div>

        {/* Message Bubble container */}
        <div className="relative group w-full">
          <div
            className={`px-6 py-4 rounded-[1.5rem] text-[15px] leading-relaxed shadow-sm whitespace-pre-line border transition-all ${isUser
              ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none border-blue-500/10 shadow-blue-500/10"
              : "bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 rounded-tl-none border-gray-100 dark:border-white/5 shadow-gray-200/20 dark:shadow-none"
              }`}
          >
            {image && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                <img src={image} alt="Nexus AI Context" className="max-w-full h-auto object-cover max-h-96" />
              </div>
            )}

            <div className="font-medium">
              {content}
            </div>

            {/* AI Magic Feedback - Subtle visual cue for AI messages */}
            {!isUser && (
              <div className="absolute top-1 right-2 opacity-10">
                <Sparkles className="w-12 h-12 rotate-[-15deg] text-indigo-500" />
              </div>
            )}
          </div>

          {/* Floating Actions on Hover */}
          <button
            onClick={handleCopy}
            className={`absolute top-2 ${isUser ? "-left-12" : "-right-12"}
                        opacity-0 group-hover:opacity-100 transition-all duration-300
                        bg-white dark:bg-zinc-800 border border-gray-100 dark:border-white/10
                        rounded-xl p-2.5 shadow-xl hover:scale-110 active:scale-95`}
            title="Secure Copy"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500 stroke-[3]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}