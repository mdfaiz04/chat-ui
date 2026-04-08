// This runs on the server when the page loads
// We're just testing if MongoDB connects successfully
import connectToDatabase from "@/lib/mongoose";

export default async function Home() {
  // Try connecting to the database
  await connectToDatabase();
  console.log("✅ MongoDB connected successfully!");

  return (
    <main>
      <h1>MongoDB Connection Test</h1>
    </main>
  );
}