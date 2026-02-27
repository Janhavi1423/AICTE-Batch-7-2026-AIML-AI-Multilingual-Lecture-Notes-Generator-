from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import whisper
from transformers import pipeline
import tempfile
import os
import re

app = FastAPI(title="Lecture Notes API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading models...")

# Whisper model
whisper_model = whisper.load_model("base")

# Hugging Face summarizer
summarizer = pipeline(
    "text2text-generation",
    model="google/flan-t5-base"
)

print("Models loaded!")


# ===============================
# Quiz Generator
# ===============================
def generate_quiz(text, num=3):
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 20]
    quizzes = []

    for sentence in sentences[:num]:
        words = sentence.split()
        if len(words) > 5:
            answer = words[0]
            question = sentence.replace(answer, "_____", 1)

            quizzes.append({
                "question": question,
                "answer": answer
            })

    return quizzes


# ===============================
# Flashcard Generator
# ===============================
def generate_flashcards(text, num=5):
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 20]
    cards = []

    for sentence in sentences[:num]:
        words = sentence.split()
        mid = len(words) // 2

        cards.append({
            "front": " ".join(words[:mid]),
            "back": " ".join(words[mid:])
        })

    return cards


# ===============================
# Root
# ===============================
@app.get("/")
def root():
    return {"message": "Backend is running successfully"}


# ===============================
# Main Processing Endpoint
# ===============================
@app.post("/api/process-full")
async def process_full(file: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Speech to text
        result = whisper_model.transcribe(tmp_path)
        transcript = result["text"]

        # Delete temp file
        os.unlink(tmp_path)

        # Summary
        prompt = f"Summarize the following lecture in 3 sentences:\n{transcript}"

        summary_output = summarizer(
            prompt,
            max_new_tokens=100
        )

        summary_text = summary_output[0]["generated_text"]

        return {
            "transcript": transcript,
            "summary": summary_text,
            "language": result.get("language", "unknown"),
            "quiz": generate_quiz(transcript),
            "flashcards": generate_flashcards(transcript)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}