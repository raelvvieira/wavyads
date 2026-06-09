// In-process tests for criativo-generate edge function.
// We stub global fetch BEFORE importing index.ts so the function's EvoLink
// calls hit our stub, then call its local serve() listener on 127.0.0.1.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------- Env required by index.ts ----------
Deno.env.set("EVOLINK_API_KEY", "test-key");

// ---------- 1x1 PNG fixture ----------
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const TINY_DATA_URL = `data:image/png;base64,${TINY_PNG_B64}`;

// ---------- fetch stub ----------
type CapturedCall = {
  url: string;
  method: string;
  contentType: string | null;
  authorization: string | null;
  jsonBody?: any;
  formBody?: FormData;
};

const calls: CapturedCall[] = [];
const originalFetch = globalThis.fetch;

type StubOpts = {
  status?: number;
  responseBody?: unknown;
  rawText?: string;
  pngUrl?: string; // when set, function should fetch this URL; we return the PNG bytes
};
let currentStub: StubOpts = {};

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  // Serve the fake EvoLink-hosted PNG URL when requested
  if (currentStub.pngUrl && url === currentStub.pngUrl) {
    const bin = atob(TINY_PNG_B64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  }

  if (url.startsWith("https://api.evolink.ai/")) {
    const headers = new Headers(init?.headers ?? {});
    const captured: CapturedCall = {
      url,
      method: init?.method ?? "GET",
      contentType: headers.get("content-type"),
      authorization: headers.get("authorization"),
    };
    if (init?.body instanceof FormData) {
      captured.formBody = init.body;
    } else if (typeof init?.body === "string") {
      try { captured.jsonBody = JSON.parse(init.body); } catch { /* ignore */ }
    }
    calls.push(captured);

    const status = currentStub.status ?? 200;
    const body =
      currentStub.rawText ??
      JSON.stringify(
        currentStub.responseBody ?? { data: [{ b64_json: TINY_PNG_B64 }] },
      );
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return originalFetch(input as any, init);
}) as typeof fetch;

// ---------- Stub std `serve` so importing index.ts does NOT start a listener ----------
// We re-export a tiny shim that captures the handler.
let capturedHandler: ((req: Request) => Promise<Response> | Response) | null = null;
const serveModUrl = "https://deno.land/std@0.168.0/http/server.ts";
// Monkey-patch by pre-populating the module cache via dynamic import + override is not
// trivial, so instead we run index.ts inside a Worker-like wrapper: just call its
// `serve` by importing it and intercepting via a global. The simplest approach:
// we replace the std `serve` export with our shim using an import map at runtime.
//
// Easiest robust approach: read the source and eval it with our own `serve`.
const indexUrl = new URL("./index.ts", import.meta.url);
const src = await Deno.readTextFile(indexUrl);
const patched = src.replace(
  /import\s*\{\s*serve\s*\}\s*from\s*"https:\/\/deno\.land\/std@0\.168\.0\/http\/server\.ts";?/,
  "const serve = (h) => { globalThis.__captured_handler__ = h; };",
);
const blob = new Blob([patched], { type: "application/typescript" });
const blobUrl = URL.createObjectURL(blob);
await import(blobUrl);
capturedHandler = (globalThis as any).__captured_handler__;
if (!capturedHandler) throw new Error("Failed to capture serve handler");

function reset(opts: StubOpts = {}) {
  calls.length = 0;
  currentStub = opts;
}

async function invoke(body: Record<string, unknown>) {
  const req = new Request("http://localhost/criativo-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await capturedHandler!(req);
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, json, text };
}

// ---------- /images/generations (no refs) ----------

Deno.test("generations: square + low → JSON, size 1:1, resolution 1K", async () => {
  reset();
  const r = await invoke({ prompt: "test", aspectRatio: "square", quality: "low" });
  assertEquals(r.status, 200);
  assertEquals(r.json?.model, "gpt-image-2");
  assert(r.json?.imageUrl?.startsWith("data:image/png;base64,"));
  assertEquals(calls.length, 1);
  assert(calls[0].url.endsWith("/images/generations"));
  assertEquals(calls[0].method, "POST");
  assert(calls[0].contentType?.includes("application/json"));
  assertEquals(calls[0].jsonBody.model, "gpt-image-2");
  assertEquals(calls[0].jsonBody.size, "1:1");
  assertEquals(calls[0].jsonBody.resolution, "1K");
  assertEquals(calls[0].jsonBody.quality, "low");
  assertEquals(calls[0].jsonBody.n, 1);
  assertEquals(calls[0].jsonBody.response_format, "b64_json");
  assertEquals(calls[0].authorization, "Bearer test-key");
});

Deno.test("generations: story + medium → size 2:3, resolution 2K", async () => {
  reset();
  const r = await invoke({ prompt: "x", aspectRatio: "story", quality: "medium" });
  assertEquals(r.status, 200);
  assertEquals(calls[0].jsonBody.size, "2:3");
  assertEquals(calls[0].jsonBody.resolution, "2K");
  assertEquals(calls[0].jsonBody.quality, "medium");
});

