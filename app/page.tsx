// Import the ChatWindow component which handles the chat UI and logic
import ChatWindow from "@/components/ChatWindow";

/**
 * @component Home
 * @desc Root page component (default route in Next.js App Router)
 *       Renders the main chat interface
 */
export default function Home() {
  return (
    // Main container for the page content
    <main>
      {/* ChatWindow component displays the chat UI and manages interactions */}
      <ChatWindow />
    </main>
  );
}