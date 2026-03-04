---
summary: "CLI reference for `openclaw marketplace` (add, list, browse)"
read_when:
  - You want to add marketplace metadata sources
  - You want to list installable marketplace entries
title: "marketplace"
---

# `openclaw marketplace`

Manage marketplace metadata sources and view installable entries.

## Commands

```bash
openclaw marketplace add <source>
openclaw marketplace list
openclaw marketplace browse
```

`<source>` supports:

- GitHub shorthand in `owner/repo` format (for example `openclaw/marketplace`).
- Local path to a marketplace metadata directory or JSON file.

For local directory sources, OpenClaw checks for `openclaw.marketplace.json` then `marketplace.json`.
