import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { SessionProvider, useSession } from './src/session/SessionProvider';
import type { Routes } from './src/navigation.types';
import { FeedScreen } from './src/screens/FeedScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { TaxonomyScreen } from './src/screens/TaxonomyScreen';
import { Button, Feedback, Loading, Screen } from './src/components/UI';
import { colors, s } from './src/theme';

const Stack = createNativeStackNavigator<Routes>();
const linking: LinkingOptions<Routes> = { prefixes: ['strideblog://'], config: { screens: { Feed: '', Detail: { path: 'story/:id', parse: { id: value => Number(value) } } } } };
function Root() {
  const { user, status, error, session } = useSession();
  if (status === 'loading') return <Screen><Text style={s.title}>STRIDE.</Text><Loading /></Screen>;
  if (status === 'offline') return <Screen><Text style={s.title}>LET'S\nRECONNECT.</Text><Feedback message={error} /><Button title="Retry session" onPress={() => { void session.hydrate(); }} /><Button title="Sign out on this device" secondary onPress={() => { void session.clear(); }} /></Screen>;
  return <NavigationContainer linking={linking} theme={{ dark: false, colors: { primary: colors.ink, background: colors.paper, card: colors.paper, text: colors.ink, border: colors.line, notification: colors.red }, fonts: { regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' }, medium: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' }, bold: { fontFamily: 'BarlowCondensed_700Bold', fontWeight: '700' }, heavy: { fontFamily: 'BarlowCondensed_800ExtraBold', fontWeight: '800' } } }}>
    <Stack.Navigator screenOptions={({ navigation, route }) => ({ headerShadowVisible: false, headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerTitleStyle: { fontFamily: 'BarlowCondensed_800ExtraBold', fontSize: 26 }, headerBackButtonDisplayMode: 'minimal', headerTitle: route.name === 'Feed' ? 'STRIDE.' : undefined, contentStyle: { backgroundColor: colors.paper },
      headerRight: () => <View style={{ flexDirection: 'row', gap: 14 }}>
        {user && route.name !== 'Notifications' && <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={10} onPress={() => navigation.navigate('Notifications')}><Text style={s.label}>Inbox</Text></Pressable>}
        {route.name !== 'Account' && route.name !== 'Auth' && <Pressable accessibilityRole="button" accessibilityLabel={user ? 'Your account' : 'Sign in'} hitSlop={10} onPress={() => user ? navigation.navigate('Account') : navigation.navigate('Auth')}><Text style={s.label}>{user ? 'You' : 'Sign in'}</Text></Pressable>}
      </View>,
    })}>
      <Stack.Group navigationKey={user ? `member-${user.id}-${user.is_staff}` : 'guest'}>
        <Stack.Screen name="Feed" component={FeedScreen} options={{ title: 'STRIDE.' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'The story' }} />
        {user ? <>
          <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Your space' }} />
          <Stack.Screen name="Library" component={LibraryScreen} options={{ title: 'Your library' }} />
          <Stack.Screen name="Editor" component={EditorScreen} options={{ title: 'The studio', gestureEnabled: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
          <Stack.Screen name="Taxonomy" component={TaxonomyScreen} options={{ title: 'Tags & categories' }} />
          {user.is_staff && <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Administration' }} />}
        </> : <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Join the conversation' }} />}
      </Stack.Group>
    </Stack.Navigator>
  </NavigationContainer>;
}
export default function App() {
  const [loaded, error] = useFonts({ BarlowCondensed_800ExtraBold, BarlowCondensed_700Bold, Manrope_400Regular, Manrope_600SemiBold });
  return <SafeAreaProvider><StatusBar style="dark" />{!loaded && !error ? <Screen><Loading /></Screen> : <SessionProvider><Root /></SessionProvider>}</SafeAreaProvider>;
}
