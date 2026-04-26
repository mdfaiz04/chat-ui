"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Mail, Lock, AlertCircle, Globe, Code, Sparkles, Bot, ArrowRight, Eye, EyeOff } from "lucide-react";

interface LoginCardProps {
  onSuccess?: () => void;
  callbackUrl?: string;
}

export default function LoginCard({ onSuccess, callbackUrl = "/" }: LoginCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (errorParam === "OAuthAccountNotLinked") {
      setError("This email is already linked to another login method. Please sign in using your original provider.");
    } else if (errorParam) {
      setError("Authentication failed. Please check your credentials.");
    }
  }, [errorParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase(),
        password,
      });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      } else {
        if (onSuccess) onSuccess();
        router.push(callbackUrl);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: "google" | "github") => {
    signIn(provider, { callbackUrl });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden border border-gray-100 dark:border-white/5 relative z-10"
    >
      {/* LEFT SIDE - BRANDING & ILLUSTRATION */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Decorative elements for the branding side */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/20">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight">
            Welcome to <br /> <span className="text-blue-200">Nexus AI</span>
          </h1>
          <p className="text-xl opacity-90 font-medium max-w-sm">
            Experience the future of intelligent conversations and creative building.
          </p>

          <div className="mt-12 flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Powered by Next-Gen LLMs</span>
          </div>
        </motion.div>

        {/* Subtle bottom info */}
        <div className="absolute bottom-10 text-white/40 text-xs font-medium">
          Secure. Robust. Intelligent.
        </div>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 lg:p-16 bg-white dark:bg-zinc-900 relative">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-gray-500 dark:text-zinc-400 font-medium">
              Please enter your details to sign in.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/30 rounded-2xl flex items-start gap-4"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-rose-600 dark:text-rose-400 text-sm font-bold leading-snug">
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-zinc-300 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Password</label>
                <Link href="/forgot-password" title="Recover password" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/5 rounded-2xl py-4 pl-12 pr-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 dark:border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
              <span className="bg-white dark:bg-zinc-900 px-6 text-gray-400 dark:text-zinc-500">Or connect with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOAuthSignIn("google")}
              className="flex items-center justify-center gap-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl py-4 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all font-bold text-sm shadow-sm"
            >
              <Globe className="w-5 h-5 text-[#4285F4]" />
              <span>Google</span>
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOAuthSignIn("github")}
              className="flex items-center justify-center gap-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl py-4 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all font-bold text-sm shadow-sm"
            >
              <Code className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
              <span>GitHub</span>
            </motion.button>
          </div>

          <p className="mt-12 text-center text-gray-500 dark:text-zinc-400 font-medium">
            New here?{" "}
            <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-black transition-colors underline underline-offset-4 decoration-2 decoration-blue-500/20">
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
