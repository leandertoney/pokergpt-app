/**
 * Profile picture, stored on the device.
 *
 * Device-only by choice. Most users of this app never sign in -- of 172 user
 * rows, the overwhelming majority are anonymous visitors -- so a cloud avatar
 * would either be unavailable to most people or require putting their photo in
 * the one storage bucket this project has, which is public. Neither is worth it
 * for a decoration.
 *
 * The picked image is copied into the app's own documents directory rather than
 * referenced where the picker left it. iOS hands back a URI in a temporary
 * cache location that the system is free to purge, so referencing it directly
 * gives you an avatar that silently disappears days later.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

const AVATAR_URI_KEY = '@user_avatar_uri';
const AVATAR_DIR = `${FileSystem.documentDirectory}avatar/`;

/** The stored avatar, or null. Also clears the key if the file has vanished. */
export async function getAvatarUri(): Promise<string | null> {
  try {
    const uri = await AsyncStorage.getItem(AVATAR_URI_KEY);
    if (!uri) return null;

    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      await AsyncStorage.removeItem(AVATAR_URI_KEY);
      return null;
    }
    return uri;
  } catch {
    return null;
  }
}

/**
 * Open the library, copy the chosen image somewhere durable, and save it.
 *
 * @returns the new URI, or null if the player cancelled or denied access.
 */
export async function pickAvatar(): Promise<string | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      // Square, because every surface that renders it is a circle.
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;

    return await persist(result.assets[0].uri);
  } catch (e: any) {
    console.warn('[avatar] pick failed:', e?.message);
    return null;
  }
}

export async function clearAvatar(): Promise<void> {
  try {
    const uri = await AsyncStorage.getItem(AVATAR_URI_KEY);
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
    await AsyncStorage.removeItem(AVATAR_URI_KEY);
  } catch (e: any) {
    console.warn('[avatar] clear failed:', e?.message);
  }
}

/**
 * Copy into the documents directory under a fresh name.
 *
 * The filename changes every time so React Native's image cache cannot serve
 * the previous picture for a path it has already seen.
 */
async function persist(sourceUri: string): Promise<string | null> {
  try {
    await FileSystem.makeDirectoryAsync(AVATAR_DIR, { intermediates: true }).catch(() => {});

    // Remove the old one rather than accumulating a directory of dead avatars.
    const previous = await AsyncStorage.getItem(AVATAR_URI_KEY);
    if (previous) await FileSystem.deleteAsync(previous, { idempotent: true }).catch(() => {});

    const target = `${AVATAR_DIR}avatar-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: sourceUri, to: target });
    await AsyncStorage.setItem(AVATAR_URI_KEY, target);
    return target;
  } catch (e: any) {
    console.warn('[avatar] persist failed:', e?.message);
    return null;
  }
}
