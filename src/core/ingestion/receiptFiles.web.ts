import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

export async function persistReceipt(uri: string, _id: string): Promise<string> {
  if (!/^(blob:|data:image\/)/.test(uri)) throw new Error('Hãy chọn ảnh từ thiết bị, không nhập URL ảnh từ mạng.');
  const context = ImageManipulator.manipulate(uri);
  let rendered: ImageRef | null = null;
  try {
    context.resize({ width: 1024 });
    rendered = await context.renderAsync();
    const normalized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    const base64 = normalized.base64;
    if (!base64 || base64.length > 4 * Math.ceil(2 * 1024 * 1024 / 3)) throw new Error('Ảnh vượt giới hạn 2 MB sau tối ưu. Hãy chọn ảnh nhỏ hơn.');
    // A data URL lives in SQLite with the queue, unlike ephemeral picker blob URLs.
    return `data:image/jpeg;base64,${base64}`;
  } finally {
    rendered?.release();
    context.release();
  }
}

export async function deleteReceipt(_uri: string | null): Promise<void> {
  // Browser image bytes belong to the SQLite queue row; deleting the row removes them.
}
