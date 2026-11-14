import { Directory, File, Paths } from 'expo-file-system';

const directory = () => new Directory(Paths.document, 'private-receipts');
export async function persistReceipt(uri: string, id: string): Promise<string> {
  const target = directory();
  target.create({ idempotent: true, intermediates: true });
  const extension = uri.split('?')[0].match(/\.(jpe?g|png|webp|heic|avif)$/i)?.[0] ?? '.jpg';
  const file = new File(target, id + extension);
  const source = new File(uri);
  if (!source.exists) throw new Error('Không tìm thấy ảnh. Vui lòng chọn lại.');
  await source.copy(file);
  return file.uri;
}
export async function deleteReceipt(uri: string | null): Promise<void> {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) await file.delete();
}
