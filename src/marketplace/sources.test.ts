import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseMarketplaceMetadataDocument,
  parseMarketplaceSourceInput,
  readMarketplaceSourceEntries,
  sourceIdentity,
} from "./sources.js";

describe("marketplace source parsing", () => {
  it("parses github shorthand", () => {
    expect(parseMarketplaceSourceInput("openclaw/openclaw")).toEqual({
      type: "github",
      repo: "openclaw/openclaw",
    });
  });

  it("parses local path source", () => {
    const parsed = parseMarketplaceSourceInput("./fixtures/market");
    expect(parsed.type).toBe("path");
    expect(parsed).toEqual({
      type: "path",
      path: path.resolve("./fixtures/market"),
    });
  });

  it("builds stable identities", () => {
    expect(sourceIdentity({ type: "github", repo: "OpenClaw/OpenClaw" })).toBe(
      "github:openclaw/openclaw",
    );
    expect(sourceIdentity({ type: "path", path: "/tmp/a/../b" })).toBe("path:/tmp/b");
  });

  it("rejects invalid metadata documents", () => {
    expect(() => parseMarketplaceMetadataDocument({})).toThrow("entries must be an array");
    expect(() =>
      parseMarketplaceMetadataDocument({
        entries: [{ name: "missing-id" }],
      }),
    ).toThrow("missing id");
  });
});

describe("marketplace source metadata loading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads entries from local path source", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-marketplace-test-"));
    await fs.writeFile(
      path.join(dir, "openclaw.marketplace.json"),
      JSON.stringify({
        entries: [
          { id: "clock", name: "Clock Plugin", kind: "plugin", install: "@openclaw/clock" },
        ],
      }),
      "utf8",
    );

    const result = await readMarketplaceSourceEntries({ type: "path", path: dir });
    expect(result.error).toBeUndefined();
    expect(result.entries).toEqual([
      {
        id: "clock",
        name: "Clock Plugin",
        kind: "plugin",
        install: "@openclaw/clock",
        description: undefined,
      },
    ]);
  });

  it("loads entries from github source metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            entries: [{ id: "weather", name: "Weather Skill", kind: "skill" }],
          }),
      })),
    );

    const result = await readMarketplaceSourceEntries({ type: "github", repo: "acme/market" });
    expect(result.error).toBeUndefined();
    expect(result.entries[0]).toMatchObject({
      id: "weather",
      name: "Weather Skill",
      kind: "skill",
    });
  });
});
