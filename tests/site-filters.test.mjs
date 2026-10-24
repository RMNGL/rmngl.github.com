import test from "node:test";
import assert from "node:assert/strict";
import { orderedFilterValues } from "../src/site-filters.js";

test("collects content types in first-seen order without duplicates", () => {
  const entries = [
    { contentType: "Product", extensions: [] },
    { contentType: "Tools", extensions: [] },
    { contentType: "Product", extensions: [] },
    { contentType: "Release", extensions: [] },
  ];
  assert.deepEqual(orderedFilterValues(entries), ["Product", "Tools", "Release"]);
});

test("adds extensions after their item's content type", () => {
  const entries = [
    { contentType: "Product", extensions: [".jpg", ".png"] },
    { contentType: "Tools", extensions: [".jpg"] },
  ];
  assert.deepEqual(orderedFilterValues(entries), ["Product", ".jpg", ".png", "Tools"]);
});

test("skips empty content types and empty extensions", () => {
  const entries = [
    { contentType: "", extensions: ["", "  "] },
    { contentType: "  Contact  ", extensions: [] },
  ];
  assert.deepEqual(orderedFilterValues(entries), ["Contact"]);
});
