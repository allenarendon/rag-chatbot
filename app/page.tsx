'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

type Source = { text?: string; page?: number; score?: number; source?: string };

type ToolInvocation = {
  state: string;
  toolName: string;
  toolCallId: string;
  result?: Source[];
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  toolInvocations?: ToolInvocation[];
  parts?: Array<{ type: string; toolInvocation?: ToolInvocation }>;
};

function collectSourceGroups(message: ChatMessage): { id: string; sources: Source[] }[] {
  const fromInvocations = (message.toolInvocations ?? []).filter(
    (inv) => inv.state === 'result' && inv.toolName === 'getInformation' && Array.isArray(inv.result),
  );
  const invocations =
    fromInvocations.length > 0
      ? fromInvocations
      : (message.parts ?? [])
          .filter((part) => part.type === 'tool-invocation' && part.toolInvocation)
          .map((part) => part.toolInvocation as ToolInvocation)
          .filter(
            (inv) =>
              inv.state === 'result' && inv.toolName === 'getInformation' && Array.isArray(inv.result),
          );
  return invocations.map((inv) => ({ id: inv.toolCallId, sources: inv.result ?? [] }));
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 border-l-4 border-l-bir-teal bg-white px-4 py-3 text-sm leading-relaxed [&_li>p]:mb-0 [&_li>p]:inline">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-bir-blue">{children}</strong>,
          h1: ({ children }) => <h2 className="mb-2 text-base font-bold text-bir-blue">{children}</h2>,
          h2: ({ children }) => <h3 className="mb-2 text-sm font-bold text-bir-blue">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-2 text-sm font-bold text-bir-navy">{children}</h4>,
          a: ({ href, children }) => (
            <a href={href} className="font-semibold text-bir-teal underline" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const greeting: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: `Hello. I'm **ChatBIR**, your BIR-tual Assistant for BIR processes and requirements.

I can help you look up:

- Registration steps, including TIN and ORUS
- Filing and payment
- Documents and requirements for BIR transactions

Ask a question in your own words. I'll answer from the taxpayer guides, and you can open **Sources** under the reply to see where it came from.`,
};

function FlagStripe() {
  return (
    <div className="flex h-3 w-full overflow-hidden" aria-hidden="true">
      <div
        className="h-full flex-1 bg-bir-gold"
        style={{ clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)' }}
      />
      <div
        className="-ml-[8%] h-full flex-1 bg-bir-navy"
        style={{ clipPath: 'polygon(18% 0, 100% 0, 82% 100%, 0 100%)' }}
      />
      <div
        className="-ml-[8%] h-full flex-1 bg-bir-red"
        style={{ clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)' }}
      />
    </div>
  );
}

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat({
    api: '/api/chat',
    initialMessages: [greeting],
  });
  const busy = status === 'streaming' || status === 'submitted';
  const savedSources = useRef<Map<number, { id: string; sources: Source[] }[]>>(new Map());
  const listRef = useRef<HTMLUListElement>(null);

  const chatMessages = messages as ChatMessage[];
  chatMessages.forEach((message, index) => {
    const groups = collectSourceGroups(message);
    if (groups.length > 0) savedSources.current.set(index, groups);
  });

  const lastMessage = chatMessages.at(-1);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [lastMessage?.content, chatMessages.length, busy]);

  return (
    <div className="flex h-screen flex-col">
      <FlagStripe />
      <header className="bg-bir-blue text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-wide text-bir-yellow">ChatBIR</h1>
            <p className="mt-1 text-base font-semibold">Your BIR-tual Assistant for BIR Processess and Requirements</p>
          </div>
          <img
            src="/chatbir-logo.jpg?v=2"
            alt="ChatBIR"
            className="h-20 w-20 shrink-0 rounded-full bg-white object-cover"
          />
        </div>
      </header>
      <div className="h-2 bg-bir-yellow" aria-hidden="true" />

      <main className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-6 py-6">
        <ul ref={listRef} className="mb-6 min-h-0 flex-1 space-y-4 overflow-y-auto">
          {chatMessages.map((m, index) => {
            const sourceGroups =
              m.role === 'assistant' ? (savedSources.current.get(index) ?? []) : [];
            return (
            <li
              key={`${m.role}-${index}`}
              className={
                m.role === 'user'
                  ? 'flex justify-end'
                  : 'flex flex-col items-start justify-start'
              }
            >
              {m.role === 'user' ? (
                <span className="inline-block max-w-[85%] rounded-2xl bg-bir-blue px-4 py-2 text-white">
                  {m.content}
                </span>
              ) : (
                m.content && <AssistantMessage content={m.content} />
              )}

              {sourceGroups.map((group) => (
                <details
                  key={group.id}
                  className="mt-2 max-w-[85%] text-sm text-slate-600"
                >
                  <summary className="inline-block cursor-pointer rounded-full bg-bir-teal px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Sources ({group.sources.length})
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {group.sources.map((src, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-bir-yellow bg-white py-2 pl-3"
                      >
                        <span className="text-xs font-semibold text-bir-blue">
                          {src.source ? `${src.source} · ` : ''}
                          page {src.page ?? '?'} · score{' '}
                          {typeof src.score === 'number' ? src.score.toFixed(2) : '—'}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap">{src.text}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </li>
            );
          })}
          {busy && !messages.at(-1)?.content && (
            <li className="text-sm font-semibold text-bir-teal">…</li>
          )}
          {error && (
            <li className="text-sm font-semibold text-bir-red">
              Error: {error.message}
            </li>
          )}
        </ul>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 focus:border-bir-teal focus:outline-none"
            placeholder="Ask about registration, filing, or payment…"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={!input || busy}
            className="rounded-full bg-bir-teal px-5 py-2 font-bold text-white disabled:opacity-40"
          >
            Send
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-slate-500">
          Responses are generated by AI. Please confirm the accuracy of each response.
        </p>
      </main>
      <FlagStripe />
    </div>
  );
}
