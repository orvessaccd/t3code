import { useEffect, useState } from "react";
import { useGT } from "gt-react";

import { useTheme } from "~/hooks/useTheme";

import { FileSurfaceLoading } from "./fileSurfaceChrome";

const MAX_FONT_BYTES = 10 * 1024 * 1024;

type FontFailure =
  | "load"
  | "limit"
  | "unavailable"
  | "decode"
  | "timeout"
  | "damaged"
  | { readonly message: string };

type FontReadResult =
  | { readonly ok: true; readonly data: string }
  | { readonly ok: false; readonly failure: FontFailure };

function resolveFontFailure(gt: ReturnType<typeof useGT>, failure: FontFailure): string {
  if (typeof failure === "object") return failure.message;
  switch (failure) {
    case "load":
      return gt("The font could not be loaded.");
    case "limit":
      return gt("Font previews are limited to 10 MB.");
    case "unavailable":
      return gt("The font is unavailable.");
    case "decode":
      return gt("The font could not be decoded.");
    case "timeout":
      return gt("The font took too long to load.");
    case "damaged":
      return gt("The font is damaged or unsupported.");
  }
}

async function readFont(src: string, signal: AbortSignal): Promise<FontReadResult> {
  const response = await fetch(src, { signal });
  if (!response.ok) return { ok: false, failure: "load" };
  if (Number(response.headers.get("content-length")) > MAX_FONT_BYTES)
    return { ok: false, failure: "limit" };
  const reader = response.body?.getReader();
  if (!reader) return { ok: false, failure: "unavailable" };
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_FONT_BYTES) return { ok: false, failure: "limit" };
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const blob = new Blob(chunks);
  await new FontFace("file-preview", await blob.arrayBuffer()).load();
  return await new Promise<FontReadResult>((resolve) => {
    const fileReader = new FileReader();
    fileReader.addEventListener(
      "load",
      () => resolve({ ok: true, data: String(fileReader.result) }),
      { once: true },
    );
    fileReader.addEventListener("error", () => resolve({ ok: false, failure: "decode" }), {
      once: true,
    });
    fileReader.readAsDataURL(blob);
  });
}

export default function FontViewer(props: { readonly src: string; readonly name: string }) {
  const gt = useGT();
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<FontFailure | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Load the font from its URL and abort the request and timeout when the source changes or unmounts.
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setError("timeout");
      controller.abort();
    }, 30_000);
    void readFont(props.src, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) setData(result.data);
        else setError(result.failure);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error && cause.message ? { message: cause.message } : "damaged");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [props.src]);
  if (error)
    return (
      <div
        role="alert"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-6 text-center"
      >
        <p className="text-sm font-medium">{gt("No preview for this file")}</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          {gt("{error} Save it to open in another app.", { error: resolveFontFailure(gt, error) })}
        </p>
      </div>
    );
  if (!data) return <FileSurfaceLoading />;
  const tokens = getComputedStyle(document.documentElement);
  const background = tokens.getPropertyValue("--background");
  const foreground = tokens.getPropertyValue("--foreground");
  const heading = gt("Font preview").replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>@font-face{font-family:preview;src:url('${data}')}html{color-scheme:${resolvedTheme};background:${background};color:${foreground}}body{margin:0;padding:32px;font-family:preview;overflow-wrap:anywhere}h1{font-size:40px;font-weight:normal}p{line-height:1.4}small{font:12px monospace;display:block;opacity:.6;margin-bottom:8px}</style></head><body><h1>${heading}</h1><p style="font-size:24px">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 !?&amp;@#%(){}[]</p>${[12, 16, 24, 40, 64].map((size) => `<p style="font-size:${size}px"><small>${size} px</small>The quick brown fox jumps over the lazy dog.</p>`).join("")}</body></html>`;
  return (
    <iframe title={props.name} srcDoc={srcDoc} sandbox="" className="min-h-0 flex-1 border-0" />
  );
}
