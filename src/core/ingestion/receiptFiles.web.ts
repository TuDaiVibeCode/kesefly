export async function persistReceipt(_uri: string, _id: string): Promise<string> {
  throw new Error('Phân tích ảnh local cần development build Android/iOS. Trên web, hãy nhập giao dịch thủ công.');
}
export async function deleteReceipt(_uri: string | null): Promise<void> {}
