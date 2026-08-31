import { test } from "node:test";
import assert from "node:assert/strict";
import { isImageGenerationEnabled } from "../lib/flags";

test("F-1 توليد الصور معطّل افتراضيًا (بلا متغير بيئة)", () => {
  const prev = process.env.IMAGE_GENERATION_ENABLED;
  delete process.env.IMAGE_GENERATION_ENABLED;
  try {
    assert.equal(isImageGenerationEnabled(), false);
  } finally {
    if (prev === undefined) delete process.env.IMAGE_GENERATION_ENABLED;
    else process.env.IMAGE_GENERATION_ENABLED = prev;
  }
});

test("F-2 IMAGE_GENERATION_ENABLED=1 يفعّل المسار والزر عبر /api/status", () => {
  const prev = process.env.IMAGE_GENERATION_ENABLED;
  process.env.IMAGE_GENERATION_ENABLED = "1";
  try {
    assert.equal(isImageGenerationEnabled(), true);
  } finally {
    if (prev === undefined) delete process.env.IMAGE_GENERATION_ENABLED;
    else process.env.IMAGE_GENERATION_ENABLED = prev;
  }
});
