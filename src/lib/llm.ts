/**
 * Server-side LLM ranking for Explore search (spec §9). Takes the user's query
 * plus candidate rows from search_corpus, asks the model to return the relevant
 * post ids ranked by relevance, and reports token usage so the per-session
 * budget can be enforced.
 *
 * Provider via LLM_PROVIDER (gemini default, anthropic supported). NEVER called
 * from the browser. If no API key is configured (or the call fails), falls back
 * to a deterministic keyword ranking so the demo still works — with an estimated
 * token count so the budget mechanic remains observable.
 */
import "server-only";
import { config } from "./config";
import type { CorpusRow } from "./repo";

export type RankResult = {
  postIds: string[];
  tokensUsed: number;
  provider: "gemini" | "anthropic" | "local";
  model: string;
  fallback: boolean;
  logs: string[];
};

const MAX_RESULTS = 8;

/** Tiny step logger — each line is prefixed with elapsed ms. NEVER log secrets. */
type Log = (msg: string) => void;
function makeLog(): { lines: string[]; add: Log } {
  const t0 = Date.now();
  const lines: string[] = [];
  return { lines, add: (m) => lines.push(`+${String(Date.now() - t0).padStart(4)}ms  ${m}`) };
}

function buildPrompt(query: string, candidates: CorpusRow[]): string {
  const list = candidates
    .map((c) => `- id=${c.post_id} | @${c.user_tag.replace(/^@/, "")} | ${c.search_text.replace(/\s+/g, " ").slice(0, 240)}`)
    .join("\n");
  return [
    `You rank StudyCircle posts by relevance to a student's search query.`,
    `Query: "${query}"`,
    ``,
    `Candidate posts:`,
    list,
    ``,
    `Return ONLY a JSON object: {"ids": ["<post_id>", ...]} listing the post ids`,
    `most relevant to the query, most relevant first, at most ${MAX_RESULTS}. Omit irrelevant posts.`,
    `Use only ids from the list. No prose, no markdown.`,
  ].join("\n");
}

/** Crude token estimate (~4 chars/token) for the fallback path. */
function estimateTokens(...parts: string[]): number {
  return Math.ceil(parts.join("").length / 4);
}

function parseIds(text: string, valid: Set<string>): string[] {
  let ids: unknown;
  try {
    ids = JSON.parse(text).ids;
  } catch {
    // Be forgiving: pull the first {...} or [...] out of the text.
    const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!m) return [];
    try {
      const parsed = JSON.parse(m[0]);
      ids = Array.isArray(parsed) ? parsed : parsed.ids;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string" && valid.has(id)).slice(0, MAX_RESULTS);
}

/** Deterministic keyword ranking — the no-key / failure fallback. */
function keywordRank(query: string, candidates: CorpusRow[]): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  return candidates
    .map((c) => {
      const hay = `${c.search_text} ${c.subject ?? ""} ${c.user_tag}`.toLowerCase();
      const score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
      return { id: c.post_id, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((r) => r.id);
}

async function callGemini(prompt: string, log: Log = () => {}): Promise<{ text: string; tokens: number }> {
  // Redacted in the log — the real URL carries ?key=… which must never surface.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;
  log(`POST gemini · model=${config.geminiModel} · prompt ${prompt.length} chars`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 512, responseMimeType: "application/json" },
    }),
  });
  log(`gemini HTTP ${res.status}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (body) log(`gemini error body: ${body.replace(/\s+/g, " ").slice(0, 240)}`);
    throw new Error(`gemini ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  const u = data?.usageMetadata ?? {};
  const tokens = (u.promptTokenCount ?? 0) + (u.candidatesTokenCount ?? 0);
  log(`gemini ok · ${text.length} chars · tokens=${tokens}`);
  return { text, tokens };
}

