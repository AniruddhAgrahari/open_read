import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AiState {
    apiKey: string;
    analysis: string | null;
    isLoading: boolean;
    error: string | null;
    setApiKey: (key: string) => void;
    setAnalysis: (content: string | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useAiStore = create<AiState>()(
    persist(
        (set) => ({
            apiKey: '',
            analysis: null,
            isLoading: false,
            error: null,
            setApiKey: (apiKey) => set({ apiKey }),
            setAnalysis: (analysis) => set({ analysis }),
            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'pdf-ai-storage',
        }
    )
);
