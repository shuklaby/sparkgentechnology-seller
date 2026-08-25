import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
} from 'firebase/firestore';
import fileConfig from '../firebase-applet-config.json';
import { Order, OrderStatus, Product } from '../src/types';
import { sendSellerOrderNotificationEmail } from './emailService';
import { sampleProducts, sampleSellerProfile, DEMO_SELLER_ID } from '../src/data/mockDemoData';

// Map & Cache
const ordersMap = new Map<string, Order>();
const LOCAL_ORDERS_FILE = path.join(process.cwd(), '.server_orders_data.json');
let orderCounter = 100;

// Disk operations
function saveOrdersToDisk(): void {
  try {
    const list = Array.from(ordersMap.values());
    fs.writeFileSync(LOCAL_ORDERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Order Store] Disk save warning:', e);
  }
}

function loadOrdersFromDisk(): void {
  try {
    if (fs.existsSync(LOCAL_ORDERS_FILE)) {
      const raw = fs.readFileSync(LOCAL_ORDERS_FILE, 'utf-8');
      const list: Order[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const order of list) {
          if (order.id) {
            ordersMap.set(order.id, order);
            const num = parseInt(order.id.split('-').pop() || '0', 10);
            if (!isNaN(num) && num >= orderCounter) {
              orderCounter = num + 1;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Order Store] Disk load warning:', e);
  }
}

// Firestore Init
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || fileConfig.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || 'spark-gen-technology.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId || 'spark-gen-technology',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || 'spark-gen-technology.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || '1068481200061',
  appId: process.env.VITE_FIREBASE_APP_ID || fileConfig.appId || '1:1068481200061:web:468b6712839ff721155cd4',
};

let db: any = null;
let isFirestoreAvailable = false;

try {
  const fbApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(fbApp);
  isFirestoreAvailable = true;
} catch {
  isFirestoreAvailable = false;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timed out')), timeoutMs)
    ),
  ]);
}

// Generate Order ID format: ORD-YYYY-XXXXXX (e.g. ORD-2026-000101)
export function generateUniqueOrderId(): string {
  const year = new Date().getFullYear();
  orderCounter += 1;
  const countStr = String(orderCounter).padStart(6, '0');
  return `ORD-${year}-${countStr}`;
}

// Initialize Initial Orders Data if empty
export async function initializeOrderStore(): Promise<void> {
  loadOrdersFromDisk();

  // If map is completely empty, create an initial demo order for ABC Enterprises so seller/admin dashboard has visible records
  if (ordersMap.size === 0) {
    const demoOrder: Order = {
      id: 'ORD-2026-000001',
      sellerId: DEMO_SELLER_ID,
      sellerName: 'ABC Enterprises',
      customerName: 'Rajesh Sharma',
      customerEmail: 'rajesh.sharma@industrialprocure.com',
      customerMobile: '+91 98234 56789',
      deliveryAddress: {
        fullName: 'Rajesh Sharma',
        mobileNumber: '+91 98234 56789',
        email: 'rajesh.sharma@industrialprocure.com',
        houseNumber: 'Unit 402, B-Wing',
        streetArea: 'Techno Park, MIDC Industrial Area',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411019',
        landmark: 'Opposite Auto Cluster Exhibition Center',
        fullAddress: 'Unit 402, B-Wing, Techno Park, MIDC Industrial Area, Opposite Auto Cluster Exhibition Center, Pune, Maharashtra - 411019',
      },
      orderNotes: 'Urgent delivery required for upcoming refinery maintenance overhaul.',
      items: [
        {
          productId: 'prod-industrial-valve',
          productName: 'Heavy Duty Forged Steel Industrial Ball Valve (Class 150/300)',
          productImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
          sku: 'VALVE-FS-2IN-300',
          quantity: 2,
          unitPrice: 4850,
          subtotal: 9700,
          unit: 'Piece',
        },
      ],
      itemCount: 2,
      subtotal: 9700,
      shippingFee: 0,
      totalAmount: 9700,
      currency: 'INR',
      status: 'NEW',
      isReadBySeller: false,
      emailSent: true,
      createdAt: Date.now() - 3600000 * 2, // 2 hours ago
      updatedAt: Date.now() - 3600000 * 2,
      timeline: [
        {
          status: 'NEW',
          timestamp: Date.now() - 3600000 * 2,
          note: 'Order placed by customer via storefront.',
        },
      ],
    };

    ordersMap.set(demoOrder.id, demoOrder);
    saveOrdersToDisk();
  }

  // Sync with Firestore if available
  if (db && isFirestoreAvailable) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'orders')), 1500);
      snap.forEach((d) => {
        const o = d.data() as Order;
        if (o && o.id) {
          ordersMap.set(o.id, o);
        }
      });
      saveOrdersToDisk();
    } catch {
      isFirestoreAvailable = false;
    }
  }
}

