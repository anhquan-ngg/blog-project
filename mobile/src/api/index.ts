import { ApiClient, query } from './client';
import type { Category, Comment, ImportResult, Notification, Page, Post, PostInput, Tag, UploadedFile, User } from './types';

export const api = new ApiClient(process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api');
export const endpoints = {
  me: '/auth/me/', login: '/auth/login/', register: '/auth/register/', logout: '/auth/logout/',
  liked: '/me/liked/', bookmarks: '/me/bookmarks/', posts: '/posts/', users: '/admin/users/',
};
export function createService(api: ApiClient) { return {
  post: (id: number, signal?: AbortSignal) => api.request<Post>(`/posts/${id}/`, { signal }),
  savePost: (input: PostInput, id?: number) => api.request<Post>(id ? `/posts/${id}/` : '/posts/', { method: id ? 'PATCH' : 'POST', body: input }),
  deletePost: (id: number) => api.request<void>(`/posts/${id}/`, { method: 'DELETE' }),
  related: (id: number, signal?: AbortSignal) => api.request<Post[]>(`/posts/${id}/related/`, { signal }),
  like: (id: number) => api.request<{ is_liked: boolean; likes_count: number }>(`/posts/${id}/like/`, { method: 'POST' }),
  bookmark: (id: number) => api.request<{ is_bookmarked: boolean; bookmarks_count: number }>(`/posts/${id}/bookmark/`, { method: 'POST' }),
  comment: (postId: number, body: { content: string; file_id?: number | null; parent_id?: number | null }, id?: number) =>
    api.request<Comment>(id ? `/comments/${id}/` : `/posts/${postId}/comments/`, { method: id ? 'PATCH' : 'POST', body }),
  deleteComment: (id: number) => api.request<void>(`/comments/${id}/`, { method: 'DELETE' }),
  upload: (body: FormData, signal?: AbortSignal) => api.request<UploadedFile>('/files/upload/', { method: 'POST', body, signal }),
  read: (id: number) => api.request<{ detail: string }>(`/notifications/${id}/read/`, { method: 'PATCH' }),
  ban: (id: number, active: boolean) => api.request<User>(`/admin/users/${id}/${active ? 'unban' : 'ban'}/`, { method: 'POST' }),
  importCsv: (kind: 'posts' | 'users', body: FormData) => api.request<ImportResult>(`/admin/${kind}/import/`, { method: 'POST', body }),
  exportCsv: (kind: 'posts' | 'users', filters: Record<string, string>) => api.request<string>(query(`/admin/${kind}/export/`, filters), { text: true }),
  saveCategory: (name: string, parentId: number | null, id?: number) => api.request<Category>(id ? `/categories/${id}/` : '/categories/', { method: id ? 'PUT' : 'POST', body: { name, parent_id: parentId } }),
  saveTag: (name: string, id?: number) => api.request<Tag>(id ? `/tags/${id}/` : '/tags/', { method: id ? 'PATCH' : 'POST', body: { name } }),
}; }
export const service = createService(api);
export type { Category, Comment, Notification, Page, Post, PostInput, Tag, UploadedFile, User };
