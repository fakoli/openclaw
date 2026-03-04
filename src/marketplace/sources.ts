import fs from "node:fs/promises";
import path from "node:path";
import { resolveUserPath } from "../utils.js";

const GITHUB_REPO_SHORTHAND = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const METADATA_CANDIDATE_FILES = ["openclaw.marketplace.json", "marketplace.json"] as const;

export type MarketplaceSource =
  | {
      type: "github";
      repo: string;
    }
  | {
      type: "path";
      path: string;
    };

export type MarketplaceEntry = {
  id: string;
  name: string;
  description?: string;
  kind?: string;
  install?: string;
};

export type MarketplaceSourceEntries = {
  sourceLabel: string;
  entries: MarketplaceEntry[];
  error?: string;
};

type MarketplaceMetadataDocument = {
  entries: MarketplaceEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseEntry(raw: unknown, index: number): MarketplaceEntry {
  if (!isRecord(raw)) {
    throw new Error(`Invalid marketplace entry at index ${index}: expected an object.`);
  }
  const id = asNonEmptyString(raw.id);
  if (!id) {
    throw new Error(`Invalid marketplace entry at index ${index}: missing id.`);
  }
  return {
    id,
    name: asNonEmptyString(raw.name) ?? id,
    description: asNonEmptyString(raw.description),
    kind: asNonEmptyString(raw.kind),
    install: asNonEmptyString(raw.install),
  };
}

export function parseMarketplaceMetadataDocument(raw: unknown): MarketplaceMetadataDocument {
  if (!isRecord(raw)) {
    throw new Error("Invalid marketplace metadata: expected an object.");
  }
  const entriesRaw = raw.entries;
  if (!Array.isArray(entriesRaw)) {
    throw new Error("Invalid marketplace metadata: entries must be an array.");
  }
  return {
    entries: entriesRaw.map((entry, index) => parseEntry(entry, index)),
  };
}

export function parseMarketplaceSourceInput(input: string): MarketplaceSource {
  const value = input.trim();
  if (!value) {
    throw new Error("Source cannot be empty.");
  }
  if (GITHUB_REPO_SHORTHAND.test(value)) {
    return {
      type: "github",
      repo: value,
    };
  }
  return {
    type: "path",
    path: resolveUserPath(value),
  };
}

export function sourceLabel(source: MarketplaceSource): string {
  return source.type === "github" ? `github:${source.repo}` : `path:${source.path}`;
}

export function sourceIdentity(source: MarketplaceSource): string {
  return source.type === "github"
    ? `github:${source.repo.toLowerCase()}`
    : `path:${path.normalize(source.path)}`;
}

async function readLocalMetadata(sourcePath: string): Promise<MarketplaceMetadataDocument> {
  const stat = await fs.stat(sourcePath);
  if (stat.isFile()) {
    const raw = await fs.readFile(sourcePath, "utf8");
    return parseMarketplaceMetadataDocument(JSON.parse(raw));
  }

  for (const filename of METADATA_CANDIDATE_FILES) {
    const candidate = path.join(sourcePath, filename);
    try {
      const raw = await fs.readFile(candidate, "utf8");
      return parseMarketplaceMetadataDocument(JSON.parse(raw));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    `No marketplace metadata file found under ${sourcePath} (expected ${METADATA_CANDIDATE_FILES.join(", ")}).`,
  );
}

async function fetchGithubMetadata(repo: string): Promise<MarketplaceMetadataDocument> {
  const branches = ["main", "master"];
  for (const branch of branches) {
    for (const file of METADATA_CANDIDATE_FILES) {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${file}`;
      const res = await fetch(url);
      if (res.status === 404) {
        continue;
      }
      if (!res.ok) {
        throw new Error(`Unable to read metadata from ${url} (HTTP ${res.status}).`);
      }
      const text = await res.text();
      return parseMarketplaceMetadataDocument(JSON.parse(text));
    }
  }
  throw new Error(
    `No marketplace metadata file found in ${repo} (checked ${METADATA_CANDIDATE_FILES.join(", ")} on main/master).`,
  );
}

export async function readMarketplaceSourceEntries(
  source: MarketplaceSource,
): Promise<MarketplaceSourceEntries> {
  const label = sourceLabel(source);
  try {
    const metadata =
      source.type === "path"
        ? await readLocalMetadata(source.path)
        : await fetchGithubMetadata(source.repo);
    return { sourceLabel: label, entries: metadata.entries };
  } catch (err) {
    return {
      sourceLabel: label,
      entries: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
