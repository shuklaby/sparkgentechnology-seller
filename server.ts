import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  initializeInitialUsers,
  findUserByEmail,
  findUserById,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  getAllUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  recordLoginSuccess,
  sanitizeUser
} from './server/authStore';

dotenv.config();

// Seed initial admin and demo users
initializeInitialUsers();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------
// Authentication & Role Middleware
// ----------------------------------------------------
interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: 'ADMIN' | 'EMPLOYEE' | 'SELLER';
    status: 'ACTIVE' | 'INACTIVE';
    sellerId?: string;
  };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  // Check if user still exists and is active in DB
  const user = findUserById(session.uid);
  if (!user || user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Your account is deactivated or no longer exists.' });
  }

  req.user = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    status: user.status,
    sellerId: user.sellerId,
  };

  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

// ----------------------------------------------------
// Auth Endpoints
// ----------------------------------------------------

// 1. User / Admin Login (Email/User ID + Password)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/User ID and password are required.' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      // Generic error to prevent enumeration
      return res.status(401).json({ error: 'Invalid Email/User ID or Password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Your account has been deactivated. Please contact an administrator for assistance.',
      });
    }

    const isMatch = verifyPassword(password, user.passwordHash, user.salt);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Email/User ID or Password.' });
    }

    recordLoginSuccess(user.uid);
    const sanitized = sanitizeUser(user);
    const token = createSessionToken(sanitized);

    return res.json({
      success: true,
      token,
      user: sanitized,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected authentication error occurred.' });
  }
});

// 2. Verify Active Session
app.get('/api/auth/session', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = findUserById(req.user!.uid);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  return res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

// 3. Forgot Password Request
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Security best practice: Always return generic success message without leaking account existence
    return res.json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been dispatched.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// ----------------------------------------------------
// User Management Endpoints (Admin Protected)
// ----------------------------------------------------

// 1. List all users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = getAllUsers();
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve users.' });
  }
});

// 2. Create User (Admin only)
app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { displayName, email, password, role, status, mobileNumber, sellerId } = req.body;

    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid Email/User ID is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!['ADMIN', 'EMPLOYEE', 'SELLER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified. Must be ADMIN, EMPLOYEE, or SELLER.' });
    }

    const created = createUser({
      displayName,
      email,
      password,
      role: role || 'SELLER',
      status: status || 'ACTIVE',
      mobileNumber,
      sellerId,
    });

    return res.status(201).json({ success: true, user: created });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create user.' });
  }
});

// 3. Update User (Admin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, mobileNumber, role, status, sellerId } = req.body;

    const updated = updateUser(id, {
      displayName,
      mobileNumber,
      role,
      status,
      sellerId,
    });

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update user.' });
  }
});

// 4. Reset User Password (Admin only)
app.post('/api/users/:id/reset-password', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    resetUserPassword(id, newPassword);
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to reset password.' });
  }
});

// 5. Delete User (Admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    deleteUser(id);
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete user.' });
  }
});

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
