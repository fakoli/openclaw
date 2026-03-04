import type { OpenClawConfig } from "../config/config.js";
import { loadConfig, writeConfigFile } from "../config/config.js";
import type { MarketplaceSourceConfig } from "../config/types.marketplace.js";
import {
  parseMarketplaceSourceInput,
  readMarketplaceSourceEntries,
  sourceIdentity,
  type MarketplaceSource,
} from "../marketplace/sources.js";
import type { RuntimeEnv } from "../runtime.js";

function parseConfigSource(source: MarketplaceSourceConfig): MarketplaceSource | null {
  if (!source || typeof source !== "object") {
    return null;
  }
  if (source.type === "github" && typeof source.repo === "string" && source.repo.trim()) {
    return { type: "github", repo: source.repo.trim() };
  }
  if (source.type === "path" && typeof source.path === "string" && source.path.trim()) {
    return { type: "path", path: source.path.trim() };
  }
  return null;
}

function getConfiguredSources(config: OpenClawConfig): MarketplaceSource[] {
  const result: MarketplaceSource[] = [];
  for (const source of config.marketplace?.sources ?? []) {
    const normalized = parseConfigSource(source);
    if (normalized) {
      result.push(normalized);
    }
  }
  return result;
}

function toConfigSource(source: MarketplaceSource): MarketplaceSourceConfig {
  return source.type === "github"
    ? { type: "github", repo: source.repo }
    : { type: "path", path: source.path };
}

export async function marketplaceAddCommand(
  sourceInput: string,
  runtime: RuntimeEnv,
): Promise<void> {
  const source = parseMarketplaceSourceInput(sourceInput);
  const config = loadConfig();
  const existingSources = getConfiguredSources(config);
  const existingKeys = new Set(existingSources.map((entry) => sourceIdentity(entry)));
  const key = sourceIdentity(source);
  if (existingKeys.has(key)) {
    runtime.log(`Marketplace source already configured: ${sourceInput}`);
    return;
  }

  const nextSources = [...(config.marketplace?.sources ?? []), toConfigSource(source)];
  const nextConfig: OpenClawConfig = {
    ...config,
    marketplace: {
      ...config.marketplace,
      sources: nextSources,
    },
  };
  await writeConfigFile(nextConfig);
  runtime.log(`Added marketplace source: ${source.type === "github" ? source.repo : source.path}`);
}

export async function marketplaceListCommand(runtime: RuntimeEnv): Promise<void> {
  const config = loadConfig();
  const sources = getConfiguredSources(config);
  if (sources.length === 0) {
    runtime.log("No marketplace sources configured. Use: openclaw marketplace add <source>");
    return;
  }

  runtime.log("Marketplace sources:");
  for (const source of sources) {
    const label = source.type === "github" ? source.repo : source.path;
    runtime.log(`- ${source.type}: ${label}`);
  }

  const resolved = await Promise.all(sources.map((source) => readMarketplaceSourceEntries(source)));

  const entries = resolved.flatMap((source) =>
    source.entries.map((entry) => ({
      source: source.sourceLabel,
      id: entry.id,
      name: entry.name,
      kind: entry.kind ?? "-",
      install: entry.install ?? entry.id,
    })),
  );

  for (const source of resolved) {
    if (source.error) {
      runtime.log(`Warning: ${source.sourceLabel}: ${source.error}`);
    }
  }

  if (entries.length === 0) {
    runtime.log("No installable marketplace entries found.");
    return;
  }

  runtime.log("Installable entries:");
  runtime.log("source\tid\tname\tkind\tinstall");
  for (const entry of entries) {
    runtime.log(`${entry.source}\t${entry.id}\t${entry.name}\t${entry.kind}\t${entry.install}`);
  }
}

export async function marketplaceBrowseCommand(runtime: RuntimeEnv): Promise<void> {
  runtime.log("Marketplace browse is currently non-interactive. Showing available entries.");
  await marketplaceListCommand(runtime);
}
