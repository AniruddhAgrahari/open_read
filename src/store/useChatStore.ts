import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    sources?: Array<{
        type: 'document' | 'web';
        text: string;
        url?: string;
    }>;
}

interface ChatState {
    isChatOpen: boolean;
    isWebSearchEnabled: boolean;
    messages: Record<string, ChatMessage[]>; // keyed by file_id
    isLoading: boolean;

    openChat: () => void;
    closeChat: () => void;
    toggleChat: () => void;
    toggleWebSearch: () => void;
    addMessage: (fileId: string, message: ChatMessage) => void;
    clearMessages: (fileId: string) => void;
    setLoading: (loading: boolean) => void;
    getMessages: (fileId: string) => ChatMessage[];
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            isChatOpen: false,
            isWebSearchEnabled: false,
            messages: {},
            isLoading: false,

            openChat: () => set({ isChatOpen: true }),
            closeChat: () => set({ isChatOpen: false }),
            toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
            toggleWebSearch: () => set((state) => ({ isWebSearchEnabled: !state.isWebSearchEnabled })),

            addMessage: (fileId, message) => set((state) => ({
                messages: {
                    ...state.messages,
                    [fileId]: [...(state.messages[fileId] || []), message]
                }
            })),

            clearMessages: (fileId) => set((state) => ({
                messages: {
                    ...state.messages,
                    [fileId]: []
                }
            })),

            setLoading: (isLoading) => set({ isLoading }),

            getMessages: (fileId) => get().messages[fileId] || []
        }),
        {
            name: 'neura-chat-storage'
        }
    )
);
