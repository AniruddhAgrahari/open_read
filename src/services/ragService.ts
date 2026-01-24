import { ChatMessage } from '../store/useChatStore';

// Simple text chunking for document context
export const chunkText = (text: string, chunkSize: number = 500, overlap: number = 50): string[] => {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end).trim());
        start += chunkSize - overlap;
    }

    return chunks.filter(chunk => chunk.length > 20);
};

// Simple keyword-based relevance scoring (lightweight alternative to embeddings)
const getRelevanceScore = (query: string, text: string): number => {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const textLower = text.toLowerCase();

    let score = 0;
    for (const word of queryWords) {
        if (textLower.includes(word)) {
            score += 1;
            // Bonus for exact phrase match
            if (textLower.includes(query.toLowerCase())) {
                score += 2;
            }
        }
    }

    return score;
};

// Retrieve top-k relevant chunks from document
export const retrieveRelevantChunks = (
    query: string,
    documentText: string,
    topK: number = 5
): string[] => {
    const chunks = chunkText(documentText);

    const scoredChunks = chunks.map(chunk => ({
        chunk,
        score: getRelevanceScore(query, chunk)
    }));

    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks
        .slice(0, topK)
        .filter(sc => sc.score > 0)
        .map(sc => sc.chunk);
};

// Web search using Google Custom Search API
export const searchWeb = async (query: string, apiKey?: string, cx?: string): Promise<Array<{ title: string; snippet: string; url: string }>> => {
    if (!apiKey) {
        console.warn('No API key provided for web search');
        return [];
    }

    if (!cx) {
        console.warn('No Search Engine ID (cx) provided for web search');
        return [];
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`
        );

        if (!response.ok) {
            throw new Error('Search API failed');
        }

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            title: item.title,
            snippet: item.snippet,
            url: item.link
        }));
    } catch (err) {
        console.error('Web search failed:', err);
        return [];
    }
};

// Build the RAG prompt
export const buildRagPrompt = (
    userQuery: string,
    documentContext: string[],
    webContext: Array<{ title: string; snippet: string; url: string }>,
    isWebEnabled: boolean
): string => {
    let systemPrompt = `You are a helpful AI assistant for the Neura PDF reader. `;

    if (!isWebEnabled) {
        systemPrompt += `
        [IDENTITY]
        You are the "Neura Document Specialist". Your expertise is limited to the provided Document Context.

        [OBJECTIVE]
        Analyze and answer queries using ONLY the Document Context. Avoid external knowledge.

        [STRICT RULES]
        1. Grounding: If the answer isn't in the provided text, state: "This information is not available in the document."
        2. Citations: Use [Doc 1], [Doc 2], etc., for every claim.
        3. Tone: Precise, analytical, and objective.`;
    } else {
        systemPrompt += `
        [IDENTITY]
        You are the "Neura Research Intelligence". You have dual-access to the Document Context and the Live Web.

        [OBJECTIVE]
        Synthesize a high-precision response using both internal (Document) and external (Web) data.

        [DATA PRIORITIZATION]
        - DOCUMENT-FIRST: For questions about the file's specific content, the document is the ground truth.
        - WEB-ENHANCED: Use web results for current events, technical definitions, or broader context missing from the file.
        - CONFLICT RESOLUTION: If the document contradicts the web (e.g., outdated PDF vs. new law), highlight the discrepancy: "The document (p.X) indicates A, but live search [Web 1] shows B."

        [STRICT RULES]
        1. Mandatory Citations: Use [Doc X] or [Web X] for EVERYTHING.
        2. Transparency: When using web data, explicitly state "Based on real-time search results...".
        3. No Hallucination: If information is missing from both, say so. Do not invent details.
        4. Performance: Format with clean Markdown headers and bullet points.`;
    }

    let contextSection = '\n\n## Document Context:\n';
    if (documentContext.length > 0) {
        documentContext.forEach((chunk, i) => {
            contextSection += `[Doc ${i + 1}] ${chunk}\n\n`;
        });
    } else {
        contextSection += '(No relevant document sections found)\n';
    }

    if (isWebEnabled && webContext.length > 0) {
        contextSection += '\n## Web Search Results:\n';
        webContext.forEach((result, i) => {
            contextSection += `[Web ${i + 1}] ${result.title}: ${result.snippet} (Source: ${result.url})\n\n`;
        });
    }

    return `${systemPrompt}${contextSection}\n\nUser Question: ${userQuery}`;
};

// Chat with the AI using Groq
export const chatWithAI = async (
    prompt: string,
    apiKey: string
): Promise<string> => {
    if (!apiKey) {
        throw new Error('Groq API Key is missing. Please enter it in settings.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

// Save chat message to localStorage/SQLite
export const saveChatMessage = async (fileId: string, message: ChatMessage) => {
    const CHAT_STORAGE_KEY = 'neura_chat_messages';

    try {
        const existing = localStorage.getItem(CHAT_STORAGE_KEY);
        const allChats: Record<string, ChatMessage[]> = existing ? JSON.parse(existing) : {};

        if (!allChats[fileId]) {
            allChats[fileId] = [];
        }

        allChats[fileId].push(message);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allChats));
    } catch (err) {
        console.error('Failed to save chat message:', err);
    }
};

// Load chat messages for a file
export const loadChatMessages = (fileId: string): ChatMessage[] => {
    const CHAT_STORAGE_KEY = 'neura_chat_messages';

    try {
        const existing = localStorage.getItem(CHAT_STORAGE_KEY);
        const allChats: Record<string, ChatMessage[]> = existing ? JSON.parse(existing) : {};
        return allChats[fileId] || [];
    } catch {
        return [];
    }
};
