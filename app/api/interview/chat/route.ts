import Anthropic from "@anthropic-ai/sdk";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messages, systemPrompt } = await req.json();

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
