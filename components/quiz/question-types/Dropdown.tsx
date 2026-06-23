"use client";
import { useState } from "react";

interface Answer { id: string; text: string }
interface Question {
  prompt: { text: string };
  answers: Answer[];
  correctAnswer: string;
}

export default function Dropdown({ question, onAnswer }: { question: Question; onAnswer: (a: unknown, correct: boolean) => void }) {
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const parts = question.prompt.text.split("___");

  function submit() {
    if (!selected || submitted) return;
    setSubmitted(true);
    setTimeout(() => onAnswer(selected, selected === question.correctAnswer), 600);
  }

  return (
    <div className="space-y-5">
      <div className="duo-card p-6 text-center">
        <p className="text-xl font-black text-gray-800 leading-loose">
          {parts[0]}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={submitted}
            className={`inline-block mx-2 border-2 rounded-lg px-3 py-1 font-bold cursor-pointer focus:outline-none transition ${
              !submitted
                ? "border-[#1CB0F6] bg-[#e8f9ff] text-[#1CB0F6]"
                : selected === question.correctAnswer
                ? "border-[#58CC02] bg-[#d7ffb8] text-[#46A302]"
                : "border-[#FF4B4B] bg-[#ffdfe0] text-[#FF4B4B]"
            }`}
          >
            <option value="">Choose…</option>
            {question.answers.map((ans) => (
              <option key={ans.id} value={ans.id}>
                {ans.text}
              </option>
            ))}
          </select>
          {parts[1]}
        </p>
      </div>
      <button
        onClick={submit}
        disabled={!selected || submitted}
        className="duo-btn-green w-full disabled:opacity-50"
      >
        Check
      </button>
    </div>
  );
}
