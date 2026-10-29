import AsyncStorage from '@react-native-async-storage/async-storage';
import { DraftStore } from './draftStore';
export const drafts = new DraftStore(AsyncStorage);
