// netlify/functions/gemini-proxy.js

exports.handler = async function(event, context) {
    // 1. Verifica se o método é POST. Apenas aceitamos requisições POST.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. Extrai o "prompt" do corpo da requisição enviada pela página.
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: 'Bad Request: prompt is required' };
        }

        // 3. Pega a sua Chave da API Gemini das variáveis de ambiente do Netlify.
        //    Esta é a parte segura. A chave NUNCA fica no código do site.
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: 'Server error: API key not configured.' };
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

        // 4. Monta o corpo da requisição para a API do Google, exatamente como faríamos no front-end.
        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        // 5. Faz a chamada real para a API do Google a partir do servidor da Netlify.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Google API Error:', errorBody);
            return { statusCode: response.status, body: `Google API Error: ${errorBody}` };
        }

        const data = await response.json();

        // 6. Extrai o texto da resposta da IA.
        const text = data.candidates[0]?.content?.parts[0]?.text || "Não foi possível obter uma resposta.";

        // 7. Retorna o texto para a página que fez a chamada.
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        };

    } catch (error) {
        console.error('Proxy Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch from Gemini API' })
        };
    }
};
