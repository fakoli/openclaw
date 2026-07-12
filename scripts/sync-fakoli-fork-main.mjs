#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const upstreamRemote = "origin";
const forkRemote = "fork";
const branch = "main";
const dryRun = process.argv.includes("--dry-run");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return (result.stdout ?? "").trim();
}

function status(command, args) {
  return spawnSync(command, args, { stdio: "ignore" }).status ?? 1;
}

function getRemoteUrl(remote, push = false) {
  return run("git", ["remote", "get-url", ...(push ? ["--push"] : []), remote], {
    capture: true,
  });
}

function isRepoUrl(url, owner, repo) {
  return new RegExp(`github\\.com[:/]${owner}/${repo}(?:\\.git)?$`, "i").test(url);
}

function assertRemoteShape() {
  const upstreamFetchUrl = getRemoteUrl(upstreamRemote);
  const upstreamPushUrl = getRemoteUrl(upstreamRemote, true);
  const forkFetchUrl = getRemoteUrl(forkRemote);
  const forkPushUrl = getRemoteUrl(forkRemote, true);

  if (!isRepoUrl(upstreamFetchUrl, "openclaw", "openclaw")) {
    throw new Error(
      `${upstreamRemote} fetch URL must point at openclaw/openclaw; got ${upstreamFetchUrl}`,
    );
  }

  if (isRepoUrl(upstreamPushUrl, "openclaw", "openclaw")) {
    throw new Error(
      `${upstreamRemote} push URL points at openclaw/openclaw. Disable it before syncing.`,
    );
  }

  if (!isRepoUrl(forkFetchUrl, "fakoli", "openclaw")) {
    throw new Error(`${forkRemote} fetch URL must point at fakoli/openclaw; got ${forkFetchUrl}`);
  }

  if (!isRepoUrl(forkPushUrl, "fakoli", "openclaw")) {
    throw new Error(`${forkRemote} push URL must point at fakoli/openclaw; got ${forkPushUrl}`);
  }
}

function isAncestor(ancestorRef, descendantRef) {
  return status("git", ["merge-base", "--is-ancestor", ancestorRef, descendantRef]) === 0;
}

try {
  assertRemoteShape();

  run("git", ["fetch", upstreamRemote, branch]);
  run("git", ["fetch", forkRemote, branch]);

  const upstreamRef = `${upstreamRemote}/${branch}`;
  const forkRef = `${forkRemote}/${branch}`;
  const forkBehindOnly = isAncestor(forkRef, upstreamRef);
  const forkContainsUpstream = isAncestor(upstreamRef, forkRef);

  if (forkBehindOnly) {
    const refspec = `${upstreamRef}:${branch}`;
    if (dryRun) {
      console.log(`Would run: git push ${forkRemote} ${refspec}`);
      process.exit(0);
    }

    run("git", ["push", forkRemote, refspec]);
    process.exit(0);
  }

  if (forkContainsUpstream) {
    console.log(`${forkRef} already contains ${upstreamRef}; no fork sync needed.`);
    process.exit(0);
  }

  throw new Error(
    [
      `${forkRef} and ${upstreamRef} have both moved.`,
      "Do not force-push or push upstream over fork main.",
      "Create a fork-only maintenance PR that merges upstream main into fakoli/openclaw main, then rerun this check.",
    ].join("\n"),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
