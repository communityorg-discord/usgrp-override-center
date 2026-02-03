import { useState, useCallback } from 'react';

export function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchApi = useCallback(async (endpoint, options = {}) => {
        setLoading(true);
        setError(null);

        // MOCK INTERCEPTION for Feature #14 (Live Map)
        if (endpoint.startsWith('/override/map/')) {
            await new Promise(resolve => setTimeout(resolve, 600)); // Simulate latency
            setLoading(false);
            if (endpoint === '/override/map/properties') return getMockProperties();
            if (endpoint === '/override/map/territories') return getMockTerritories();
        }

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

            // Check content type before parsing
            const contentType = response.headers.get('content-type') || '';
            let data;
            
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                // If it's HTML, extract error message
                if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                    const match = text.match(/<pre>([^<]+)<\/pre>/);
                    throw new Error(match ? match[1] : 'Server returned HTML instead of JSON');
                }
                data = { error: text };
            }

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

// Mock Data Generators for Live Map
function getMockProperties() {
    const properties = [];
    const types = ['Residential', 'Commercial', 'Government'];
    const statuses = ['owned', 'for_sale', 'owned', 'owned', 'for_sale']; // weight owned higher
    const gangNames = ['Ballaz', 'Vagos', 'Families', null, null, null];

    for (let i = 0; i < 60; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const status = type === 'Government' ? 'government' : statuses[Math.floor(Math.random() * statuses.length)];
        const hasOwner = status === 'owned';
        
        properties.push({
            id: `prop_${i}`,
            x: Math.floor(Math.random() * 1800) + 100,
            y: Math.floor(Math.random() * 1800) + 100,
            type: type,
            status: status,
            address: `${Math.floor(Math.random() * 9999)} ${['Grove St', 'Vinewood Blvd', 'Sinner St', 'Alta St', 'Davis Ave'][Math.floor(Math.random() * 5)]}`,
            value: Math.floor(Math.random() * 5000000) + 50000,
            purchaseDate: hasOwner ? new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0] : null,
            owner: hasOwner ? {
                id: `usr_${Math.floor(Math.random() * 1000)}`,
                name: ['BigSmoke', 'Ryder', 'Sweet', 'CJ', 'Tenpenny', 'Vercetti'][Math.floor(Math.random() * 6)] + Math.floor(Math.random()*100),
                gang: gangNames[Math.floor(Math.random() * gangNames.length)]
            } : null
        });
    }
    return properties;
}

function getMockTerritories() {
    return [
        {
            name: 'Ballaz',
            color: '#A855F7', // Purple
            members: 42,
            labelX: 1400,
            labelY: 1400,
            path: "M 1200 1200 L 1600 1200 L 1600 1600 L 1200 1600 Z"
        },
        {
            name: 'Families',
            color: '#22C55E', // Green
            members: 38,
            labelX: 600,
            labelY: 1400,
            path: "M 400 1200 L 800 1200 L 900 1500 L 500 1600 Z"
        },
        {
            name: 'Vagos',
            color: '#EAB308', // Yellow
            members: 25,
            labelX: 1500,
            labelY: 500,
            path: "M 1300 300 L 1700 300 L 1700 700 L 1300 700 Z"
        }
    ];
}
