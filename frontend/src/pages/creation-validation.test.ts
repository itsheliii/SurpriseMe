import { describe, expect, it } from "vitest";
import { validatePhotos } from "./creation-validation";
import { LIMITS } from "@surpriseme/shared";

const photo = { name: "photo.jpg", type: "image/jpeg", size: 1024 };
describe("photo selection", () => {
  it("accepts supported photos up to the size and count limits", () => {
    expect(validatePhotos([{ ...photo, size: LIMITS.maxPhotoSizeBytes }], 19)).toBeNull();
  });
  it("enforces the limit across repeated selections", () => {
    expect(validatePhotos([photo, photo], 19)).toContain("20 photos");
  });
  it("rejects unsupported types, empty files, and oversized photos", () => {
    expect(validatePhotos([{ ...photo, type: "image/svg+xml" }], 0)).toContain("JPG, PNG, or WebP");
    expect(validatePhotos([{ ...photo, size: 0 }], 0)).toContain("non-empty");
    expect(validatePhotos([{ ...photo, size: LIMITS.maxPhotoSizeBytes + 1 }], 0)).toContain("5 MB");
  });
});
