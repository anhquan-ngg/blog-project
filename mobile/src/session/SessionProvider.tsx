import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api';
import { SessionController } from './controller';

const key = 'stride.auth.token';
let webToken: string | null = null;
const controller = new SessionController(api, {
  get: () => Platform.OS === 'web' ? Promise.resolve(webToken) : SecureStore.getItemAsync(key),
  set: token => Platform.OS === 'web' ? Promise.resolve(void (webToken = token)) : SecureStore.setItemAsync(key, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  remove: () => Platform.OS === 'web' ? Promise.resolve(void (webToken = null)) : SecureStore.deleteItemAsync(key),
});
api.onUnauthorized = () => { void controller.clear(); };
const Context = createContext(controller);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { void controller.hydrate(); }, []);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}
export function useSession() {
  const session = useContext(Context);
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  return { ...state, session };
}
