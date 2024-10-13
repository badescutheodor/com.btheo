import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { Setting } from '@/lib/entities/Setting';
import { cache } from 'react';
import { revalidatePath } from 'next/cache';

export async function getCurrentUser() {
  const token = cookies().get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${process.env.API_URL}/api/user`, {
      headers: {
        'Cookie': `token=${token}`
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

export interface SettingsData {
  [key: string]: any;
}

let cachedSettings: SettingsData | null = null;

async function fetchSettings(): Promise<SettingsData> {
  const db = await getDB();
  const settingRepository = db.getRepository(Setting);
  const settings = await settingRepository.find();
  
  const settingsObject = settings.reduce<SettingsData>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  cachedSettings = settingsObject;
  return settingsObject;
}

const getCachedSettings = cache(async (): Promise<SettingsData> => {
  if (cachedSettings) {
    return cachedSettings;
  }
  return fetchSettings();
});

export async function getSettings(): Promise<SettingsData> {
  return getCachedSettings();
}

export async function refetchSettings() {
  'use server';
  cachedSettings = null; // Invalidate cache
  await fetchSettings();
  revalidatePath('/'); // Revalidate all pages that use this data
}
