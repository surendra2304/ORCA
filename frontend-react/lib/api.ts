let accessToken: string | null = null;

export const getAccessToken = () => {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  }
  return accessToken;
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('accessToken', token);
      localStorage.setItem('accessToken', token);
    } else {
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('accessToken');
    }
  }
};

export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

const RAW_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '/api/v1';
const BASE_URL = RAW_BASE_URL.replace(/\/$/, '');

interface RequestOptions extends RequestInit {
  json?: any;
}

async function request(path: string, options: RequestOptions = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.json) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.json);
  }

  options.headers = headers;

  const response = await fetch(url, options);

  if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      return await fetch(url, options).then(async (res) => {
        if (res.status === 204 || res.status === 202) return null;
        if (!res.ok) throw new Error('Request failed after refresh');
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      });
    } else {
      setAccessToken(null);
      setRefreshToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authUser');
        localStorage.removeItem('authWorkspace');
        if (window.location.pathname.startsWith('/app')) {
          window.location.href = '/login';
        }
      }
      throw new Error('Session expired');
    }
  }

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const text = await response.text();
      if (text) {
        const errorData = JSON.parse(text);
        errorMsg = errorData.error?.message || errorData.message || errorMsg;
      }
    } catch (err) {}
    throw new Error(errorMsg);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

function notifySubscribers(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

async function tryRefresh(): Promise<boolean> {
  const rToken = getRefreshToken();
  if (!rToken) return false;

  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((success) => {
        resolve(success);
      });
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: rToken }),
    });

    if (!res.ok) {
      isRefreshing = false;
      notifySubscribers(false);
      return false;
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    isRefreshing = false;
    notifySubscribers(true);
    return true;
  } catch (err) {
    isRefreshing = false;
    notifySubscribers(false);
    return false;
  }
}

export const api = {
  get: (path: string, options?: RequestOptions) => request(path, { ...options, method: 'GET' }),
  post: (path: string, json?: any, options?: RequestOptions) => request(path, { ...options, method: 'POST', json }),
  put: (path: string, json?: any, options?: RequestOptions) => request(path, { ...options, method: 'PUT', json }),
  patch: (path: string, json?: any, options?: RequestOptions) => request(path, { ...options, method: 'PATCH', json }),
  del: (path: string, options?: RequestOptions) => request(path, { ...options, method: 'DELETE' }),
  delete: (path: string, options?: RequestOptions) => request(path, { ...options, method: 'DELETE' }),
  
  upload: async (path: string, file: File) => {
    const url = `${BASE_URL}${path}`;
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = new Headers();
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      let errorMsg = 'Upload failed';
      try {
        const errJson = await response.json();
        errorMsg = errJson.error?.message || errJson.message || errorMsg;
      } catch (err) {}
      throw new Error(errorMsg);
    }
    
    return response.json();
  },
  
  sse: (path: string) => {
    const token = getAccessToken() || '';
    return new EventSource(`${BASE_URL}${path}?token=${encodeURIComponent(token)}`);
  }
};
