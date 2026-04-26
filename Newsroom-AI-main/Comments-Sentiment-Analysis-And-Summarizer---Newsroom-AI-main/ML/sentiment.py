import time
import torch
from ML import config
from transformers import AutoTokenizer, AutoModelForSequenceClassification, logging
from pymongo import MongoClient

# Suppress warnings
logging.set_verbosity_error()

# Global Model Variables
tokenizer = None
model = None

# MongoDB Connection
client = None
db = None
collection = None

def load_model():
    """
    Loads the emotion classification model globally.
    """
    global tokenizer, model
    try:
        print(f"Loading emotion model: {config.EMOTION_MODEL}...")
        tokenizer = AutoTokenizer.from_pretrained(config.EMOTION_MODEL)
        model = AutoModelForSequenceClassification.from_pretrained(config.EMOTION_MODEL)
        print("Emotion model loaded successfully.")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load model {config.EMOTION_MODEL}: {e}")
        exit(1)

def connect_db():
    """
    Connects to MongoDB.
    """
    global client, db, collection
    try:
        client = MongoClient(config.MONGO_URI, serverSelectionTimeoutMS=5000)
        # Explicit test to ensure the database can be reached
        client.admin.command('ping')
        db = client[config.DB_NAME]
        collection = db["comments"]
        print(f"Connected to MongoDB at {config.MONGO_URI}")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        client = None
        db = None
        collection = None

def analyze_emotion(text: str) -> dict:
    """
    Analyzes emotion for a single text string.
    Returns dictionary with 'label' and 'score'.
    """
    if not text or not text.strip():
        return None

    try:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        
        with torch.no_grad():
            outputs = model(**inputs)
        
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        score, label_id = torch.max(probs, dim=-1)
        
        label = model.config.id2label[label_id.item()]
        confidence = round(score.item(), 4)
        
        return {
            "label": label,
            "score": confidence
        }
    except Exception as e:
        print(f"Error processing text '{text[:20]}...': {e}")
        return None

def process_new_comments():
    """
    Fetches comments without emotion_label and updates them.
    """
    global collection
    if collection is None:
        connect_db()
        if collection is None:
            return

    try:
        # Find comments where 'emotion_label' does not exist
        # Fetching into a list with a limit prevents cursor timeouts during slow ML inference
        docs = list(collection.find({"emotion_label": {"$exists": False}}).limit(100))
        
        count = 0
        for doc in docs:
            text = doc.get("text", "")
            result = analyze_emotion(text)
            
            if result:
                collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "emotion_label": result["label"],
                        "emotion_score": result["score"]
                    }}
                )
                print(f"Updated comment {doc['_id']} -> {result['label']} ({result['score']})")
                count += 1
        
        if count > 0:
            print(f"Processed {count} new comments.")
            
    except Exception as e:
        print(f"Error in processing loop: {e}")
        # Reset collection so the next loop iteration attempts to reconnect
        collection = None

def start_watcher():
    """
    Continuous loop to watch for new comments.
    """
    print("Starting MongoDB watcher... (Press Ctrl+C to stop)")
    connect_db()
    
    while True:
        process_new_comments()
        time.sleep(5)

if __name__ == "__main__":
    load_model()
    
    # Start watcher
    start_watcher()
