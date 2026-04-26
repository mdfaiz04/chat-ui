"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Send, Plus, ChevronDown, Image as ImageIcon, File as FileIcon, Cpu, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MODELS } from "@/lib/models";

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
    : null;

export default function InputArea({
  onSendMessage,
  isLoading,
  selectedModel,
  setSelectedModel,
  setMessages
}: InputAreaProps) {
  const [input, setInput] = useState("");
  const [openModel, setOpenModel] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenModel(false);
      }
      if (uploadRef.current && !uploadRef.current.contains(event.target as Node)) {
        setOpenUpload(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const handleMic = () => {
    if (!recognitionRef.current) return;
    if (!isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentModel = MODELS.find(m => m.value === selectedModel);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative"
      >
        {/* Main Input Container */}
        <div className={`relative group bg-[#fdfdfd] dark:bg-zinc-900/90 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-300 focus-within:shadow-[0_12px_40px_rgb(0,0,0,0.08)] focus-within:border-zinc-300/80 dark:focus-within:border-zinc-700/80`}>

          <div className="flex flex-col p-1.5">
            {/* Textarea Area */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              disabled={isLoading}
              className="w-full bg-transparent outline-none text-zinc-700 dark:text-zinc-200 px-4 pt-3 pb-1 resize-none leading-relaxed placeholder-zinc-400 dark:placeholder-zinc-600 font-medium text-[16px] min-h-[52px] max-h-[200px]"
            />

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between px-2 pb-1.5">
              <div className="flex items-center gap-3">
                {/* Upload Button */}
                <div className="relative" ref={uploadRef}>
                  <button
                    type="button"
                    onClick={() => setOpenUpload(!openUpload)}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors active:scale-90"
                  >
                    <Plus className={`w-5 h-5 transition-transform duration-300 ${openUpload ? 'rotate-45' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openUpload && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full left-0 mb-3 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-[100] backdrop-blur-xl"
                      >
                        <button className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                          Images
                        </button>
                        <button className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                          <FileIcon className="w-4 h-4 text-emerald-500" />
                          Documents
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* FAST indicator (from reference) */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Fast</span>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                {/* Model Selector Pill (Inside) */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setOpenModel(!openModel)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                  >
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      {currentModel?.label || "Select Model"}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openModel ? 'rotate-180' : ''} text-zinc-400`} />
                  </button>

                  <AnimatePresence>
                    {openModel && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full right-0 mb-3 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-[100] backdrop-blur-xl"
                      >
                        {MODELS.map((model) => (
                          <button
                            key={model.value}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.value);
                              setOpenModel(false);
                            }}
                            className={`flex flex-col w-full text-left px-3 py-2 rounded-xl transition-all ${selectedModel === model.value
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                              : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium"
                              }`}
                          >
                            <span className="text-xs">{model.label}</span>
                            <span className="text-[9px] opacity-60 uppercase tracking-tighter">{model.provider}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Voice Button */}
                <button
                  type="button"
                  onClick={handleMic}
                  className={`p-2 rounded-full transition-all active:scale-90 ${isListening
                    ? "text-rose-500 animate-pulse"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    }`}
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${input.trim() && !isLoading
                    ? "bg-zinc-100 dark:bg-white/10 text-zinc-400 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/20 active:scale-95 shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-200 dark:text-zinc-700"
                    }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : (
                    <Send className={`w-4 h-4 ${input.trim() ? 'text-zinc-700 dark:text-white' : ''}`} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Helper Text */}
        <div className="mt-3 text-center">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-widest opacity-60">
            Nexus Intelligence Framework
          </p>
        </div>
      </motion.div>
    </div>
  );
}