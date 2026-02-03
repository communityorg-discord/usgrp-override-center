import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const SessionRecordingContext = createContext();

export function useSessionRecording() {
    return useContext(SessionRecordingContext);
}

export function SessionRecordingProvider({ children }) {
    const [isRecording, setIsRecording] = useState(false);
    const [events, setEvents] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [recordings, setRecordings] = useState([]);
    
    useEffect(() => {
        // Load saved recordings
        const saved = localStorage.getItem('session-recordings');
        if (saved) {
            try {
                setRecordings(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);
    
    const startRecording = useCallback(() => {
        setEvents([]);
        setStartTime(Date.now());
        setIsRecording(true);
        
        // Add initial event
        setEvents([{
            type: 'start',
            timestamp: 0,
            data: { url: window.location.hash }
        }]);
    }, []);
    
    const stopRecording = useCallback((name) => {
        setIsRecording(false);
        const recording = {
            id: Date.now().toString(),
            name: name || `Recording ${new Date().toLocaleString()}`,
            duration: Date.now() - startTime,
            events: events,
            createdAt: new Date().toISOString()
        };
        
        const newRecordings = [...recordings, recording];
        setRecordings(newRecordings);
        localStorage.setItem('session-recordings', JSON.stringify(newRecordings));
        
        return recording;
    }, [events, recordings, startTime]);
    
    const recordEvent = useCallback((type, data) => {
        if (!isRecording) return;
        
        setEvents(prev => [...prev, {
            type,
            timestamp: Date.now() - startTime,
            data
        }]);
    }, [isRecording, startTime]);
    
    const deleteRecording = useCallback((id) => {
        const newRecordings = recordings.filter(r => r.id !== id);
        setRecordings(newRecordings);
        localStorage.setItem('session-recordings', JSON.stringify(newRecordings));
    }, [recordings]);
    
    // Record navigation changes
    useEffect(() => {
        const handleHashChange = () => {
            recordEvent('navigate', { url: window.location.hash });
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [recordEvent]);
    
    // Record clicks
    useEffect(() => {
        if (!isRecording) return;
        
        const handleClick = (e) => {
            const target = e.target;
            const selector = getSelector(target);
            recordEvent('click', {
                selector,
                text: target.innerText?.slice(0, 50),
                tagName: target.tagName,
                x: e.clientX,
                y: e.clientY
            });
        };
        
        document.addEventListener('click', handleClick, true);
        return () => document.removeEventListener('click', handleClick, true);
    }, [isRecording, recordEvent]);
    
    return (
        <SessionRecordingContext.Provider value={{
            isRecording,
            startRecording,
            stopRecording,
            recordEvent,
            recordings,
            deleteRecording,
            currentEvents: events
        }}>
            {children}
            {isRecording && <RecordingIndicator eventCount={events.length} />}
        </SessionRecordingContext.Provider>
    );
}

function RecordingIndicator({ eventCount }) {
    return (
        <div className="fixed top-16 right-4 z-[9999] flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full animate-ping" />
            Recording ({eventCount} events)
        </div>
    );
}

// Session Replay Player
export function SessionReplayPlayer({ recording, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    
    useEffect(() => {
        if (!isPlaying || currentIndex >= recording.events.length - 1) return;
        
        const currentEvent = recording.events[currentIndex];
        const nextEvent = recording.events[currentIndex + 1];
        const delay = (nextEvent.timestamp - currentEvent.timestamp) / speed;
        
        const timer = setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            
            // Execute replay action
            if (nextEvent.type === 'navigate') {
                window.location.hash = nextEvent.data.url;
            }
        }, delay);
        
        return () => clearTimeout(timer);
    }, [isPlaying, currentIndex, recording.events, speed]);
    
    const currentEvent = recording.events[currentIndex];
    const progress = (currentIndex / (recording.events.length - 1)) * 100;
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">▶️ Replay: {recording.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">×</button>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gold transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Event {currentIndex + 1} / {recording.events.length}</span>
                        <span>{Math.round((currentEvent?.timestamp || 0) / 1000)}s</span>
                    </div>
                </div>
                
                {/* Current Event */}
                <div className="bg-white/5 rounded-lg p-4 mb-4">
                    <div className="text-xs text-gray-500 mb-1">Current Event</div>
                    <div className="font-mono text-sm text-white">
                        {currentEvent?.type}: {JSON.stringify(currentEvent?.data).slice(0, 80)}
                    </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setCurrentIndex(0)}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                    >
                        ⏮
                    </button>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-black text-xl hover:scale-105 transition-transform"
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button
                        onClick={() => setCurrentIndex(Math.min(currentIndex + 1, recording.events.length - 1))}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                    >
                        ⏭
                    </button>
                </div>
                
                {/* Speed Control */}
                <div className="flex items-center justify-center gap-2 mt-4">
                    <span className="text-xs text-gray-500">Speed:</span>
                    {[0.5, 1, 2, 4].map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`px-2 py-1 text-xs rounded ${speed === s ? 'bg-gold text-black' : 'bg-white/10 text-gray-400'}`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Recording Manager Component
export function RecordingManager() {
    const { isRecording, startRecording, stopRecording, recordings, deleteRecording } = useSessionRecording();
    const [showStopDialog, setShowStopDialog] = useState(false);
    const [recordingName, setRecordingName] = useState('');
    const [playingRecording, setPlayingRecording] = useState(null);
    
    const handleStop = () => {
        stopRecording(recordingName);
        setShowStopDialog(false);
        setRecordingName('');
    };
    
    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3">
                {isRecording ? (
                    <button
                        onClick={() => setShowStopDialog(true)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Stop Recording
                    </button>
                ) : (
                    <button
                        onClick={startRecording}
                        className="px-4 py-2 bg-gold text-black rounded-lg font-medium hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        ⏺ Start Recording
                    </button>
                )}
            </div>
            
            {/* Recordings List */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-400">Saved Recordings</h3>
                {recordings.length === 0 && (
                    <p className="text-sm text-gray-500">No recordings yet. Start recording to capture your session.</p>
                )}
                {recordings.map(rec => (
                    <div key={rec.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div>
                            <div className="text-sm font-medium text-white">{rec.name}</div>
                            <div className="text-xs text-gray-500">
                                {rec.events.length} events • {Math.round(rec.duration / 1000)}s • {new Date(rec.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPlayingRecording(rec)}
                                className="px-3 py-1 bg-gold/20 text-gold rounded text-sm hover:bg-gold/30"
                            >
                                ▶ Play
                            </button>
                            <button
                                onClick={() => deleteRecording(rec.id)}
                                className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
                            >
                                🗑
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Stop Dialog */}
            {showStopDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowStopDialog(false)} />
                    <div className="relative bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-white mb-4">Save Recording</h3>
                        <input
                            type="text"
                            value={recordingName}
                            onChange={e => setRecordingName(e.target.value)}
                            placeholder="Recording name..."
                            className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white mb-4"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setShowStopDialog(false)} className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg">
                                Cancel
                            </button>
                            <button onClick={handleStop} className="flex-1 px-4 py-2 bg-gold text-black rounded-lg font-medium">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Replay Player */}
            {playingRecording && (
                <SessionReplayPlayer recording={playingRecording} onClose={() => setPlayingRecording(null)} />
            )}
        </div>
    );
}

// Helper to get a CSS selector for an element
function getSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c && !c.includes('hover') && !c.includes('active')).slice(0, 2);
        if (classes.length) return `.${classes.join('.')}`;
    }
    return el.tagName.toLowerCase();
}

export default SessionRecordingProvider;
