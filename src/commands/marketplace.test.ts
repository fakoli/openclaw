import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/types.js";
import { createNonExitingRuntime } from "../runtime.js";

const mockLoadConfig = vi.fn<() => OpenClawConfig>();
const mockWriteConfigFile = vi.fn<(cfg: OpenClawConfig) => Promise<void>>(async () => {});

vi.mock("../config/config.js", () => ({
  loadConfig: () => mockLoadConfig(),
  writeConfigFile: (cfg: OpenClawConfig) => mockWriteConfigFile(cfg),
}));

let marketplaceAddCommand: typeof import("./marketplace.js").marketplaceAddCommand;
let marketplaceBrowseCommand: typeof import("./marketplace.js").marketplaceBrowseCommand;
let marketplaceListCommand: typeof import("./marketplace.js").marketplaceListCommand;

describe("marketplace commands", () => {
  beforeAll(async () => {
    ({ marketplaceAddCommand, marketplaceListCommand, marketplaceBrowseCommand } =
      await import("./marketplace.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a github source into config", async () => {
    mockLoadConfig.mockReturnValue({});
    const runtime = createNonExitingRuntime();
    const logSpy = vi.spyOn(runtime, "log").mockImplementation(() => {});

    await marketplaceAddCommand("openclaw/market", runtime);

    expect(mockWriteConfigFile).toHaveBeenCalledTimes(1);
    const written = mockWriteConfigFile.mock.calls[0]?.[0];
    expect(written.marketplace?.sources).toEqual([{ type: "github", repo: "openclaw/market" }]);
    expect(logSpy).toHaveBeenCalledWith("Added marketplace source: openclaw/market");
  });

  it("does not duplicate existing source", async () => {
    mockLoadConfig.mockReturnValue({
      marketplace: { sources: [{ type: "github", repo: "OpenClaw/Market" }] },
    });
    const runtime = createNonExitingRuntime();
    const logSpy = vi.spyOn(runtime, "log").mockImplementation(() => {});

    await marketplaceAddCommand("openclaw/market", runtime);

    expect(mockWriteConfigFile).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Marketplace source already configured: openclaw/market");
  });

  it("lists installable entries from configured source", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-marketplace-cmd-test-"));
    await fs.writeFile(
      path.join(dir, "marketplace.json"),
      JSON.stringify({
        entries: [{ id: "calendar", name: "Calendar", kind: "skill", install: "@acme/calendar" }],
      }),
      "utf8",
    );
    mockLoadConfig.mockReturnValue({
      marketplace: { sources: [{ type: "path", path: dir }] },
    });

    const runtime = createNonExitingRuntime();
    const logSpy = vi.spyOn(runtime, "log").mockImplementation(() => {});

    await marketplaceListCommand(runtime);

    const output = logSpy.mock.calls.map((call) => String(call[0]));
    expect(output.some((line) => line.includes("Marketplace sources:"))).toBe(true);
    expect(output.some((line) => line.includes("Installable entries:"))).toBe(true);
    expect(output.some((line) => line.includes("calendar"))).toBe(true);
  });

  it("browse prints placeholder and delegates to list output", async () => {
    mockLoadConfig.mockReturnValue({ marketplace: { sources: [] } });
    const runtime = createNonExitingRuntime();
    const logSpy = vi.spyOn(runtime, "log").mockImplementation(() => {});

    await marketplaceBrowseCommand(runtime);

    const output = logSpy.mock.calls.map((call) => String(call[0]));
    expect(output[0]).toContain("non-interactive");
    expect(output.some((line) => line.includes("No marketplace sources configured"))).toBe(true);
  });
});
