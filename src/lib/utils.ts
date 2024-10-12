import { cookies } from 'next/headers';

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