// Server-side Product Lookup for Price Security
async function getProductPriceAndDetails(sellerId: string, productId: string): Promise<Product | null> {
  // Check local demo products
  if (sellerId === DEMO_SELLER_ID) {
    const p = sampleProducts.find((item) => item.id === productId);
    if (p) return p;
  }

  // Check Firestore
  if (db && isFirestoreAvailable) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'sellers', sellerId, 'products', productId)), 1500);
      if (snap.exists()) {
        return snap.data() as Product;
      }
    } catch {
      isFirestoreAvailable = false;
    }
  }

  // Check sample product fallback
  const fallback = sampleProducts.find((item) => item.id === productId);
  return fallback || null;
}

// Server-side Seller Profile Lookup
async function getSellerDetails(sellerId: string): Promise<{ companyName: string; email: string }> {
  if (sellerId === DEMO_SELLER_ID) {
    return {
      companyName: sampleSellerProfile.companyName,
      email: sampleSellerProfile.email,
    };
  }

  if (db && isFirestoreAvailable) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'sellers', sellerId)), 1500);
      if (snap.exists()) {
        const d = snap.data();
        return {
          companyName: d.companyName || 'Seller',
          email: d.email || 'seller@sparkgentech.com',
        };
      }
    } catch {
      isFirestoreAvailable = false;
    }
  }

  return {
    companyName: 'ABC Enterprises',
    email: 'sales@abcenterprises.com',
  };
}

/**
 * Creates an order with strict server-side validation:
 * 1. Product price retrieved authoritatively from DB (cannot be tampered by client).
 * 2. Totals calculated on server.
 * 3. Unique Order ID generated.
 * 4. Stock checked and decremented if available.
 * 5. Order saved in persistent memory, disk, and Firestore.
 * 6. Email dispatched to seller.
 */
