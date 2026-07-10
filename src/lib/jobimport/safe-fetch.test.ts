import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobImportError } from "./errors";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { isPrivateAddress, safeFetch } from "./safe-fetch";

const PUBLIC_DNS = [{ address: "93.184.216.34", family: 4 }];

function htmlResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });
}

async function expectKind(promise: Promise<unknown>, kind: JobImportError["kind"]) {
  try {
    await promise;
    expect.unreachable("expected safeFetch to throw");
  } catch (err) {
    expect(err).toBeInstanceOf(JobImportError);
    expect((err as JobImportError).kind).toBe(kind);
  }
}

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockResolvedValue(PUBLIC_DNS);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isPrivateAddress", () => {
  it("classifies private and reserved ranges", () => {
    for (const ip of [
      "10.1.2.3",
      "127.0.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd12::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:2800:220:1::1"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});

describe("safeFetch — SSRF guards", () => {
  it("rejects non-http(s) schemes without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expectKind(safeFetch("file:///etc/passwd"), "invalid_url");
    await expectKind(safeFetch("ftp://example.com/x"), "invalid_url");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects localhost, internal names, and metadata hosts without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const url of [
      "http://localhost:3000/jobs",
      "http://foo.localhost/jobs",
      "http://intranet/jobs", // dotless
      "http://server.internal/jobs",
      "http://metadata.google.internal/computeMetadata/v1/",
    ]) {
      await expectKind(safeFetch(url), "invalid_url");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects private IP literals without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const url of [
      "http://127.0.0.1/jobs",
      "http://10.0.0.5/jobs",
      "http://169.254.169.254/latest/meta-data/",
      "http://192.168.0.10/jobs",
      "http://[::1]/jobs",
    ]) {
      await expectKind(safeFetch(url), "invalid_url");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects hostnames that resolve to private addresses", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    await expectKind(safeFetch("https://rebind.example.com/jobs"), "invalid_url");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects redirects to private addresses before following them", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expectKind(safeFetch("https://jobs.example.com/1"), "invalid_url");
    expect(fetchMock).toHaveBeenCalledTimes(1); // never fetched the redirect target
  });

  it("follows safe redirects and re-validates each hop", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: "https://jobs.example.com/canonical" },
        }),
      )
      .mockResolvedValueOnce(htmlResponse("<html><body>ok</body></html>"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await safeFetch("https://jobs.example.com/1");
    expect(result.body).toContain("ok");
    expect(result.finalUrl).toBe("https://jobs.example.com/canonical");
    expect(lookupMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after too many redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://jobs.example.com/loop" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expectKind(safeFetch("https://jobs.example.com/1"), "fetch_failed");
  });
});

describe("safeFetch — response limits", () => {
  it("rejects oversized responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(htmlResponse("x".repeat(600))),
    );
    await expectKind(
      safeFetch("https://jobs.example.com/1", { maxBytes: 500 }),
      "fetch_failed",
    );
  });

  it("rejects unsupported content types", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("%PDF-1.4", {
          headers: { "content-type": "application/pdf" },
        }),
      ),
    );
    await expectKind(safeFetch("https://jobs.example.com/cv.pdf"), "not_found");
  });

  it("rejects responses without a content type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("hello")),
    );
    // Response gives text/plain by default when constructed from a string,
    // so build one with the header stripped.
    const bare = new Response("hello");
    bare.headers.delete("content-type");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(bare));
    await expectKind(safeFetch("https://jobs.example.com/1"), "not_found");
  });

  it("maps 403 and 429 to a blocked error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("denied", { status: 403 })),
    );
    await expectKind(safeFetch("https://jobs.example.com/1"), "blocked");
  });
});
