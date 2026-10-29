import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, service } from '../api';
import type { UploadedFile } from '../api/types';

function requireSameSession(token: string | null, signal?: AbortSignal) {
  if (!token || api.token !== token || signal?.aborted) { const error = new Error('Session changed. Operation cancelled.'); error.name = 'AbortError'; throw error; }
}
export async function pickAndUploadImage(signal?: AbortSignal): Promise<UploadedFile | null> {
  const ownerToken = api.token;
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo access is required. Enable it in your device settings.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
  if (result.canceled) return null;
  const original = result.assets[0];
  const image = await ImageManipulator.manipulateAsync(original.uri, original.width > 2400 ? [{ resize: { width: 2400 } }] : [], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
  const file = new File(image.uri);
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('The selected image exceeds 5 MB. Choose a smaller image.');
    requireSameSession(ownerToken, signal);
    const body = new FormData();
    body.append('image', { uri: image.uri, name: 'image.jpg', type: 'image/jpeg' } as unknown as Blob);
    return await service.upload(body, signal);
  } finally { if (image.uri !== original.uri && file.exists) file.delete(); }
}
export async function importCsv(kind: 'posts' | 'users') {
  const ownerToken = api.token;
  const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'application/vnd.ms-excel', 'text/plain'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0]; const file = new File(asset.uri);
  try {
    if (!asset.name.toLowerCase().endsWith('.csv')) throw new Error('Choose a .csv file.');
    if ((asset.size ?? file.size) > 10 * 1024 * 1024) throw new Error('CSV files must not exceed 10 MB.');
    requireSameSession(ownerToken);
    const body = new FormData(); body.append('file', { uri: asset.uri, name: asset.name, type: 'text/csv' } as unknown as Blob);
    return await service.importCsv(kind, body);
  } finally { if (file.exists) file.delete(); }
}
export async function exportCsv(kind: 'posts' | 'users', filters: Record<string, string>) {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is not available on this device.');
  // Fetch through the authenticated API client; never hand a public download URL to a browser.
  const ownerToken = api.token;
  const csv = await service.exportCsv(kind, filters);
  if (!ownerToken || ownerToken !== api.token) throw new Error('Session changed. Export cancelled.');
  const file = new File(Paths.cache, `stride-${kind}-${Date.now()}.csv`);
  try {
    file.create(); file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: `Export ${kind}` });
  } finally { if (file.exists) file.delete(); }
}
