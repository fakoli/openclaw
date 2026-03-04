import { Command } from "commander";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runRegisteredCli } from "../test-utils/command-runner.js";

const marketplaceAddCommand = vi.fn(async () => undefined);
const marketplaceListCommand = vi.fn(async () => undefined);
const marketplaceBrowseCommand = vi.fn(async () => undefined);

vi.mock("../commands/marketplace.js", () => ({
  marketplaceAddCommand,
  marketplaceListCommand,
  marketplaceBrowseCommand,
}));

const runtime = {
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn(),
};

vi.mock("../runtime.js", () => ({
  defaultRuntime: runtime,
}));

describe("marketplace cli", () => {
  let registerMarketplaceCli: typeof import("./marketplace-cli.js").registerMarketplaceCli;

  beforeAll(async () => {
    ({ registerMarketplaceCli } = await import("./marketplace-cli.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers marketplace subcommands", () => {
    const program = new Command();
    registerMarketplaceCli(program);
    const marketplace = program.commands.find((cmd) => cmd.name() === "marketplace");
    expect(marketplace).toBeTruthy();
    expect(marketplace?.commands.map((cmd) => cmd.name())).toEqual(["add", "list", "browse"]);
  });

  it("dispatches add/list/browse actions", async () => {
    await runRegisteredCli({
      register: registerMarketplaceCli as (program: Command) => void,
      argv: ["marketplace", "add", "openclaw/market"],
    });
    await runRegisteredCli({
      register: registerMarketplaceCli as (program: Command) => void,
      argv: ["marketplace", "list"],
    });
    await runRegisteredCli({
      register: registerMarketplaceCli as (program: Command) => void,
      argv: ["marketplace", "browse"],
    });

    expect(marketplaceAddCommand).toHaveBeenCalledWith("openclaw/market", runtime);
    expect(marketplaceListCommand).toHaveBeenCalledWith(runtime);
    expect(marketplaceBrowseCommand).toHaveBeenCalledWith(runtime);
  });
});
