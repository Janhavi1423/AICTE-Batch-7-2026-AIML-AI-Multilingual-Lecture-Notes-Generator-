"use client";

import { useState, useRef } from "react";
import axios from "axios";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // ==========================
  // Upload Existing File
  // ==========================
  const handleUpload = async (audioFile?: Blob) => {
    const selectedFile = audioFile
      ? new File([audioFile], "recording.wav", { type: "audio/wav" })
      : file;

    if (!selectedFile) return alert("Please select or record a file");

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/process-full",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Error processing file");
    }

    setLoading(false);
  };

  // ==========================
  // Start Recording
  // ==========================
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      handleUpload(blob); // automatically send recorded audio
    };

    mediaRecorder.start();
    setRecording(true);
  };

  // ==========================
  // Stop Recording
  // ==========================
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex justify-center items-center">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          🎙 Lecture Voice to Notes
        </h1>

        {/* File Upload */}
        <input
          type="file"
          accept="audio/*"
          className="mb-4"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        {/* Mic Recording Button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg mb-4 transition"
        >
          {recording ? "⏹ Stop Recording" : "🎤 Start Recording"}
        </button>

        {/* Upload Button */}
        <button
          onClick={() => handleUpload()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-300"
        >
          {loading ? "⏳ Processing..." : "Upload & Generate Notes"}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-6">

            {/* Transcript */}
            <div>
              <h2 className="font-semibold text-lg text-blue-600">
                📄 Transcript
              </h2>
              <p className="text-gray-700">{result.transcript}</p>
            </div>

            {/* Summary */}
            <div>
              <h2 className="font-semibold text-lg text-purple-600">
                ✨ Summary
              </h2>
              <p className="text-gray-700">{result.summary}</p>
            </div>

            {/* Language */}
            <div>
              <h2 className="font-semibold text-lg text-green-600">
                🌍 Detected Language
              </h2>
              <p>{result.language}</p>
            </div>

            {/* Quiz */}
            {result.quiz && result.quiz.length > 0 && (
              <div>
                <h2 className="text-lg font-bold">📝 Quiz</h2>
                {result.quiz.map((q: any, i: number) => (
                  <div key={i} className="mb-2">
                    <p>{q.question}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Flashcards */}
            {result.flashcards && result.flashcards.length > 0 && (
              <div>
                <h2 className="text-lg font-bold">📚 Flashcards</h2>
                {result.flashcards.map((card: any, i: number) => (
                  <div key={i} className="mb-2 p-2 border rounded">
                    <p><strong>Front:</strong> {card.front}</p>
                    <p><strong>Back:</strong> {card.back}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}