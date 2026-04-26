import whisper
import sounddevice as sd
from scipy.io.wavfile import write

# ==============================
# SHOW AVAILABLE DEVICES
# ==============================
print("Available Audio Devices:")
print(sd.query_devices())

# 👉 Set your microphone index here (change if needed)
sd.default.device = 0   # Use Microphone Array (Realtek)

# ==============================
# RECORD AUDIO FUNCTION
# ==============================
def record_audio(filename="input.wav", duration=10, fs=16000):
    print("\n🎤 Speak now...")
    
    recording = sd.rec(int(duration * fs),
                       samplerate=fs,
                       channels=1,
                       dtype='int16')
    
    sd.wait()
    write(filename, fs, recording)
    
    print("✅ Recording complete")

# ==============================
# LOAD WHISPER MODEL (BETTER)
# ==============================
print("\n⏳ Loading AI model (this may take time first run)...")
model = whisper.load_model("large")  # 🔥 better accuracy

# ==============================
# RECORD AUDIO
# ==============================
record_audio()

# ==============================
# TRANSCRIBE AUDIO
# ==============================
print("\n🧠 Processing speech...")

result = model.transcribe(
    "input.wav",
    language="en",
    initial_prompt="This is a voice command for a computer assistant"
)

# ==============================
# OUTPUT
# ==============================
text = result["text"].strip()

print("\n📝 Transcribed Text:")
print("👉", text if text else "No speech detected ❌")