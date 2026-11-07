import { describe, expect, it } from "vitest";
import { hashBlob } from "../src";

describe("hashBlob", () => {
  it("returns the sha256 hex digest", async () => {
    await expect(hashBlob(new Blob(["hello"]))).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("gives identical blobs the same key", async () => {
    const first = await hashBlob(new Blob(["same"]));
    const second = await hashBlob(new Blob(["same"]));

    expect(first).toBe(second);
  });

  it("gives different blobs different keys", async () => {
    const first = await hashBlob(new Blob(["one"]));
    const second = await hashBlob(new Blob(["two"]));

    expect(first).not.toBe(second);
  });
});
