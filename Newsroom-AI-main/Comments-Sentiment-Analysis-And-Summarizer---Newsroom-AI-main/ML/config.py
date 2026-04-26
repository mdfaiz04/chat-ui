import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "newsroom_ai"
EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"