export async function createOrderAsync(payload: {
  sellerId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  deliveryAddress: {
    fullName: string;
    mobileNumber: string;
    email: string;
    houseNumber: string;
    streetArea: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  orderNotes?: string;
  items: Array<{ productId: string; quantity: number }>;
}): Promise<Order> {
  const { sellerId, customerName, customerEmail, customerMobile, deliveryAddress, orderNotes, items } = payload;

  // Validation
  if (!sellerId || !sellerId.trim()) {
    throw new Error('Seller ID is required to route the order.');
  }
  if (!customerName || !customerName.trim()) {
    throw new Error('Customer full name is required.');
  }
  if (!customerMobile || !customerMobile.trim() || customerMobile.trim().length < 8) {
    throw new Error('Valid mobile number is required.');
  }
  if (!customerEmail || !customerEmail.includes('@')) {
    throw new Error('Valid email address is required.');
  }
  if (!deliveryAddress || !deliveryAddress.houseNumber || !deliveryAddress.streetArea || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode) {
    throw new Error('Complete delivery address (House/Flat, Street/Area, City, State, PIN Code) is required.');
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('At least one product item must be included in the order.');
  }

  // Construct full formatted address
  const fullAddress = [
    deliveryAddress.houseNumber.trim(),
    deliveryAddress.streetArea.trim(),
    deliveryAddress.landmark?.trim(),
    `${deliveryAddress.city.trim()}, ${deliveryAddress.state.trim()} - ${deliveryAddress.pincode.trim()}`,
  ]
    .filter(Boolean)
    .join(', ');

  const completeDeliveryAddress = {
    ...deliveryAddress,
    fullName: deliveryAddress.fullName || customerName.trim(),
    mobileNumber: deliveryAddress.mobileNumber || customerMobile.trim(),
    email: deliveryAddress.email || customerEmail.trim().toLowerCase(),
    fullAddress,
  };

  // Authoritative server-side price computation & item resolution
  const resolvedItems: Order['items'] = [];
  let calculatedSubtotal = 0;
  let totalQuantity = 0;

  for (const requestedItem of items) {
    const qty = Math.max(1, Math.floor(Number(requestedItem.quantity) || 1));
    const product = await getProductPriceAndDetails(sellerId, requestedItem.productId);

    if (!product) {
      throw new Error(`Product with ID "${requestedItem.productId}" is not available or does not exist.`);
    }

    // Stock check if stockQuantity is specified
    if (typeof product.stockQuantity === 'number') {
      if (product.stockQuantity < qty) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${qty}.`
        );
      }
      // Decrement stock in DB/memory
      product.stockQuantity -= qty;
      if (product.stockQuantity <= 0) {
        product.inStock = false;
      }
      if (db && isFirestoreAvailable) {
        updateDoc(doc(db, 'sellers', sellerId, 'products', product.id), {
          stockQuantity: product.stockQuantity,
          inStock: product.stockQuantity > 0,
        }).catch(() => {});
      }
    }

    const unitPrice = Number(product.price) || 0;
    const itemSubtotal = unitPrice * qty;

    calculatedSubtotal += itemSubtotal;
    totalQuantity += qty;

    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      productImage: (product.images && product.images[0]) || '',
      sku: product.sku || '',
      quantity: qty,
      unitPrice,
      subtotal: itemSubtotal,
      unit: product.unit || 'Piece',
    });
  }

  const orderId = generateUniqueOrderId();
  const sellerInfo = await getSellerDetails(sellerId);

  const newOrder: Order = {
    id: orderId,
    sellerId,
    sellerName: sellerInfo.companyName,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerMobile: customerMobile.trim(),
    deliveryAddress: completeDeliveryAddress,
    orderNotes: orderNotes?.trim() || undefined,
    items: resolvedItems,
    itemCount: totalQuantity,
    subtotal: calculatedSubtotal,
    shippingFee: 0,
    totalAmount: calculatedSubtotal,
    currency: 'INR',
    status: 'NEW',
    isReadBySeller: false,
    emailSent: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    timeline: [
      {
        status: 'NEW',
        timestamp: Date.now(),
        note: 'Order successfully created and submitted to seller.',
      },
    ],
  };

  // 1. Save to in-memory store
  ordersMap.set(orderId, newOrder);

  // 2. Save to local disk file
  saveOrdersToDisk();

  // 3. Save to Firestore
  if (db && isFirestoreAvailable) {
    try {
      await withTimeout(setDoc(doc(db, 'orders', orderId), newOrder), 2000);
    } catch (err) {
      console.warn('[Order Store] Firestore write bypassed:', err);
    }
  }

  // 4. Send Seller Email Notification (Non-blocking / async)
  sendSellerOrderNotificationEmail(newOrder, sellerInfo.email, sellerInfo.companyName)
    .then((res) => {
      newOrder.emailSent = res.success;
      ordersMap.set(orderId, newOrder);
      saveOrdersToDisk();
      if (db && isFirestoreAvailable) {
        updateDoc(doc(db, 'orders', orderId), { emailSent: res.success }).catch(() => {});
      }
    })
    .catch((e) => {
      console.warn('[Order Store] Email dispatch notice:', e);
    });

  return newOrder;
}

// Query Single Order
export async function getOrderByIdAsync(orderId: string): Promise<Order | null> {
  const local = ordersMap.get(orderId);
  if (local) return local;

  if (db && isFirestoreAvailable) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'orders', orderId)), 1500);
      if (snap.exists()) {
        const o = snap.data() as Order;
        ordersMap.set(o.id, o);
        saveOrdersToDisk();
        return o;
      }
    } catch {
      isFirestoreAvailable = false;
    }
  }
  return null;
}

// Query Orders for Seller
export async function getOrdersForSellerAsync(sellerId: string): Promise<Order[]> {
  const results: Order[] = [];
  for (const order of ordersMap.values()) {
    if (order.sellerId === sellerId || sellerId === 'all') {
      results.push(order);
    }
  }

  if (db && isFirestoreAvailable) {
    try {
      const q =
        sellerId === 'all'
          ? collection(db, 'orders')
          : query(collection(db, 'orders'), where('sellerId', '==', sellerId));
      const snap = await withTimeout(getDocs(q), 1500);
      snap.forEach((d) => {
        const o = d.data() as Order;
        if (o && o.id) {
          ordersMap.set(o.id, o);
          if (!results.find((r) => r.id === o.id)) {
            results.push(o);
          }
        }
      });
      saveOrdersToDisk();
    } catch {
      isFirestoreAvailable = false;
    }
  }

  return results.sort((a, b) => b.createdAt - a.createdAt);
}

// Query All Orders (Admin)
export async function getAllOrdersAsync(): Promise<Order[]> {
  return getOrdersForSellerAsync('all');
}

// Update Order Status
export async function updateOrderStatusAsync(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<Order> {
  const existing = await getOrderByIdAsync(orderId);
  if (!existing) {
    throw new Error(`Order "${orderId}" not found.`);
  }

  const validStatuses: OrderStatus[] = ['NEW', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status "${newStatus}".`);
  }

  existing.status = newStatus;
  existing.updatedAt = Date.now();
  existing.timeline = existing.timeline || [];
  existing.timeline.push({
    status: newStatus,
    timestamp: Date.now(),
    note: note || `Status updated to ${newStatus}`,
  });

  ordersMap.set(orderId, existing);
  saveOrdersToDisk();

  if (db && isFirestoreAvailable) {
    try {
      await withTimeout(
        updateDoc(doc(db, 'orders', orderId), {
          status: newStatus,
          updatedAt: existing.updatedAt,
          timeline: existing.timeline,
        }),
        1500
      );
    } catch {
      isFirestoreAvailable = false;
    }
  }

  return existing;
}

// Mark Order as Read by Seller
export async function markOrderAsReadAsync(orderId: string): Promise<Order> {
  const existing = await getOrderByIdAsync(orderId);
  if (!existing) {
    throw new Error(`Order "${orderId}" not found.`);
  }

  existing.isReadBySeller = true;
  existing.updatedAt = Date.now();
  ordersMap.set(orderId, existing);
  saveOrdersToDisk();

  if (db && isFirestoreAvailable) {
    try {
      await withTimeout(
        updateDoc(doc(db, 'orders', orderId), {
          isReadBySeller: true,
          updatedAt: existing.updatedAt,
        }),
        1500
      );
    } catch {
      isFirestoreAvailable = false;
    }
  }

  return existing;
}

// Get Unread Count for Badge
export async function getUnreadOrderCountAsync(sellerId: string): Promise<number> {
  const orders = await getOrdersForSellerAsync(sellerId);
  return orders.filter((o) => !o.isReadBySeller && o.status === 'NEW').length;
}
