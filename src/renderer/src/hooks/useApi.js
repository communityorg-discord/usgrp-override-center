import { useState, useCallback } from 'react';

export function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchApi = useCallback(async (endpoint, options = {}) => {
        setLoading(true);
        setError(null);

        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const impersonateUser = localStorage.getItem('impersonateUser');

            const headers = {
                'Content-Type': 'application/json',
                'X-Override-Token': token,
                ...options.headers
            };

            if (impersonateUser) {
                headers['x-impersonate-user'] = impersonateUser;
            }

            const response = await fetch(`${apiBase}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Request failed');
            }

            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const post = useCallback((endpoint, body) => {
        return fetchApi(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }, [fetchApi]);

    const put = useCallback((endpoint, body) => {
        return fetchApi(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }, [fetchApi]);

    return { fetchApi, post, put, loading, error };
}
