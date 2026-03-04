import type { Command } from "commander";
import {
  marketplaceAddCommand,
  marketplaceBrowseCommand,
  marketplaceListCommand,
} from "../commands/marketplace.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { runCommandWithRuntime } from "./cli-utils.js";

export function registerMarketplaceCli(program: Command) {
  const marketplace = program
    .command("marketplace")
    .description("Manage marketplace metadata sources and browse installable entries")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/marketplace", "docs.openclaw.ai/cli/marketplace")}\n`,
    );

  marketplace
    .command("add")
    .description("Add a marketplace metadata source (owner/repo or local path)")
    .argument("<source>", "Source to add")
    .action(async (source: string) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await marketplaceAddCommand(source, defaultRuntime);
      });
    });

  marketplace
    .command("list")
    .description("List configured marketplace sources and installable entries")
    .action(async () => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await marketplaceListCommand(defaultRuntime);
      });
    });

  marketplace
    .command("browse")
    .description("Browse available marketplace entries (non-interactive)")
    .action(async () => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await marketplaceBrowseCommand(defaultRuntime);
      });
    });
}
