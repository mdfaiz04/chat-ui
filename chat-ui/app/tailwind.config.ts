// Import Tailwind's Config type for better TypeScript support
import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Configuration
 * Defines how Tailwind scans files, applies themes, and enables features
 */
const config: Config = {
  // Enable dark mode using a CSS class (e.g., <html class="dark">)
  darkMode: "class",

  // Paths where Tailwind will look for class names (tree-shaking unused styles)
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",        // All files inside the app directory
    "./components/**/*.{js,ts,jsx,tsx}", // All reusable UI components
  ],

  theme: {
    // Extend default Tailwind theme (colors, spacing, fonts, etc.)
    extend: {},
  },

  // Add Tailwind plugins here (e.g., forms, typography, animations)
  plugins: [],
};

// Export the configuration for use in the project
export default config;