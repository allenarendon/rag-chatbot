/**
 * Final Route Handler — Step 4 of Section 4 (RAG-as-tool-call) +
 * the source metadata used by Step 5's UI.
 *
 * The model decides whether to call the getInformation tool. When it does,
 * the tool runs vector search and returns chunk text + page + score. The
 * client renders those as collapsible sources under the assistant message.
 */
import { openai } from '@ai-sdk/openai';
import { streamText, tool, embed } from 'ai';
import { Index } from '@upstash/vector';
import { z } from 'zod';
import { catalogPrompt, sourceEntry } from '@/lib/sources';

const index = new Index();

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system:
      'You are ChatBIR, a helpful, friendly, and witty assistant for Philippine BIR taxpayer services. ' +
      'Use the getInformation tool whenever the user asks a question whose ' +
      'answer might be in the indexed documents. If those documents do not ' +
      'cover something, say so directly rather than guessing. ' +
      'Do not answer questions that are not about BIR taxpayer services, and encourage the user to ask a question that is about BIR services. ' +
      'Write answers in Markdown that is easy to scan: short paragraphs, ' +
      'and a bullet or numbered list when you list documents, steps, or requirements. ' +
      'Put each list item on its own line. ' +
      'These are the indexed documents. Use them to decide where an answer should come from, then call getInformation:\n' +
      catalogPrompt() +
      '\nWhen you answer, name the document title returned by the tool.',
    messages,
    tools: {
      getInformation: tool({
        description:
          'Look up information from the indexed BIR taxpayer documents. Use this whenever the user asks a substantive question about BIR services, processes, or related requirements.',
        parameters: z.object({
          query: z
            .string()
            .describe('the topic, term, or sub-question to search for'),
        }),
        execute: async ({ query }) => {
          const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: query,
          });
          const hits = await index.query({
            vector: embedding,
            topK: 4,
            includeMetadata: true,
          });
          return hits.map((h) => {
            const filename = (h.metadata?.source as string) ?? '';
            const entry = filename ? sourceEntry(filename) : undefined;
            return {
              text: (h.metadata?.text as string) ?? '',
              page: (h.metadata?.page as number) ?? null,
              source: filename || null,
              title: entry?.title ?? ((h.metadata?.title as string) ?? null),
              topics: entry?.topics.join(', ') ?? ((h.metadata?.topics as string) ?? null),
              score: h.score,
            };
          });
        },
      }),
    },
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
}
