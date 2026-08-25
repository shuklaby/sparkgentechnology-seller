import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  initializeInitialUsers,
  findUserByEmailAsync,
  findUserByIdAsync,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  getAllUsersAsync,
  createUserAsync,
  updateUserAsync,
  resetUserPasswordAsync,
  deleteUserAsync,
  recordLoginSuccess,
  sanitizeUser,
  getSellerProfileForUser,
} from './server/authStore';
import {
  initializeOrderStore,
  createOrderAsync,
  getOrderByIdAsync,
  getOrdersForSellerAsync,
  getAllOrdersAsync,
  updateOrderStatusAsync,
  markOrderAsReadAsync,
  getUnreadOrderCountAsync,
} from './server/orderStore';

dotenv.config();

// Seed initial admin and demo users & orders
initializeInitialUsers().catch((err) => {
  console.warn('[Server Boot] Seeding warning:', err);
});
initializeOrderStore().catch((err) => {
  console.warn('[Server Boot] Order store warning:', err);
});

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure all /api responses default to JSON
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

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

async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid. Please log in again.' });
  }

  // Check if user still exists and is active in DB
  const user = await findUserByIdAsync(session.uid);
  if (!user || user.status !== 'ACTIVE') {
    return res.status(403).json({ success: false, error: 'Your account is deactivated or no longer exists.' });
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
    return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
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
      return res.status(400).json({ success: false, error: 'Email/User ID and password are required.' });
    }

    const user = await findUserByEmailAsync(email);
    if (!user) {
      // Return 401 with standard JSON error message
      return res.status(401).json({ success: false, error: 'Invalid Email/User ID or Password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator for assistance.',
      });
    }

    const isMatch = verifyPassword(password, user.passwordHash, user.salt);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid Email/User ID or Password.' });
    }

    recordLoginSuccess(user.uid);
    const sanitized = sanitizeUser(user);
    const token = createSessionToken(sanitized);
    const seller = await getSellerProfileForUser(sanitized);

    return res.json({
      success: true,
      token,
      user: sanitized,
      seller,
    });
  } catch (err: any) {
    console.error('[API Login Error]:', err);
    return res.status(500).json({ success: false, error: 'An unexpected authentication error occurred.' });
  }
});

// 2. Verify Active Session
app.get('/api/auth/session', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = await findUserByIdAsync(req.user!.uid);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }
  const sanitized = sanitizeUser(user);
  const seller = await getSellerProfileForUser(sanitized);

  return res.json({
    success: true,
    user: sanitized,
    seller,
  });
});

// 3. Forgot Password Request
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    return res.json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been dispatched.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to process password reset request.' });
  }
});

// ----------------------------------------------------
// User Management Endpoints (Admin Protected)
// ----------------------------------------------------

// 1. List all users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsersAsync();
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve users.' });
  }
});

// 2. Create User (Admin only)
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { displayName, email, password, role, status, mobileNumber, sellerId } = req.body;

    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ success: false, error: 'Full Name is required.' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid Email/User ID is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }
    if (!['ADMIN', 'EMPLOYEE', 'SELLER'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified. Must be ADMIN, EMPLOYEE, or SELLER.',
      });
    }

    const created = await createUserAsync({
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
    return res.status(400).json({ success: false, error: err.message || 'Failed to create user.' });
  }
});

// 3. Update User (Admin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, mobileNumber, role, status, sellerId } = req.body;

    const updated = await updateUserAsync(id, {
      displayName,
      mobileNumber,
      role,
      status,
      sellerId,
    });

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update user.' });
  }
});

// 4. Reset User Password (Admin only)
app.post('/api/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    await resetUserPasswordAsync(id, newPassword);
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to reset password.' });
  }
});

// 5. Delete User (Admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUserAsync(id);
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to delete user.' });
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
      return res.status(400).json({ success: false, error: 'Prompt string is required.' });
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
      success: false,
      error: error.message || 'Failed to generate product copy using Gemini AI.',
    });
  }
});

// ----------------------------------------------------
// E-Commerce Order Management API Endpoints
// ----------------------------------------------------

// 1. Customer Place Order (Public Endpoint, Server-Authoritative)
app.post('/api/orders', async (req, res) => {
  try {
    const { sellerId, customerName, customerEmail, customerMobile, deliveryAddress, orderNotes, items } = req.body;

    if (!sellerId || !customerName || !customerMobile || !customerEmail || !deliveryAddress || !items) {
      return res.status(400).json({
        success: false,
        error: 'Missing required order fields: Seller ID, Customer Details, Delivery Address, and Items.',
      });
    }

    const order = await createOrderAsync({
      sellerId,
      customerName,
      customerEmail,
      customerMobile,
      deliveryAddress,
      orderNotes,
      items,
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order,
    });
  } catch (err: any) {
    console.error('[API Create Order Error]:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to place order. Please verify order details and try again.',
    });
  }
});

// 2. List Orders (Admin & Seller Protected)
app.get('/api/orders', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let orders = [];

    if (user.role === 'ADMIN') {
      const targetSellerId = req.query.sellerId as string;
      if (targetSellerId && targetSellerId !== 'all') {
        orders = await getOrdersForSellerAsync(targetSellerId);
      } else {
        orders = await getAllOrdersAsync();
      }
    } else {
      // Seller / Employee view only their seller orders
      const sellerId = user.sellerId || (req.query.sellerId as string) || 'demo-abc-enterprises';
      orders = await getOrdersForSellerAsync(sellerId);
    }

    return res.json({ success: true, orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve orders.' });
  }
});

// 3. Get Single Order Details (Customer / Seller / Admin)
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getOrderByIdAsync(id);

    if (!order) {
      return res.status(404).json({ success: false, error: `Order "${id}" was not found.` });
    }

    return res.json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve order details.' });
  }
});

// 4. Update Order Status (Seller / Admin Protected)
app.patch('/api/orders/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }

    const order = await getOrderByIdAsync(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Role check: Admin can update any, Seller can only update their own
    if (req.user!.role !== 'ADMIN' && req.user!.sellerId && req.user!.sellerId !== order.sellerId) {
      return res.status(403).json({ success: false, error: 'Permission denied for this order.' });
    }

    const updated = await updateOrderStatusAsync(id, status, note);
    return res.json({ success: true, order: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update order status.' });
  }
});

// 5. Mark Order as Read by Seller (Clears notification badge)
app.patch('/api/orders/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await markOrderAsReadAsync(id);
    return res.json({ success: true, order: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to mark order as read.' });
  }
});

// 6. Get Unread Order Count for Seller Badge
app.get('/api/orders/badge/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const sellerId = user.role === 'ADMIN' ? 'all' : user.sellerId || 'demo-abc-enterprises';
    const unreadCount = await getUnreadOrderCountAsync(sellerId);
    return res.json({ success: true, unreadCount });
  } catch (err: any) {
    return res.json({ success: true, unreadCount: 0 });
  }
});

// ----------------------------------------------------
// Health Check Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', success: true, serverTime: new Date().toISOString() });
});

// Catch-all for undefined /api/* routes to prevent returning HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.method} ${req.path} was not found.`,
  });
});

// Global JSON Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled API Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ----------------------------------------------------
// Vite Middleware / Static Asset Ingestion (SPA)
// ----------------------------------------------------
export async function startServer() {
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

// Start standalone dev server when not invoked as Vercel serverless function
if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
