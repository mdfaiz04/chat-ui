"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Send, Plus, ChevronDown, Image as ImageIcon, File as FileIcon, Sparkles, Brain, Cpu } from "lucide-react";
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

  const currentModelLabel = MODELS.find(m => m.value === selectedModel)?.label || "Select Model";

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative w-full max-w-4xl mx-auto"
    >
      <div className="relative group bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-gray-200/50 dark:border-white/5 rounded-[2rem] p-3 shadow-2xl transition-all duration-500 hover:shadow-blue-500/5 focus-within:ring-1 focus-within:ring-blue-500/20">

        {/* Input Field Area */}
        <div className="flex flex-col gap-2 min-h-[60px] max-h-[300px] overflow-hidden">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or use '/' for commands..."
            rows={1}
            disabled={isLoading}
            className="w-full bg-transparent outline-none text-gray-800 dark:text-zinc-100 px-4 py-3 resize-none leading-relaxed placeholder-gray-400 dark:placeholder-zinc-600 font-medium text-[16px]"
          />
        </div>

        {/* Toolbar Area */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="relative" ref={uploadRef}>
              <button
                type="button"
                onClick={() => setOpenUpload(!openUpload)}
                className="p-2.5 rounded-2xl text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-90"
              >
                <Plus className={`w-5 h-5 transition-transform duration-300 ${openUpload ? 'rotate-45 text-blue-500' : ''}`} />
              </button>

              <AnimatePresence>
                {openUpload && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-4 left-0 w-52 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-[60]"
                  >
                    <button className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                      <ImageIcon className="w-4 h-4" />
                      Image context
                    </button>
                    <button className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                      <FileIcon className="w-4 h-4" />
                      Knowledge base
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-6 w-[1px] bg-gray-100 dark:bg-white/5 mx-1" />

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOpenModel(!openModel)}
                className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.1em] text-gray-500 dark:text-zinc-400 transition-all active:scale-95"
              >
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                {currentModelLabel}
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${openModel ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              <AnimatePresence>
                {openModel && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-4 right-0 w-64 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-[60]"
                  >
                    {MODELS.map((model) => (
                      <button
                        key={model.value}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.value);
                          setOpenModel(false);
                        }}
                        className={`group flex flex-col gap-0.5 w-full text-left px-4 py-3 rounded-xl transition-all ${selectedModel === model.value
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-white/5"
                          }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest">{model.label}</span>
                        <span className={`text-[9px] font-bold ${selectedModel === model.value ? "text-blue-100 opacity-80" : "text-gray-400"}`}>
                          Engine: {model.provider}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMic}
              className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-75 ${isListening
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "text-gray-400 hover:text-blue-500 hover:bg-blue-500/5"
                }`}
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`group w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 relative overflow-hidden ${input.trim() && !isLoading
                ? "bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-90"
                : "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-zinc-600"
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Send className="relative w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}