async function callAnthropic(prompt: string, log: Log = () => {}): Promise<{ text: string; tokens: number }> {
  log(`POST anthropic · model=${config.anthropicModel} · prompt ${prompt.length} chars`);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  log(`anthropic HTTP ${res.status}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (body) log(`anthropic error body: ${body.replace(/\s+/g, " ").slice(0, 240)}`);
    throw new Error(`anthropic ${res.status}`);
  }
  const data = await res.json();
  const text = (data?.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const u = data?.usageMetadata ?? data?.usage ?? {};
  const tokens = (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
  log(`anthropic ok · ${text.length} chars · tokens=${tokens}`);
  return { text, tokens };
}

// ── Trending topic summaries (the Explore "Trending now" card) ────────────────

export type Topic = { title: string; summary: string; postIds: string[] };

export type TopicsResult = {
  topics: Topic[];
  provider: "gemini" | "anthropic" | "local";
  model: string;
  fallback: boolean; // true = demo stand-in topics (no key / call failed)
  tokensUsed: number;
  logs: string[];
};

const MAX_TOPICS = 5;

function buildTopicsPrompt(candidates: CorpusRow[]): string {
  const list = candidates
    .map((c) => `- id=${c.post_id} | ${c.subject ? `[${c.subject}] ` : ""}${c.search_text.replace(/\s+/g, " ").slice(0, 200)}`)
    .join("\n");
  return [
    `You curate "Trending now" for a Bangla edtech study feed (classes 6–12).`,
    `Cluster these posts into up to ${MAX_TOPICS} distinct trending TOPICS, each grouping posts that share a subject/theme.`,
    ``,
    `Posts:`,
    list,
    ``,
    `Return ONLY JSON: {"topics":[{"title":"<short topic, ≤4 words>","summary":"<one sentence on what students are discussing>","ids":["<post_id>",...]}]}`,
    `Each topic must list 1+ ids drawn ONLY from the posts above; no post in two topics; at most ${MAX_TOPICS} topics. No prose, no markdown.`,
  ].join("\n");
}

function parseTopics(text: string, valid: Set<string>): Topic[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text).topics;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return [];
    try {
      raw = JSON.parse(m[0]).topics;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const topics: Topic[] = [];
  for (const t of raw as Array<Record<string, unknown>>) {
    const title = typeof t.title === "string" ? t.title.trim() : "";
    const summary = typeof t.summary === "string" ? t.summary.trim() : "";
    const ids = Array.isArray(t.ids)
      ? (t.ids as unknown[]).filter((id): id is string => typeof id === "string" && valid.has(id) && !seen.has(id))
      : [];
    ids.forEach((id) => seen.add(id));
    if (title && ids.length) topics.push({ title, summary, postIds: ids });
    if (topics.length >= MAX_TOPICS) break;
  }
  return topics;
}

/**
 * Deterministic stand-in topics — used when no API key is set or the call fails.
 * Groups candidates by subject so each topic still maps to real posts the user
 * can open. Title = subject (or "Topic N"); summary is generic.
 */
function fallbackTopics(candidates: CorpusRow[]): Topic[] {
  const bySubject = new Map<string, string[]>();
  for (const c of candidates) {
    const key = (c.subject ?? "").trim() || "StudyCircle";
    const arr = bySubject.get(key) ?? [];
    if (arr.length < 6) arr.push(c.post_id);
    bySubject.set(key, arr);
  }
  return [...bySubject.entries()]
    .slice(0, MAX_TOPICS)
    .map(([subject, postIds]) => ({
      title: subject,
      summary: `What students are posting about ${subject} right now.`,
      postIds,
    }));
}

export async function summarizeTopics(candidates: CorpusRow[]): Promise<TopicsResult> {
  const log = makeLog();
  const valid = new Set(candidates.map((c) => c.post_id));
  const provider = config.llmProvider;
  const key = provider === "anthropic" ? config.anthropicApiKey : config.geminiApiKey;
  log.add(`summarizeTopics · provider=${provider} · key=${key ? "present" : "MISSING"} · candidates=${candidates.length}`);

  if (key && candidates.length) {
    const prompt = buildTopicsPrompt(candidates);
    try {
      const { text, tokens } = provider === "anthropic" ? await callAnthropic(prompt, log.add) : await callGemini(prompt, log.add);
      log.add(`raw output: ${text.replace(/\s+/g, " ").slice(0, 300)}`);
      const topics = parseTopics(text, valid);
      log.add(`parsed ${topics.length} topic(s) from model output`);
      if (topics.length)
        return {
          topics,
          provider,
          model: provider === "anthropic" ? config.anthropicModel : config.geminiModel,
          fallback: false,
          tokensUsed: tokens || estimateTokens(prompt, text),
          logs: log.lines,
        };
      log.add(`no usable topics parsed → demo topics`);
    } catch (e) {
      log.add(`LLM call failed: ${e instanceof Error ? e.message : String(e)} → demo topics`);
    }
  } else {
    log.add(`${key ? "no candidates" : "no API key"} → demo topics`);
  }

  const topics = fallbackTopics(candidates);
  log.add(`demo topics by subject → ${topics.length} topic(s)`);
  return { topics, provider: "local", model: "demo", fallback: true, tokensUsed: 0, logs: log.lines };
}

export async function rankSearch(query: string, candidates: CorpusRow[]): Promise<RankResult> {
  const log = makeLog();
  const valid = new Set(candidates.map((c) => c.post_id));
  const prompt = buildPrompt(query, candidates);
  const provider = config.llmProvider;
  const key = provider === "anthropic" ? config.anthropicApiKey : config.geminiApiKey;
  log.add(`rankSearch · provider=${provider} · key=${key ? "present" : "MISSING"} · candidates=${candidates.length}`);

  if (key) {
    try {
      const { text, tokens } = provider === "anthropic" ? await callAnthropic(prompt, log.add) : await callGemini(prompt, log.add);
      const ids = parseIds(text, valid);
      log.add(`parsed ${ids.length} valid id(s)${ids.length ? "" : " → keyword fallback"}`);
      return {
        postIds: ids.length ? ids : keywordRank(query, candidates),
        tokensUsed: tokens || estimateTokens(prompt, text),
        provider,
        model: provider === "anthropic" ? config.anthropicModel : config.geminiModel,
        fallback: ids.length === 0,
        logs: log.lines,
      };
    } catch (e) {
      log.add(`LLM call failed: ${e instanceof Error ? e.message : String(e)} → keyword fallback`);
    }
  } else {
    log.add(`no API key → keyword fallback`);
  }

  const ids = keywordRank(query, candidates);
  log.add(`keyword ranking → ${ids.length} id(s)`);
  return {
    postIds: ids,
    tokensUsed: estimateTokens(prompt) + estimateTokens(ids.join(",")),
    provider: "local",
    model: "keyword",
    fallback: true,
    logs: log.lines,
  };
}
