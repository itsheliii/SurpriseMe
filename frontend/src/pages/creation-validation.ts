import { ALLOWED_IMAGE_TYPES, LIMITS } from "@surpriseme/shared";

export function validatePhotos(files: Pick<File, "type" | "size" | "name">[], existingCount: number): string | null {
  if (existingCount + files.length > LIMITS.maxPhotosPerSurprise) {
    return `Choose up to ${LIMITS.maxPhotosPerSurprise} photos in total.`;
  }
  for (const file of files) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return `${file.name}: choose a JPG, PNG, or WebP image.`;
    }
    if (file.size === 0 || file.size > LIMITS.maxPhotoSizeBytes) {
      return `${file.name}: photos must be non-empty and no larger than 5 MB.`;
    }
  }
  return null;
}
