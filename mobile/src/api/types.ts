export interface User {
  id: number; username: string; email: string; first_name: string; last_name: string;
  is_active: boolean; is_staff: boolean; date_joined: string;
}
export interface Author { id: number; username: string }
export interface Category { id: number; name: string; slug?: string; parent_id?: number | null; posts_count?: number }
export interface Tag { id: number; name: string; slug: string }
export interface Block {
  type: string;
  data: { text?: string; level?: number; file_id?: number; url?: string | null; caption?: string;
    alignment?: string; items?: unknown[]; style?: string; html?: string; code?: string; [key: string]: unknown };
  [key: string]: unknown;
}
export interface Post {
  id: number; title: string; author: Author | string | null; category: Category | null;
  tags?: Tag[]; thumbnail?: string | null; likes_count: number; bookmarks_count: number;
  is_liked?: boolean; is_bookmarked?: boolean; created_at: string; updated_at?: string;
  content?: Block[] | string | null;
}
export interface Comment {
  id: number; content: string; author: Author | string | null; image_url: string | null;
  replies?: Comment[]; created_at: string; updated_at?: string;
}
export interface Notification {
  id: number; type: string; actor_username?: string | null; target_id: number;
  target_type: string; post_id: number | null; is_read: boolean; created_at: string;
}
export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface UploadedFile { id: number; url: string; uploaded_at: string }
export interface PostInput { title: string; category: number; tags: number[]; content: Block[] }
export interface ImportResult { total_rows: number; imported: number; skipped: number; errors: { row: number; reason: unknown }[] }
export interface Draft { key: string; userId: number; postId?: number; title: string; category: number | null; tags: number[]; content: Block[]; updatedAt: string }
