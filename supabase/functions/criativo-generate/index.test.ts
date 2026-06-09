import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/criativo-generate`;

// 1x1 transparent PNG
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

function installEvolinkStub(opts: {
  status?: number;
  responseBody?: any;
  rawText?: string;
} = {}) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Intercept only EvoLink calls; let Supabase function invocations go through original fetch.
    if (url.startsWith("https://api.evolink.ai/")) {
      const headers = new Headers(init?.headers ?? {});
      const contentType = headers.get("content-type");
      const captured: CapturedCall = {
        url,
        method: init?.method ?? "GET",
        contentType,
        authorization: headers.get("authorization"),
      };
      if (init?.body instanceof FormData) {
        captured.formBody = init.body;
      } else if (typeof init?.body === "string") {
        try { captured.jsonBody = JSON.parse(init.body); } catch { /* ignore */ }
      }
      calls.push(captured);

      const status = opts.status ?? 200;
      const body = opts.rawText ?? JSON.stringify(opts.responseBody ?? {
        data: [{ b64_json: TINY_PNG_B64 }],
      });
      return new Response(body, {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(input as any, init);
  }) as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

async function invoke(body: Record<string, unknown>) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, json, text };
}

// ---------- /images/generations (no refs) ----------

Deno.test("generations: square + low quality → JSON, size 1:1, resolution 1K", async () => {
  installEvolinkStub();
  try {
    const r = await invoke({ prompt: "test", aspectRatio: "square", quality: "low" });
    assertEquals(r.status, 200);
    assertEquals(r.json?.model, "gpt-image-2");
    assert(typeof r.json?.imageUrl === "string" && r.json.imageUrl.startsWith("data:image/png;base64,"));
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
  } finally { restoreFetch(); }
});

Deno.test("generations: story + medium quality → size 2:3, resolution 2K", async () => {
  installEvolinkStub();
  try {
    const r = await invoke({ prompt: "test", aspectRatio: "story", quality: "medium" });
    assertEquals(r.status, 200);
    assertEquals(calls[0].jsonBody.size, "2:3");
    assertEquals(calls[0].jsonBody.resolution, "2K");
    assertEquals(calls[0].jsonBody.quality, "medium");
  } finally { restoreFetch(); }
});

Deno.test("generations: high quality → resolution 4K", async () => {
  installEvolinkStub();
  try {
    const r = await invoke({ prompt: "test", aspectRatio: "square", quality: "high" });
    assertEquals(r.status, 200);
    assertEquals(calls[0].jsonBody.resolution, "4K");
    assertEquals(calls[0].jsonBody.quality, "high");
  } finally { restoreFetch(); }
});

Deno.test("generations: handles url-only response by fetching and converting to data URL", async () => {
  const PNG_URL = "https://api.evolink.ai/fake-image.png";
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === PNG_URL) {
      const bin = atob(TINY_PNG_B64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Response(bytes, { status: 200, headers: { "Content-Type": "image/png" } });
    }
    if (url.startsWith("https://api.evolink.ai/")) {
      calls.push({ url, method: init?.method ?? "GET", contentType: null, authorization: null });
      return new Response(JSON.stringify({ data: [{ url: PNG_URL }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(input as any, init);
  }) as typeof fetch;
  try {
    const r = await invoke({ prompt: "test", aspectRatio: "square", quality: "low" });
    assertEquals(r.status, 200);
    assert(r.json?.imageUrl?.startsWith("data:image/png;base64,"));
  } finally { restoreFetch(); }
});

// ---------- /images/edits (with refs) ----------

Deno.test("edits: productImages → multipart, /images/edits, square 1:1 low", async () => {
  installEvolinkStub();
  try {
    const r = await invoke({
      prompt: "edit me",
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
  } finally { restoreFetch(); }
});

Deno.test("edits: story + high + logoImage → 2:3, 4K, 1 image attached", async () => {
  installEvolinkStub();
  try {
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
  } finally { restoreFetch(); }
});

Deno.test("edits: square + medium + storyReference is attached (square allows it)", async () => {
  installEvolinkStub();
  try {
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
  } finally { restoreFetch(); }
});

// ---------- validation & errors ----------

Deno.test("validation: missing prompt → 400", async () => {
  installEvolinkStub();
  try {
    const r = await invoke({ aspectRatio: "square" });
    assertEquals(r.status, 400);
    assertEquals(calls.length, 0);
  } finally { restoreFetch(); }
});

Deno.test("error: EvoLink 401 → 502 with chave inválida", async () => {
  installEvolinkStub({ status: 401, rawText: '{"error":"unauthorized"}' });
  try {
    const r = await invoke({ prompt: "x", aspectRatio: "square", quality: "low" });
    assertEquals(r.status, 502);
    assert(String(r.json?.error ?? "").toLowerCase().includes("chave"));
  } finally { restoreFetch(); }
});

Deno.test("error: EvoLink 429 → 502 with limite", async () => {
  installEvolinkStub({ status: 429, rawText: '{"error":"rate"}' });
  try {
    const r = await invoke({ prompt: "x", aspectRatio: "square", quality: "low" });
    assertEquals(r.status, 502);
    assert(String(r.json?.error ?? "").toLowerCase().includes("limite"));
  } finally { restoreFetch(); }
});
