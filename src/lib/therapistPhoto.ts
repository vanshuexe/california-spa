import { supabase } from './supabase';

export const THERAPIST_PHOTO_BUCKET = 'therapist-photos';
export const THERAPIST_PLACEHOLDER = '/assets/images/therapist-placeholder.svg';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB (the storage bucket enforces this too)
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const MAX_SIDE = 1000; // photos are resized so pages stay fast
const MIN_SIDE = 150;
const MAX_PIXELS = 60_000_000; // refuse absurd images that would exhaust phone memory

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

// Looks at the first bytes of the file, not just its name or MIME type, so a renamed .exe / .html is rejected.
async function sniff(file: File): Promise<'jpeg' | 'png' | 'webp' | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  return null;
}

// Returns an error message, or null when the file is acceptable.
export async function validatePhotoFile(file: File): Promise<string | null> {
  if (!file) return 'Please choose a photo.';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (/hei[cf]/.test(file.type) || ext === 'heic' || ext === 'heif') {
    return 'HEIC photos are not supported. Please choose a JPG, PNG or WebP photo (on iPhone: Settings > Camera > Formats > Most Compatible).';
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return 'Only JPG, JPEG, PNG or WebP photos are allowed.';
  }
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_PHOTO_BYTES) {
    return `This photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum size is 5 MB.`;
  }
  if (!(await sniff(file))) return 'This file is not a valid JPG, PNG or WebP image.';
  return null;
}

export interface PreparedPhoto {
  blob: Blob;
  ext: 'webp' | 'jpg';
  contentType: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
}

// Validates, fixes phone-camera rotation, shrinks to at most 1000px and re-encodes (WebP, or JPEG on
// browsers without WebP encoding). A 4 MB phone photo becomes roughly 60-150 KB.
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const problem = await validatePhotoFile(file);
  if (problem) throw new Error(problem);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This image could not be read. It may be damaged. Please choose another photo.');
  }
  try {
    if (bitmap.width < MIN_SIDE || bitmap.height < MIN_SIDE) {
      throw new Error(`The photo is too small (${bitmap.width}x${bitmap.height}). Please use one at least ${MIN_SIDE}x${MIN_SIDE}.`);
    }
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error('The photo resolution is too large. Please choose a smaller photo.');

    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process the image.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
    let blob = await toBlob('image/webp', 0.86);
    if (blob && blob.type === 'image/webp') {
      return { blob, ext: 'webp', contentType: 'image/webp', width, height };
    }
    blob = await toBlob('image/jpeg', 0.88);
    if (!blob) throw new Error('Your browser could not process the image.');
    return { blob, ext: 'jpg', contentType: 'image/jpeg', width, height };
  } finally {
    bitmap.close();
  }
}

// ---- storage ----
const publicPrefix = () => `/storage/v1/object/public/${THERAPIST_PHOTO_BUCKET}/`;

export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(publicPrefix());
  return i === -1 ? null : decodeURIComponent(url.slice(i + publicPrefix().length).split('?')[0]);
}

// Uploads to <therapistId>/<random>.<ext> and returns the public URL to save in the database.
// Every upload gets a new file name, so a changed photo is never served from an old cache.
export async function uploadTherapistPhoto(therapistId: string, photo: PreparedPhoto): Promise<{ url: string; path: string }> {
  const path = `${therapistId}/${crypto.randomUUID()}.${photo.ext}`;
  const { error } = await supabase.storage.from(THERAPIST_PHOTO_BUCKET).upload(path, photo.blob, {
    contentType: photo.contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) {
      throw new Error('Photo storage is not set up yet. Run the latest supabase/schema.sql (therapist photos section).');
    }
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from(THERAPIST_PHOTO_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// Best effort: delete a photo we stored earlier (ignored for photos hosted elsewhere).
export async function deleteStoredPhoto(urlOrPath: string | null | undefined) {
  const path = urlOrPath && !/^https?:/.test(urlOrPath) ? urlOrPath : storagePathFromUrl(urlOrPath);
  if (!path) return;
  await supabase.storage.from(THERAPIST_PHOTO_BUCKET).remove([path]);
}
