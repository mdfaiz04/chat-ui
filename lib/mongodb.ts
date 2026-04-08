// We import the MongoClient class from the mongodb package
// MongoClient is the tool that actually connects to our database
import { MongoClient } from "mongodb";

// We read the connection string from our .env.local file
// process.env is how Next.js reads environment variables
const uri = process.env.MONGODB_URI as string;

// Safety check — if someone forgets to add MONGODB_URI to .env.local,
// this will throw a clear error instead of a confusing one
if (!uri) {
  throw new Error("Please add MONGODB_URI to your .env.local file");
}

// We create ONE MongoClient instance
// Think of this like creating ONE phone — you don't need 10 phones to make calls
let client: MongoClient;

// This variable will hold our "promise" of a connection
// A Promise means: "I will give you this value in the future"
let clientPromise: Promise<MongoClient>;

// In development mode, we store the connection on a global variable
// This is because Next.js restarts the server on every file save,
// and without this, it would create hundreds of connections to MongoDB
if (process.env.NODE_ENV === "development") {
  // global is a special object that persists across server restarts in dev mode
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  // If a connection doesn't exist yet, create one
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri); // Create the client
    globalWithMongo._mongoClientPromise = client.connect(); // Connect and store it
  }

  // Reuse the existing connection
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, just create a fresh connection normally
  // No need for the global trick since the server doesn't hot-reload
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Export the connection promise so other files can use it
// Any file that needs the DB will import this and await it
export default clientPromise;