import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type QuestionType =
  | "MCQ"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "DRAG_DROP"
  | "MATCH"
  | "MEMORY"
  | "DROPDOWN";

export interface GeneratedQuestion {
  type: QuestionType;
  prompt: {
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    videoUrl?: string;
  };
  answers: Array<{
    id: string;
    text: string;
    imageUrl?: string;
    audioUrl?: string;
  }>;
  correctAnswer: string | string[] | Record<string, string>;
  explanation?: string;
}

const QUESTION_TYPES: QuestionType[] = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "DRAG_DROP",
  "MATCH",
  "MEMORY",
  "DROPDOWN",
];

export async function generateQuiz(
  lessonContent: string,
  lessonTitle: string,
  count: number = 10
): Promise<GeneratedQuestion[]> {
  const typeList = QUESTION_TYPES.join(", ");

  const prompt = `You are an expert educational quiz designer. Based on the following lesson content, generate ${count} quiz questions.

LESSON TITLE: ${lessonTitle}

LESSON CONTENT:
${lessonContent.slice(0, 6000)}

Generate exactly ${count} questions with a good variety of types from: ${typeList}.

Rules per type:
- MCQ: 4 answer options (a,b,c,d), correctAnswer is the id of correct option
- TRUE_FALSE: answers are [{id:"true",text:"True"},{id:"false",text:"False"}], correctAnswer is "true" or "false"
- FILL_BLANK: prompt text has "___" placeholder, answers is word bank array, correctAnswer is the correct word/phrase
- DRAG_DROP: provide 4-6 items that need to be sorted in the correct order, correctAnswer is array of ids in correct order
- MATCH: provide left[] and right[] arrays (each 3-4 items), answers = [...left, ...right], correctAnswer is object mapping left id to right id
- MEMORY: provide 4-6 pairs of cards, answers = all cards (each pair shares a pairId), correctAnswer = array of pairId strings
- DROPDOWN: prompt text has "___" placeholder (inline dropdown), answers array of options, correctAnswer is correct option id

Return ONLY valid JSON array, no markdown, no explanation:
[
  {
    "type": "MCQ",
    "prompt": { "text": "Question text here?" },
    "answers": [
      { "id": "a", "text": "Option A" },
      { "id": "b", "text": "Option B" },
      { "id": "c", "text": "Option C" },
      { "id": "d", "text": "Option D" }
    ],
    "correctAnswer": "b",
    "explanation": "Brief explanation why B is correct"
  },
  ...
]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON array");

  const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0]);
  return questions;
}

export interface FlashcardData {
  front: string; // question / term
  back: string;  // answer / definition
}

export interface PageSummary {
  pageNumber: number;
  bullets: string[]; // detailed bullets for this single page
}

export interface LessonSummaryResult {
  pageSummaries: PageSummary[]; // one summary per page
  flashcards: FlashcardData[];
}

export async function generateLessonSummaryAndFlashcards(
  pagesText: string[],
  docTitle: string,
  pageNumbers: number[]
): Promise<LessonSummaryResult> {
  // Cap each page at 1500 chars so we stay within context limits for many pages
  const pageSections = pagesText.map((text, i) =>
    `--- PAGE ${pageNumbers[i]} ---\n${text.slice(0, 1500)}`
  ).join("\n\n");

  const prompt = `You are an expert educator and note-taker. You have been given ${pagesText.length} pages from a document titled "${docTitle}".

${pageSections}

Your tasks:
1. For EACH page individually, write a detailed bullet-point summary. Cover every key concept, definition, fact, process, formula, and important detail on that page. Each bullet must be a complete, informative sentence. Aim for 6-12 bullets per page.
2. Generate 10-15 flashcards covering the most important concepts across ALL pages. Each flashcard has a FRONT (specific question or term) and a BACK (thorough answer — 1-2 sentences).

Return ONLY valid JSON, no markdown, no code block:
{
  "pageSummaries": [
    {
      "pageNumber": ${pageNumbers[0]},
      "bullets": [
        "Complete informative sentence covering a key concept from this page"
      ]
    }
  ],
  "flashcards": [
    { "front": "What is X?", "back": "X is ... [full explanation]" }
  ]
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract the outermost JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[ai] raw response:", text.slice(0, 500));
    throw new Error("AI did not return valid JSON. Check server logs.");
  }

  let raw: LessonSummaryResult;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[ai] JSON parse error:", e, "\nRaw:", jsonMatch[0].slice(0, 500));
    throw new Error("AI returned malformed JSON. Try again.");
  }

  // Back-compat: if AI returned old single bulletSummary, convert it
  const rawAny = raw as unknown as Record<string, unknown>;
  if (!raw.pageSummaries && rawAny.bulletSummary) {
    raw.pageSummaries = [{
      pageNumber: pageNumbers[0] ?? 1,
      bullets: rawAny.bulletSummary as string[],
    }];
  }

  // Ensure every requested page has a summary entry (fill gaps if AI skipped any)
  const summaryMap = new Map(raw.pageSummaries.map((ps) => [ps.pageNumber, ps]));
  raw.pageSummaries = pageNumbers.map((n) => summaryMap.get(n) ?? { pageNumber: n, bullets: [] });

  return raw;
}

export interface TranscriptLessonResult {
  bullets: string[];
  flashcards: FlashcardData[];
}

export async function generateTranscriptLesson(
  transcript: string,
  videoTitle: string
): Promise<TranscriptLessonResult> {
  const capped = transcript.slice(0, 3000);

  const prompt = `You are an expert educator. You have been given a video transcript titled "${videoTitle}".

TRANSCRIPT:
${capped}

Your tasks:
1. Write 6-10 bullet-point summary notes. Each bullet must be a complete, informative sentence covering a key concept, tip, or insight.
2. Generate 6-10 flashcards covering the most important concepts. Each flashcard has a FRONT (specific question or term) and BACK (thorough answer — 1-2 sentences).

Return ONLY valid JSON, no markdown, no code block:
{
  "bullets": ["Complete informative sentence..."],
  "flashcards": [
    { "front": "What is X?", "back": "X is ... [full explanation]" }
  ]
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[ai] generateTranscriptLesson raw:", text.slice(0, 300));
    throw new Error("AI did not return valid JSON");
  }

  return JSON.parse(jsonMatch[0]) as TranscriptLessonResult;
}
