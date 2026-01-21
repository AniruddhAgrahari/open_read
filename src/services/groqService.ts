export const analyzeTextWithGroq = async (text: string, context: string, apiKey: string) => {
    if (!apiKey) throw new Error('Groq API Key is missing. Please enter it in the sidebar.');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional research assistant. Analyze the selected text within its surrounding context. Provide a concise, deep explanation (max 150 words). Format with markdown.'
                },
                {
                    role: 'user',
                    content: `Context: ${context}\n\nSelected Text: "${text}"\n\nPlease provide a deep dive analysis.`
                }
            ],
            temperature: 0.5,
            max_tokens: 500,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};
