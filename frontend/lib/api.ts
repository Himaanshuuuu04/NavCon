const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function getAccessToken() {
  const res = await fetch(`${BACKEND_URL}/api/token`);
  if (!res.ok) throw new Error('Failed to get token');
  const data = await res.json();
  return {
    access_token: data.access_token,
    rest_api_key: data.rest_api_key
  };
}
