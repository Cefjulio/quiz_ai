"use client";
import { useState } from "react";
interface Question {
  prompt: { text: string };
  answers: { id: string; text: string }[];
  correctAnswer: string;
}

export default function FillBlank({ question, onAnswer }: { question: Question; onAnswer: (a: unknown, correct: boolean) => void }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Check if answers array is a word bank
  const hasWordBank = question.answers && question.answers.length > 0;

  function submit() {
    if (!input.trim() || submitted) return;
    setSubmitted(true);
    const isCorrect = input.trim().toLowerCase() === question.correctAnswer.toString().toLowerCase();
    setTimeout(() => onAnswer(input.trim(), isCorrect), 600);
  }

  function selectWord(word: string) {
    if (submitted) return;
    setInput(word);
  }

  const parts = question.prompt.text.split("___");

  return (
    <div className="space-y-5">
      {/* Sentence with blank */}
      <div className="duo-card p-6 text-center">
        <p className="text-xl font-black text-gray-800 leading-loose">
          {parts[0]}
          <span
            className={`inline-block min-w-[100px] mx-2 px-3 py-1 rounded-lg border-b-2 font-black transition ${
              submitted
                ? input.toLowerCase() === question.correctAnswer.toString().toLowerCase()
                  ? "bg-[#d7ffb8] border-[#58CC02] text-[#46A302]"
                  : "bg-[#ffdfe0] border-[#FF4B4B] text-[#FF4B4B]"
                : input
                ? "bg-[#e8f9ff] border-[#1CB0F6] text-[#1CB0F6]"
                : "bg-gray-100 border-gray-300 text-gray-400"
            }`}
          >
            {input || "___"}
          </span>
          {parts[1]}
        </p>
      </div>

      {/* Word bank */}
      {hasWordBank && (
        <div className="flex flex-wrap gap-2 justify-center">
          {question.answers.map((ans) => (
            <button
              key={ans.id}
              onClick={() => selectWord(ans.text)}
              disabled={submitted}
              className={`px-4 py-2 rounded-xl font-bold border-2 border-b-4 transition ${
                input === ans.text
                  ? "border-[#1CB0F6] bg-[#1CB0F6] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#1CB0F6]"
              }`}
            >
              {ans.text}
            </button>
          ))}
        </div>
      )}

      {/* Manual input fallback */}
      {!hasWordBank && (
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={submitted}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold focus:border-[#1CB0F6] focus:outline-none text-center text-xl"
          placeholder="Type your answer…"
          autoFocus
        />
      )}

      <button
        onClick={submit}
        disabled={!input || submitted}
        className="duo-btn-green w-full disabled:opacity-50"
      >
        Check
      </button>
    </div>
  );
}
