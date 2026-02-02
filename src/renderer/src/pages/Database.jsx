import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Database() {
    const { fetchApi, loading } = useApi();
    
    // Data states
    const [databases, setDatabases] = useState([]);
    const [selectedDb, setSelectedDb] = useState('');
    const [tables, setTables] = useState([]);
    
    // Query states
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);

    // Modal state
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingQuery, setPendingQuery] = useState(null);

    // Initial load
    useEffect(() => {
        loadDatabases();
    }, []);

    // Load tables when DB changes
    useEffect(() => {
        if (selectedDb) {
            loadTables();
            setTables([]);
            setSelectedTable(null);
            setResults(null);
            setError(null);
        }
    }, [selectedDb]);

    async function loadDatabases() {
        try {
            const data = await fetchApi('/override/db/list');
            if (data?.databases) {
                setDatabases(data.databases);
                if (data.databases.length > 0 && !selectedDb) {
                    setSelectedDb(data.databases[0]);
                }
            }
        } catch (err) {
            console.error('Failed to load databases:', err);
            setError('Failed to load database list');
        }
    }

    async function loadTables() {
        try {
            const data = await fetchApi(`/override/db/tables?dbName=${selectedDb}`);
            if (data?.tables) {
                setTables(data.tables);
            }
        } catch (err) {
            console.error('Failed to load tables:', err);
        }
    }

    function handleRunClick() {
        if (!query.trim()) return;
        
        const q = query.trim().toUpperCase();
        if (q.includes('DROP') || q.includes('DELETE')) {
            setPendingQuery(query);
            setShowConfirm(true);
        } else {
            executeQuery(query);
        }
    }

    async function executeQuery(sql) {
        setError(null);
        setResults(null);
        
        try {
            const data = await fetchApi('/override/db/query', {
                method: 'POST',
                body: JSON.stringify({
                    dbName: selectedDb,
                    sql: sql
                })
            });

            setResults(data);
            
            // Add to history
            setHistory(prev => {
                const newHistory = [sql, ...prev].filter((item, index, self) => self.indexOf(item) === index);
                return newHistory.slice(0, 5);
            });
        } catch (err) {
            setError(err.message || 'Query failed');
        }
    }

    function selectTable(table) {
        setSelectedTable(table);
        const sql = `SELECT * FROM ${table} LIMIT 50`;
        setQuery(sql);
        executeQuery(sql);
    }

    return (
        <div className="h-full flex flex-col relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Database Browser</h1>
                    <p className="text-gray-400 mt-1">Query SQLite databases directly</p>
                </div>
                
                {/* Database selector */}
                <select
                    value={selectedDb}
                    onChange={(e) => setSelectedDb(e.target.value)}
                    className="input w-48 bg-gray-800 border-gray-700 text-white"
                >
                    {databases.map(db => (
                        <option key={db} value={db}>{db}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {/* Tables sidebar */}
                <div className="w-48 flex-shrink-0 flex flex-col gap-4">
                    <div className="card p-0 flex-1 overflow-hidden flex flex-col">
                        <div className="p-2 bg-gray-800/50">
                            <span className="text-xs text-gray-500 uppercase font-medium">Tables</span>
                        </div>
                        <div className="overflow-auto flex-1">
                            {tables.map(table => (
                                <button
                                    key={table}
                                    onClick={() => selectTable(table)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors truncate ${
                                        selectedTable === table ? 'bg-amber-500/20 text-amber-400' : 'text-gray-300'
                                    }`}
                                    title={table}
                                >
                                    🗃️ {table}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* History */}
                    <div className="card p-0 h-48 overflow-hidden flex flex-col">
                        <div className="p-2 bg-gray-800/50">
                            <span className="text-xs text-gray-500 uppercase font-medium">History</span>
                        </div>
                        <div className="overflow-auto flex-1">
                            {history.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setQuery(h);
                                        executeQuery(h);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-800 transition-colors truncate border-b border-gray-800 last:border-0 font-mono"
                                    title={h}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Area */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Query input */}
                    <div className="mb-4">
                        <div className="flex gap-2">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="SELECT * FROM table_name LIMIT 50"
                                className="input flex-1 h-24 font-mono text-sm resize-none bg-gray-900 border-gray-700 text-gray-200"
                            />
                            <button
                                onClick={handleRunClick}
                                disabled={loading || !query.trim()}
                                className="btn btn-primary self-end h-24 w-24 flex flex-col items-center justify-center gap-2"
                            >
                                <span className="text-xl">▶️</span>
                                <span>Run</span>
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-400 font-mono">{error}</p>
                        </div>
                    )}

                    {/* Results */}
                    <div className="flex-1 card p-0 overflow-hidden flex flex-col bg-gray-900 border-gray-800">
                        {results ? (
                            <>
                                <div className="p-2 bg-gray-800/50 flex justify-between items-center border-b border-gray-800">
                                    <span className="text-xs text-gray-400 font-mono">
                                        {results.type === 'SELECT' 
                                            ? `${results.rowCount} rows found`
                                            : `Query executed successfully. Changes: ${results.changes}`}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {results.database}
                                    </span>
                                </div>
                                
                                <div className="flex-1 overflow-auto">
                                    {results.rows && results.rows.length > 0 ? (
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="sticky top-0 bg-gray-800 z-10 shadow-sm">
                                                <tr>
                                                    {Object.keys(results.rows[0]).map(col => (
                                                        <th key={col} className="text-left p-3 text-gray-400 font-medium text-xs uppercase tracking-wider border-b border-gray-700 whitespace-nowrap bg-gray-800">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {results.rows.map((row, i) => (
                                                    <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                                                        {Object.values(row).map((val, j) => (
                                                            <td key={j} className="p-2 text-gray-300 font-mono text-xs max-w-xs truncate border-r border-gray-800/50 last:border-0">
                                                                {val === null ? <span className="text-gray-600 italic">NULL</span> : String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                                            <span className="text-2xl">📝</span>
                                            <span>No results to display</span>
                                            {results.type === 'WRITE' && (
                                                <span className="text-xs text-green-500">Operation completed successfully</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600">
                                Select a table or run a query to see results
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-red-400 mb-2">⚠️ Destructive Query</h3>
                        <p className="text-gray-300 mb-4">
                            You are about to execute a destructive query (DROP/DELETE). 
                            This action cannot be undone.
                        </p>
                        <div className="bg-black/50 p-3 rounded mb-6 border border-gray-800">
                            <code className="text-sm font-mono text-red-300 break-all">
                                {pendingQuery}
                            </code>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    setPendingQuery(null);
                                }}
                                className="btn bg-gray-800 hover:bg-gray-700 text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    executeQuery(pendingQuery);
                                    setShowConfirm(false);
                                    setPendingQuery(null);
                                }}
                                className="btn bg-red-600 hover:bg-red-700 text-white border-none"
                            >
                                Confirm Execute
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