Deno.test("generations: high → resolution 4K", async () => {
  reset();
  const r = await invoke({ prompt: "x", aspectRatio: "square", quality: "high" });
  assertEquals(r.status, 200);
  assertEquals(calls[0].jsonBody.resolution, "4K");
  assertEquals(calls[0].jsonBody.quality, "high");
});

Deno.test("generations: default quality is low when omitted", async () => {
  reset();
  const r = await invoke({ prompt: "x", aspectRatio: "square" });
  assertEquals(r.status, 200);
  assertEquals(calls[0].jsonBody.quality, "low");
  assertEquals(calls[0].jsonBody.resolution, "1K");
});

Deno.test("generations: url-only response is fetched and converted to data URL", async () => {
  const PNG_URL = "https://api.evolink.ai/fake-image.png";
  reset({
    pngUrl: PNG_URL,
    responseBody: { data: [{ url: PNG_URL }] },
  });
  const r = await invoke({ prompt: "x", aspectRatio: "square", quality: "low" });
  assertEquals(r.status, 200);
  assert(r.json?.imageUrl?.startsWith("data:image/png;base64,"));
});

// ---------- /images/edits (with refs) ----------

Deno.test("edits: productImages → multipart on /images/edits, square 1:1 low", async () => {
  reset();
  const r = await invoke({
    prompt: "edit",
    aspectRatio: "square",
    quality: "low",
    productImages: [TINY_DATA_URL, TINY_DATA_URL],
  });
  assertEquals(r.status, 200);
  assert(calls[0].url.endsWith("/images/edits"));
  assertEquals(calls[0].method, "POST");
  assert(calls[0].contentType?.startsWith("multipart/form-data"));
  const fd = calls[0].formBody!;
  assertEquals(fd.get("model"), "gpt-image-2");
  assertEquals(fd.get("size"), "1:1");
  assertEquals(fd.get("resolution"), "1K");
  assertEquals(fd.get("quality"), "low");
  assertEquals(fd.get("n"), "1");
  assertEquals(fd.getAll("image[]").length, 2);
});

Deno.test("edits: story + high + logoImage → 2:3, 4K, 1 image attached", async () => {
  reset();
  const r = await invoke({
    prompt: "edit",
    aspectRatio: "story",
    quality: "high",
    logoImage: TINY_DATA_URL,
  });
  assertEquals(r.status, 200);
  assert(calls[0].url.endsWith("/images/edits"));
  const fd = calls[0].formBody!;
  assertEquals(fd.get("size"), "2:3");
  assertEquals(fd.get("resolution"), "4K");
  assertEquals(fd.get("quality"), "high");
  assertEquals(fd.getAll("image[]").length, 1);
});

Deno.test("edits: square + medium + storyReference is attached", async () => {
  reset();
  const r = await invoke({
    prompt: "edit",
    aspectRatio: "square",
    quality: "medium",
    storyReference: TINY_DATA_URL,
  });
  assertEquals(r.status, 200);
  assert(calls[0].url.endsWith("/images/edits"));
  const fd = calls[0].formBody!;
  assertEquals(fd.get("resolution"), "2K");
  assertEquals(fd.getAll("image[]").length, 1);
});

Deno.test("edits: story does NOT attach storyReference (square-only rule)", async () => {
  reset();
  const r = await invoke({
    prompt: "edit",
    aspectRatio: "story",
    quality: "low",
    storyReference: TINY_DATA_URL,
  });
  // Only storyReference provided + story aspect → no refs attached, so route is generations
  assertEquals(r.status, 200);
  assert(calls[0].url.endsWith("/images/generations"));
});

// ---------- validation & error mapping ----------

Deno.test("validation: missing prompt → 400, no EvoLink call", async () => {
  reset();
  const r = await invoke({ aspectRatio: "square" });
  assertEquals(r.status, 400);
  assertEquals(calls.length, 0);
});

Deno.test("error: EvoLink 401 → 502 with 'Chave inválida'", async () => {
  reset({ status: 401, rawText: '{"error":"unauthorized"}' });
  const r = await invoke({ prompt: "x", aspectRatio: "square", quality: "low" });
  assertEquals(r.status, 502);
  assert(String(r.json?.error ?? "").toLowerCase().includes("chave"));
});

Deno.test("error: EvoLink 429 → 502 with 'limite'", async () => {
  reset({ status: 429, rawText: '{"error":"rate"}' });
  const r = await invoke({ prompt: "x", aspectRatio: "square", quality: "low" });
  assertEquals(r.status, 502);
  assert(String(r.json?.error ?? "").toLowerCase().includes("limite"));
});

Deno.test("error: EvoLink 200 but no image → 500", async () => {
  reset({ responseBody: { data: [{}] } });
  const r = await invoke({ prompt: "x", aspectRatio: "square", quality: "low" });
  assertEquals(r.status, 500);
  assert(String(r.json?.error ?? "").includes("não retornou imagem"));
});

Deno.test("OPTIONS request → CORS preflight", async () => {
  reset();
  const req = new Request("http://localhost/criativo-generate", { method: "OPTIONS" });
  const res = await capturedHandler!(req);
  await res.text();
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin") === "*");
});
