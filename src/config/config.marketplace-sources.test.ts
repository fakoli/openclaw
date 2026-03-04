import { describe, expect, it } from "vitest";
import { OpenClawSchema } from "./zod-schema.js";

describe("marketplace sources config schema", () => {
  it("accepts github and path marketplace sources", () => {
    const result = OpenClawSchema.safeParse({
      marketplace: {
        sources: [
          { type: "github", repo: "openclaw/marketplace" },
          { type: "path", path: "/tmp/marketplace" },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid marketplace source entries", () => {
    const result = OpenClawSchema.safeParse({
      marketplace: {
        sources: [{ type: "github" }],
      },
    });
    expect(result.success).toBe(false);
  });
});
