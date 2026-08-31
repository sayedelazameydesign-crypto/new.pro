import { test } from "node:test";
import assert from "node:assert/strict";
import { isImageGenerationEnabled, IMAGE_UI_ENABLED } from "../lib/flags";

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

test("F-2 IMAGE_GENERATION_ENABLED=1 يفعّل المسار", () => {
  const prev = process.env.IMAGE_GENERATION_ENABLED;
  process.env.IMAGE_GENERATION_ENABLED = "1";
  try {
    assert.equal(isImageGenerationEnabled(), true);
  } finally {
    if (prev === undefined) delete process.env.IMAGE_GENERATION_ENABLED;
    else process.env.IMAGE_GENERATION_ENABLED = prev;
  }
});

test("F-3 زر الواجهة معطّل ما لم يُضبط NEXT_PUBLIC_IMAGE_GENERATION=1 وقت البناء", () => {
  assert.equal(IMAGE_UI_ENABLED, process.env.NEXT_PUBLIC_IMAGE_GENERATION === "1");
});
