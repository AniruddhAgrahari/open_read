import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AiState {
    apiKey: string;
    searchApiKey: string;
    searchEngineId: string;
    analysis: string | null;
    isLoading: boolean;
    error: string | null;
    showHistory: boolean;
    history: any[];
    activeFileId: string | null;
    setApiKey: (key: string) => void;
    setSearchApiKey: (key: string) => void;
    setSearchEngineId: (id: string) => void;
    setAnalysis: (content: string | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setShowHistory: (show: boolean) => void;
    setHistory: (history: any[]) => void;
    setActiveFileId: (fileId: string | null) => void;
}

export const useAiStore = create<AiState>()(
    persist(
        (set) => ({
            apiKey: '',
            searchApiKey: '',
            searchEngineId: '',
            analysis: null,
            isLoading: false,
            error: null,
            showHistory: false,
            history: [],
            activeFileId: null,
            setApiKey: (apiKey) => set({ apiKey }),
            setSearchApiKey: (searchApiKey) => set({ searchApiKey }),
            setSearchEngineId: (searchEngineId) => set({ searchEngineId }),
            setAnalysis: (analysis) => set({ analysis }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setShowHistory: (showHistory) => set({ showHistory }),
            setHistory: (history) => set({ history }),
            setActiveFileId: (activeFileId) => set({ activeFileId }),
        }),
        {
            name: 'pdf-ai-storage',
        }
    )
);
