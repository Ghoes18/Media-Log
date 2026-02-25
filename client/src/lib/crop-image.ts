/**
 * Loads an image from a URL (data URL or http) and returns an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(new Error("Failed to load image")));
    img.src = src;
  });
}

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Crops the image to the given rectangle and returns a circular crop as a data URL.
 * The output is a square canvas with the circle drawn (transparent outside the circle).
 */
export async function getCroppedImageCircular(
  imageSrc: string,
  pixelCrop: PixelCrop
): Promise<string> {
  const image = await loadImage(imageSrc);
  const { width, height, x, y } = pixelCrop;
  const size = Math.min(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const sourceX = x + (width - size) / 2;
  const sourceY = y + (height - size) / 2;

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, sourceX, sourceY, size, size, 0, 0, size, size);

  return canvas.toDataURL("image/png");
}
