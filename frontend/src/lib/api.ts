const API_BASE = 'http://localhost:3000/api';

let accessToken = '';

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token: string) {
    accessToken = token;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    options.credentials = 'include';

    let res = await fetch(url, options);

    if (res.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && endpoint !== '/auth/signup') {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            setAccessToken(data.accessToken);
            
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`
            };
            res = await fetch(url, options);
        } else {
            setAccessToken('');
            throw new Error("Session expired, please log in again.");
        }
    }

    return res;
}
