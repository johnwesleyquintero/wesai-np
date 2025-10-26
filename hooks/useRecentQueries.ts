import { useState, useCallback } from 'react';

const RECENT_QUERIES_KEY = 'wesai-recent-queries';
const MAX_QUERIES = 5;

const getQueriesFromStorage = (): string[] => {
    try {
        const item = localStorage.getItem(RECENT_QUERIES_KEY);
        if (item) {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (error) {
        console.error("Failed to parse recent queries from localStorage", error);
    }
    return [];
};

export const useRecentQueries = () => {
    const [queries, setQueries] = useState<string[]>(getQueriesFromStorage);

    const addQuery = useCallback((query: string) => {
        if (!query || query.length < 3) return;

        setQueries(prevQueries => {
            // Remove the query if it already exists to move it to the front
            const filtered = prevQueries.filter(q => q.toLowerCase() !== query.toLowerCase());
            // Add the new query to the front
            const newQueries = [query, ...filtered];
            // Limit the number of queries
            const finalQueries = newQueries.slice(0, MAX_QUERIES);

            try {
                localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(finalQueries));
            } catch (error) {
                 console.error("Failed to save recent queries to localStorage", error);
            }

            return finalQueries;
        });
    }, []);

    return { queries, addQuery };
};
