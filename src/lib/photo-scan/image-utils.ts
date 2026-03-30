/**
 * Convert a File to a base64 data string (without the data: prefix).
 * Optionally resizes to keep the largest dimension under maxDim.
 */
export async function fileToBase64(file: File, maxDim = 1600): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;

  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1];
  return { base64, mediaType: "image/jpeg" };
}
