"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Status = "init" | "idle" | "listening" | "processing" | "speaking" | "finished";
type Mode = "interview" | "exam";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  systemPrompt: string;
  mode: Mode;
  courseName: string;
  courseId: string;
}

export default function InterviewSession({ systemPrompt, mode, courseName, courseId }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>("init");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [voices, setVoices] = useState<any[]>([]);
  const [exchangeCount, setExchangeCount] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>("init");

  const maxExchanges = mode === "interview" ? 8 : 10;

  // Sync status to ref so callbacks always see fresh value
  useEffect(() => { statusRef.current = status; }, [status]);

  // Load TTS voices
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      if (v.length) setVoices(v);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Auto-scroll conversation
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveTranscript]);

  // Pick the best available English voice
  function getBestVoice(): SpeechSynthesisVoice | null {
    const priority = [
      "Microsoft Aria", "Microsoft Jenny", "Microsoft Guy",
      "Microsoft Zira", "Microsoft David",
      "Google US English", "Alex",
    ];
    for (const name of priority) {
      const v = voices.find((v) => v.name.includes(name));
      if (v) return v;
    }
    return voices.find((v) => v.lang.startsWith("en")) ?? null;
  }

  const speak = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    // Clean text for TTS — remove markdown-style symbols
    const clean = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/[_#]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onend = () => {
      setStatus("idle");
      onEnd?.();
    };
    utterance.onerror = () => setStatus("idle");
    setStatus("speaking");
    window.speechSynthesis.speak(utterance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices]);

  const sendMessage = useCallback(async (userText: string, isInitial = false) => {
    const newMessages: Message[] = isInitial
      ? [{ role: "user", content: userText }]
      : [...messages, { role: "user", content: userText }];

    if (!isInitial) setMessages(newMessages);
    setStatus("processing");
    setLiveTranscript("");

    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, systemPrompt }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const assistantMessage: Message = { role: "assistant", content: fullText };
      setMessages((prev) => (isInitial ? [assistantMessage] : [...prev, assistantMessage]));
      setExchangeCount((c) => c + 1);
      speak(fullText);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }, [messages, systemPrompt, speak]);

  // Kick off the first AI question on mount
  useEffect(() => {
    const trigger = mode === "interview"
      ? "Please begin the interview with a warm greeting and your first question."
      : "Please begin the exam. Greet me briefly and ask your first question.";
    sendMessage(trigger, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startListening() {
    if (status !== "idle") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError("Your browser doesn't support voice input. Please use Chrome or Edge.");
      return;
    }

    transcriptRef.current = "";
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const t = Array.from(event.results as unknown[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join("");
      setLiveTranscript(t);
      transcriptRef.current = t;
    };

    recognition.onend = () => {
      if (statusRef.current === "listening") {
        const text = transcriptRef.current.trim();
        if (text) {
          setMessages((prev) => [...prev, { role: "user", content: text }]);
          sendMessage(text);
        } else {
          setStatus("idle");
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") setStatus("idle");
    };

    recognition.start();
    setStatus("listening");
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  async function endInterview() {
    window.speechSynthesis.cancel();
    recognitionRef.current?.abort();

    if (messages.length === 0) {
      router.push(`/learn/${courseId}`);
      return;
    }

    setStatus("processing");
    const farewell = mode === "interview"
      ? "The user has decided to end the interview now. Please give a brief, encouraging overall feedback summary in 3-4 sentences. Mention 1-2 strengths and 1 area to improve."
      : "The user has ended the exam. Please give their final score out of 10 and a brief summary of how they did, mentioning strong and weak areas.";

    const newMessages: Message[] = [...messages, { role: "user", content: farewell }];
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, systemPrompt }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
      setStatus("finished");
      speak(fullText);
    } catch {
      setStatus("finished");
    }
  }

  const isJobInterview = mode === "interview";
  const modeLabel = isJobInterview ? "💼 Job Interview" : "📜 Certification Exam";
  const modeColor = isJobInterview ? "#58CC02" : "#1CB0F6";

  const statusLabel = {
    init: "Starting session…",
    idle: "Tap the mic to speak",
    listening: "Listening… speak now",
    processing: "Thinking…",
    speaking: "AI is speaking…",
    finished: "Session complete",
  }[status];

  return (
    <div className="h-[100dvh] bg-gray-950 flex flex-col text-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black" style={{ color: modeColor }}>{modeLabel}</span>
            <span className="text-gray-500 text-xs">·</span>
            <span className="text-gray-400 text-xs font-semibold truncate max-w-[180px]">{courseName}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {exchangeCount}/{maxExchanges} exchanges
          </div>
        </div>
        <button
          onClick={endInterview}
          className="text-xs font-black px-3 py-1.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
        >
          End {isJobInterview ? "Interview" : "Exam"}
        </button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && status === "init" && (
          <div className="flex justify-center items-center h-full">
            <div className="text-center space-y-3">
              <div className="text-5xl animate-pulse">🎤</div>
              <p className="text-gray-400 font-semibold">Preparing your session…</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                style={{ backgroundColor: modeColor + "33", color: modeColor }}
              >
                🤖
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-white/10 text-white rounded-tr-sm"
                  : "bg-gray-800 text-gray-100 rounded-tl-sm"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                👤
              </div>
            )}
          </div>
        ))}

        {/* Live transcript while listening */}
        {liveTranscript && status === "listening" && (
          <div className="flex gap-3 justify-end">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-white/5 text-gray-300 text-sm italic border border-white/10">
              {liveTranscript}…
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
              👤
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {status === "processing" && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: modeColor + "33", color: modeColor }}>
              🤖
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 px-4 py-2 bg-red-900/40 border border-red-500/30 rounded-xl text-red-300 text-xs font-semibold text-center flex-shrink-0">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex-shrink-0 px-4 py-6 bg-gray-900 border-t border-white/10 flex flex-col items-center gap-4">
        {/* Status label */}
        <p className={`text-xs font-bold tracking-wide uppercase ${
          status === "listening" ? "text-red-400" :
          status === "speaking" ? "text-blue-400" :
          status === "processing" ? "text-yellow-400" :
          "text-gray-500"
        }`}>
          {statusLabel}
        </p>

        {/* Mic button */}
        {status !== "finished" && (
          <div className="relative">
            {/* Pulse rings when listening */}
            {status === "listening" && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <span className="absolute inset-[-8px] rounded-full bg-red-500/10 animate-ping" style={{ animationDelay: "0.3s" }} />
              </>
            )}
            {/* Pulse ring when AI speaking */}
            {status === "speaking" && (
              <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            )}

            <button
              onMouseDown={status === "idle" ? startListening : undefined}
              onMouseUp={status === "listening" ? stopListening : undefined}
              onTouchStart={status === "idle" ? startListening : undefined}
              onTouchEnd={status === "listening" ? stopListening : undefined}
              onClick={status === "speaking" ? () => window.speechSynthesis.cancel() : undefined}
              disabled={status === "init" || status === "processing"}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-200 disabled:opacity-30 shadow-2xl
                ${status === "listening"
                  ? "bg-red-500 scale-110"
                  : status === "speaking"
                  ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  : status === "idle"
                  ? "bg-white/10 hover:bg-white/20 hover:scale-105 cursor-pointer border-2 border-white/20"
                  : "bg-white/5 cursor-not-allowed"
                }`}
            >
              {status === "listening" ? "⏹" : status === "speaking" ? "🔊" : "🎤"}
            </button>
          </div>
        )}

        {status === "finished" && (
          <button
            onClick={() => router.push(`/learn/${courseId}`)}
            className="px-6 py-3 rounded-2xl font-black text-sm"
            style={{ backgroundColor: modeColor }}
          >
            Back to Course →
          </button>
        )}

        <p className="text-gray-600 text-[10px] text-center">
          {status === "idle" && "Hold mic to speak · Release to send"}
          {status === "speaking" && "Tap 🔊 to skip ahead"}
        </p>
      </div>
    </div>
  );
}
