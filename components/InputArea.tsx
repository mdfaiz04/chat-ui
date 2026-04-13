"use client"; // Enables client-side rendering (required for React hooks)

import { useState, useRef, useEffect } from "react";
import { Mic, Send, Plus, ChevronDown, Image as ImageIcon, File as FileIcon } from "lucide-react";

/**
 * Props for InputArea component
 */
interface InputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

// Speech Recognition setup - TypeScript-safe and SSR compatible
const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    : null;


/**
 * @component InputArea
 * @desc Handles user input, message sending, and textarea behavior with Upload and Voice features
 */
export default function InputArea({ 
  onSendMessage, 
  isLoading, 
  selectedModel, 
  setSelectedModel,
  setMessages
}: InputAreaProps) {

  // ---------------- STATE ----------------

  const [input, setInput] = useState(""); // Stores user input text
  const [openModel, setOpenModel] = useState(false); // Controls custom dropdown visibility
  const [openUpload, setOpenUpload] = useState(false); // Controls upload menu visibility
  const [isListening, setIsListening] = useState(false); // Voice state

  // ---------------- REFS ----------------

  const textareaRef = useRef<HTMLTextAreaElement>(null); // Reference for textarea
  const dropdownRef = useRef<HTMLDivElement>(null); // Reference for dropdown
  const uploadRef = useRef<HTMLDivElement>(null); // Reference for upload menu
  const recognitionRef = useRef<any>(null); // Ref for SpeechRecognition instance

  /**
   * Auto-resizes textarea based on content
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  /**
   * Handles outside clicks for dropdowns
   */
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

  /**
   * Initialize speech recognition
   */
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

  // ---------------- HANDLERS ----------------

  const handleMic = () => {
    if (!recognitionRef.current) return alert("Speech recognition is not supported in this browser.");

    if (!isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: "🖼 Image uploaded",
        image: imageUrl,
        timestamp: new Date().toISOString()
      }
    ]);
    setOpenUpload(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: `📄 File uploaded: ${file.name}`,
        timestamp: new Date().toISOString()
      }
    ]);
    setOpenUpload(false);
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

  // ---------------- UI ----------------

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-2 shadow-lg dark:shadow-2xl transition-all duration-300">

      {/* TEXTAREA INPUT */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? "Listening..." : "Ask anything..."}
        rows={1}
        disabled={isLoading}
        className="w-full bg-transparent outline-none text-gray-900 dark:text-zinc-100 px-3 py-2 resize-none max-h-[150px] overflow-y-auto leading-relaxed placeholder-gray-400 dark:placeholder-zinc-500 font-medium"
        style={{ minHeight: "44px" }}
      />

      {/* BOTTOM CONTROLS */}
      <div className="flex items-center justify-between mt-1 px-1 pb-1">

        {/* LEFT SIDE: Upload Menu */}
        <div className="flex items-center gap-1">
          <div className="relative" ref={uploadRef}>
            <button 
              type="button"
              onClick={() => setOpenUpload(!openUpload)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${openUpload ? 'rotate-45' : ''}`} />
            </button>

            {/* UPLOAD DROPDOWN */}
            {openUpload && (
              <div className="absolute bottom-full mb-2 left-0 w-44 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                <div className="p-1">
                  <label className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-all">
                    <ImageIcon className="w-4 h-4" />
                    Upload Image
                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                  </label>
                  <label className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-all">
                    <FileIcon className="w-4 h-4" />
                    Upload File
                    <input type="file" hidden onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-400">
            Fast
          </div>
        </div>

        {/* RIGHT SIDE: Model Selection, Mic, Send */}
        <div className="flex items-center gap-2">
          
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpenModel(!openModel)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/50 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition-all duration-200"
            >
              {selectedModel}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openModel ? 'rotate-180' : ''}`} />
            </button>

            {openModel && (
              <div className="absolute bottom-full mb-2 right-0 w-48 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                <div className="p-1">
                  {["Gemini 3 Flash", "Claude Sonnet", "GPT-OSS 120B"].map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model);
                        setOpenModel(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
                        selectedModel === model 
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium" 
                          : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={handleMic}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isListening 
                ? "bg-red-500 text-white animate-pulse" 
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center
              ${input.trim() && !isLoading
                ? "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 scale-100 shadow-md"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 scale-95"
              }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}


