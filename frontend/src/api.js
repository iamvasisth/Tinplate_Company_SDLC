const BASE_URL = 'http://localhost:5000/api';

export async function apiRequest(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid server response");
    }
    
    if (!res.ok) {
  if (res.status === 401) {
    // ❌ DO NOT force redirect
    return null;
  }

  throw new Error(data.message || 'API error');
}


    return data;

  } catch (error) {
    console.error("API Error:", error.message);
    throw error;
  }
}