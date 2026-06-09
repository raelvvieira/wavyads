// In-process tests for criativo-generate edge function.
// We stub global fetch BEFORE importing index.ts so the function's EvoLink
// calls hit our stub, then call its local serve() listener on 127.0.0.1.

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("EVOLINK_API_KEY", "test-key");

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const TINY_DATA_URL = `data:image/png;base64,${TINY_PNG_B64}`;
const PNG_URL = "https://api.evolink.ai/fake-image.png";
const FILE_URL = "https://files.evolink.ai/ref.png";

type CapturedCall = {
  url: string;
  method: string;
  contentType: string | null;
  authorization: string | null;
  jsonBody?: any;
};

type StubOpts = {
  createStatus?: number;
  createRawText?: string;
  createResponseBody?: unknown;
  taskStatus?: number;
  taskRawText?: string;
  taskResponseBody?: unknown;
  uploadStatus?: number;
  uploadRawText?: string;
  uploadResponseBody?: unknown;
  pngUrl?: string;
};

const calls: CapturedCall[] = [];
const originalFetch = globalThis.fetch;
let currentStub: StubOpts = {};

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if ((currentStub.pngUrl ?? PNG_URL) === url) {
    const bin = atob(TINY_PNG_B64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  }

  const headers = new Headers(init?.headers ?? {});

  if (url.startsWith("https://files-api.evolink.ai/")) {
    calls.push({
      url,
      method: init?.method ?? "GET",
      contentType: headers.get("content-type"),
      authorization: headers.get("authorization"),
      jsonBody:
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return new Response(
      currentStub.uploadRawText ??
        JSON.stringify(
          currentStub.uploadResponseBody ?? {
            success: true,
            data: { file_url: FILE_URL },
          },
        ),
      {
        status: currentStub.uploadStatus ?? 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (url.startsWith("https://api.evolink.ai/")) {
    calls.push({
      url,
      method: init?.method ?? "GET",
      contentType: headers.get("content-type"),
      authorization: headers.get("authorization"),
      jsonBody:
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });

    if (url.includes("/tasks/")) {
      return new Response(
        currentStub.taskRawText ??
          JSON.stringify(
            currentStub.taskResponseBody ?? {
              status: "completed",
              results: [currentStub.pngUrl ?? PNG_URL],
            },
          ),
        {
          status: currentStub.taskStatus ?? 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      currentStub.createRawText ??
        JSON.stringify(
          currentStub.createResponseBody ?? {
            id: "task-123",
            status: "pending",
            model: "gpt-image-2",
          },
        ),
      {
        status: currentStub.createStatus ?? 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return originalFetch(input as any, init);
}) as typeof fetch;

let capturedHandler: ((req: Request) => Promise<Response> | Response) | null =
  null;
const indexUrl = new URL("./index.ts", import.meta.url);
const src = await Deno.readTextFile(indexUrl);
const patched = src
  .replace(
    /import\s*\{\s*serve\s*\}\s*from\s*"https:\/\/deno\.land\/std@0\.168\.0\/http\/server\.ts";?/,
    "const serve = (h) => { globalThis.__captured_handler__ = h; };",
  )
  .replaceAll(
    "await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));",
    "await Promise.resolve();",
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
  try {
    json = JSON.parse(text);
  } catch {
    /* keep raw */
  }
  return { status: res.status, json, text };
}

Deno.test(
  "generations: square + low → create task and resolve image, size 1:1, resolution 1K",
  async () => {
    reset();
    const r = await invoke({
      prompt: "test",
      aspectRatio: "square",
      quality: "low",
    });
    assertEquals(r.status, 200);
    assertEquals(r.json?.model, "gpt-image-2");
    assert(r.json?.imageUrl?.startsWith("data:image/png;base64,"));
    assertEquals(calls.length, 3);
    assert(calls[0].url.endsWith("/images/generations"));
    assertEquals(calls[0].jsonBody.model, "gpt-image-2");
    assertEquals(calls[0].jsonBody.size, "1:1");
    assertEquals(calls[0].jsonBody.resolution, "1K");
    assertEquals(calls[0].jsonBody.quality, "low");
    assertEquals(calls[1].url, "https://api.evolink.ai/v1/tasks/task-123");
    assertEquals(calls[2].url, PNG_URL);
  },
);

Deno.test("generations: story + medium → size 2:3, resolution 2K", async () => {
  reset();
  const r = await invoke({
    prompt: "x",
    aspectRatio: "story",
    quality: "medium",
  });
  assertEquals(r.status, 200);
  assertEquals(calls[0].jsonBody.size, "2:3");
  assertEquals(calls[0].jsonBody.resolution, "2K");
  assertEquals(calls[0].jsonBody.quality, "medium");
});

Deno.test("generations: high → resolution 4K", async () => {
  reset();
  const r = await invoke({
    prompt: "x",
    aspectRatio: "square",
    quality: "high",
  });
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

Deno.test(
  "generations: immediate URL response is fetched and converted to data URL",
  async () => {
    reset({ createResponseBody: { data: [{ url: PNG_URL }] } });
    const r = await invoke({
      prompt: "x",
      aspectRatio: "square",
      quality: "low",
    });
    assertEquals(r.status, 200);
    assert(r.json?.imageUrl?.startsWith("data:image/png;base64,"));
    assertEquals(calls.length, 2);
    assertEquals(calls[1].url, PNG_URL);
  },
);

Deno.test(
  "edits: productImages upload refs and call generations with image_urls",
  async () => {
    reset();
    const r = await invoke({
      prompt: "edit",
      aspectRatio: "square",
      quality: "low",
      productImages: [TINY_DATA_URL, TINY_DATA_URL],
    });
    assertEquals(r.status, 200);
    assert(calls[0].url.endsWith("/files/upload/base64"));
    assert(calls[1].url.endsWith("/files/upload/base64"));
    assert(calls[2].url.endsWith("/images/generations"));
    assertEquals(calls[2].jsonBody.image_urls.length, 2);
    assertEquals(calls[2].jsonBody.size, "1:1");
    assertEquals(calls[2].jsonBody.resolution, "1K");
  },
);

Deno.test(
  "edits: story + high + logoImage → 2:3, 4K, 1 uploaded ref",
  async () => {
    reset();
    const r = await invoke({
      prompt: "edit",
      aspectRatio: "story",
      quality: "high",
      logoImage: TINY_DATA_URL,
    });
    assertEquals(r.status, 200);
    assert(calls[0].url.endsWith("/files/upload/base64"));
    assertEquals(calls[1].jsonBody.size, "2:3");
    assertEquals(calls[1].jsonBody.resolution, "4K");
    assertEquals(calls[1].jsonBody.image_urls.length, 1);
  },
);

Deno.test("edits: square + medium + storyReference is uploaded", async () => {
  reset();
  const r = await invoke({
    prompt: "edit",
    aspectRatio: "square",
    quality: "medium",
    storyReference: TINY_DATA_URL,
  });
  assertEquals(r.status, 200);
  assert(calls[0].url.endsWith("/files/upload/base64"));
  assertEquals(calls[1].jsonBody.resolution, "2K");
  assertEquals(calls[1].jsonBody.image_urls.length, 1);
});

Deno.test(
  "edits: story does NOT upload storyReference (square-only rule)",
  async () => {
    reset();
    const r = await invoke({
      prompt: "edit",
      aspectRatio: "story",
      quality: "low",
      storyReference: TINY_DATA_URL,
    });
    assertEquals(r.status, 200);
    assert(calls[0].url.endsWith("/images/generations"));
    assertEquals(calls[0].jsonBody.image_urls, undefined);
  },
);

Deno.test("validation: missing prompt → 400, no EvoLink call", async () => {
  reset();
  const r = await invoke({ aspectRatio: "square" });
  assertEquals(r.status, 400);
  assertEquals(calls.length, 0);
});

Deno.test(
  "error: EvoLink 401 on create → 502 with 'Chave inválida'",
  async () => {
    reset({ createStatus: 401, createRawText: '{"error":"unauthorized"}' });
    const r = await invoke({
      prompt: "x",
      aspectRatio: "square",
      quality: "low",
    });
    assertEquals(r.status, 502);
    assert(
      String(r.json?.error ?? "")
        .toLowerCase()
        .includes("chave"),
    );
  },
);

Deno.test("error: EvoLink 429 on create → 502 with 'limite'", async () => {
  reset({ createStatus: 429, createRawText: '{"error":"rate"}' });
  const r = await invoke({
    prompt: "x",
    aspectRatio: "square",
    quality: "low",
  });
  assertEquals(r.status, 502);
  assert(
    String(r.json?.error ?? "")
      .toLowerCase()
      .includes("limite"),
  );
});

Deno.test("error: upload failure bubbles as 502", async () => {
  reset({ uploadStatus: 403, uploadRawText: '{"error":"forbidden"}' });
  const r = await invoke({
    prompt: "x",
    aspectRatio: "square",
    quality: "low",
    logoImage: TINY_DATA_URL,
  });
  assertEquals(r.status, 502);
  assert(
    String(r.json?.error ?? "")
      .toLowerCase()
      .includes("chave"),
  );
});

Deno.test("error: completed task without image → 500", async () => {
  reset({ taskResponseBody: { status: "completed", results: [] } });
  const r = await invoke({
    prompt: "x",
    aspectRatio: "square",
    quality: "low",
  });
  assertEquals(r.status, 500);
  assert(String(r.json?.error ?? "").includes("não retornou imagem"));
});

Deno.test("OPTIONS request → CORS preflight", async () => {
  reset();
  const req = new Request("http://localhost/criativo-generate", {
    method: "OPTIONS",
  });
  const res = await capturedHandler!(req);
  await res.text();
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin") === "*");
});
