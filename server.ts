import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization for Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// ----------------------------------------------------
// AI Product Generation API Endpoint
// ----------------------------------------------------
app.post('/api/ai/generate-product', async (req, res) => {
  try {
    const { prompt, category, targetMarket } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required.' });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a premier B2B Product Catalog & Industrial Copywriter. 
Generate a professional, high-converting B2B product listing tailored for bulk buyers, industrial procurement managers, wholesalers, and international importers.
Respond with structured JSON adhering strictly to the schema provided.`;

    const userPrompt = `Product input notes: "${prompt}"
Category context: "${category || 'Industrial / B2B Wholesale'}"
Target Market: "${targetMarket || 'Global B2B Wholesalers, Contractors, and OEM Purchasers'}"

Generate:
1. A punchy, precise B2B product title with key technical parameters (size/grade/rating).
2. A comprehensive, technical, persuasive B2B product description focusing on industrial performance, standards compliance (e.g. ISO/ASTM/ANSI/DIN), longevity, and commercial value.
3. 4 to 6 compelling key features / selling points.
4. 5 to 7 structured technical specifications (key-value pairs like Material, Pressure Rating, Temperature Range, Finish, Warranty, Packaging, Compliance).
5. 6 to 10 high-value B2B search keywords and procurement buyer queries.
6. Suggested standard wholesale unit (e.g., Piece, Meter, Box, Set, Ton, Roll).
7. Suggested minimum order quantity (MOQ) typical for this item.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            keyFeatures: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            specifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ['key', 'value'],
              },
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedUnit: { type: Type.STRING },
            suggestedMoq: { type: Type.NUMBER },
          },
          required: ['title', 'description', 'keyFeatures', 'specifications', 'keywords'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Gemini API generation error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate product copy using Gemini AI.',
    });
  }
});

// ----------------------------------------------------
// Health Check Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// ----------------------------------------------------
// Vite Middleware / Static Asset Ingestion
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`B2B SaaS Multi-Tenant Server running on port ${PORT}`);
  });
}

startServer();
