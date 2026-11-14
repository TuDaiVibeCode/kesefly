import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

export async function persistReceipt(uri: string, id: string): Promise<string> {
  const target = new Directory(Paths.document, 'private-receipts');
  target.create({ idempotent: true, intermediates: true });
  const context = ImageManipulator.manipulate(uri);
  let rendered: ImageRef | null = null;
  let temporary: File | null = null;
  try {
    context.resize({ width: 1024 });
    rendered = await context.renderAsync();
    const normalized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    temporary = new File(normalized.uri);
    if (!temporary.exists || temporary.size > 2 * 1024 * 1024) throw new Error('Ảnh vượt giới hạn 2 MB sau tối ưu. Hãy chọn ảnh nhỏ hơn.');
    const file = new File(target, `${id}.jpg`);
    await temporary.copy(file);
    return file.uri;
  } finally {
    if (temporary?.exists) temporary.delete();
    rendered?.release();
    context.release();
  }
}

export async function deleteReceipt(uri: string | null): Promise<void> {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
