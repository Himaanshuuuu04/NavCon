const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function getAccessToken() {
  try {
    console.log(`Fetching token from: ${BACKEND_URL}/api/token`);
    const res = await fetch(`${BACKEND_URL}/api/token`, {
      headers: {
        // Skips the ngrok warning page for free tier users
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
    });

    // check content type
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
      const text = await res.text();
      console.error("API Error: Expected JSON but got:", contentType);
      console.error("Response body:", text.substring(0, 500)); // Log first 500 chars
      throw new Error(
        `API returned non-JSON response: ${res.status} ${res.statusText}`
      );
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to get token: ${res.status} ${res.statusText} - ${errorText}`
      );
    }

    const data = await res.json();
    return {
      access_token: data.access_token,
      rest_api_key: data.rest_api_key,
    };
  } catch (error) {
    console.error("Token fetch error:", error);
    throw error;
  }
}
