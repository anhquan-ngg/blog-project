import type { NativeStackScreenProps } from '@react-navigation/native-stack';
export type Routes = {
  Feed: { category?: number; tag?: string } | undefined;
  Detail: { id: number };
  Auth: { register?: boolean } | undefined;
  Account: undefined;
  Library: undefined;
  Editor: { id?: number; draftKey?: string } | undefined;
  Notifications: undefined;
  Admin: undefined;
  Taxonomy: undefined;
};
export type Props<T extends keyof Routes> = NativeStackScreenProps<Routes, T>;
