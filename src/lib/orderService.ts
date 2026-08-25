import { Order, OrderStatus, CartItem, Product, OrderDeliveryAddress } from '../types';
import { getStoredToken } from './authService';

const CART_KEY_PREFIX = 'spark_b2b_cart_';
const LOCAL_ORDERS_CACHE = 'spark_b2b_local_orders';

// ----------------------------------------------------
// Cart Management Helpers
// ----------------------------------------------------

export function getStoredCart(sellerId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(`${CART_KEY_PREFIX}${sellerId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredCart(sellerId: string, items: CartItem[]): void {
  try {
    localStorage.setItem(`${CART_KEY_PREFIX}${sellerId}`, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save cart to localStorage:', e);
  }
}

export function clearStoredCart(sellerId: string): void {
  try {
    localStorage.removeItem(`${CART_KEY_PREFIX}${sellerId}`);
  } catch (e) {
    console.warn('Failed to clear cart:', e);
  }
}

export function calculateCartTotals(items: CartItem[]): { totalQuantity: number; subtotal: number; total: number } {
  let totalQuantity = 0;
  let subtotal = 0;

  for (const item of items) {
    const qty = Math.max(1, item.quantity || 1);
    const price = Number(item.product?.price) || 0;
    totalQuantity += qty;
    subtotal += price * qty;
  }

  return {
    totalQuantity,
    subtotal,
    total: subtotal,
  };
}

// ----------------------------------------------------
// Order API Communications
// ----------------------------------------------------

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Place a new order from Checkout (Public Customer Endpoint)
 */
export async function placeOrder(payload: {
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
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.order) {
    throw new Error(data.error || 'Failed to place order. Please check your information and try again.');
  }

  // Clear customer cart upon verified successful placement
  clearStoredCart(payload.sellerId);

  // Cache locally
  try {
    const existingRaw = localStorage.getItem(LOCAL_ORDERS_CACHE);
    const list: Order[] = existingRaw ? JSON.parse(existingRaw) : [];
    list.unshift(data.order);
    localStorage.setItem(LOCAL_ORDERS_CACHE, JSON.stringify(list));
  } catch {}

  return data.order as Order;
}

/**
 * Fetch a single order by ID (Public / Customer Confirmation / Seller)
 */
export async function fetchOrderById(orderId: string): Promise<Order | null> {
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.order ? (data.order as Order) : null;
  } catch {
    // Check local fallback
    try {
      const existingRaw = localStorage.getItem(LOCAL_ORDERS_CACHE);
      const list: Order[] = existingRaw ? JSON.parse(existingRaw) : [];
      return list.find((o) => o.id === orderId) || null;
    } catch {
      return null;
    }
  }
}

/**
 * Fetch orders for Seller / Admin Dashboard
 */
export async function fetchSellerOrders(sellerId?: string): Promise<Order[]> {
  try {
    const url = sellerId ? `/api/orders?sellerId=${encodeURIComponent(sellerId)}` : '/api/orders';
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        // Update local cache
        try {
          localStorage.setItem(LOCAL_ORDERS_CACHE, JSON.stringify(data.orders));
        } catch {}
        return data.orders as Order[];
      }
    }
  } catch (err) {
    console.warn('[Order Service] Network fetch error, using local fallback:', err);
  }

  // Fallback to local cache
  try {
    const existingRaw = localStorage.getItem(LOCAL_ORDERS_CACHE);
    if (existingRaw) {
      const list: Order[] = JSON.parse(existingRaw);
      if (sellerId && sellerId !== 'all') {
        return list.filter((o) => o.sellerId === sellerId);
      }
      return list;
    }
  } catch {}

  return [];
}

/**
 * Update Order Status (Seller / Admin)
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, note }),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.order) {
    throw new Error(data.error || 'Failed to update order status.');
  }

  // Update local cache
  try {
    const existingRaw = localStorage.getItem(LOCAL_ORDERS_CACHE);
    if (existingRaw) {
      const list: Order[] = JSON.parse(existingRaw);
      const idx = list.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        list[idx] = data.order;
        localStorage.setItem(LOCAL_ORDERS_CACHE, JSON.stringify(list));
      }
    }
  } catch {}

  return data.order as Order;
}

/**
 * Mark Order as Read by Seller (Clears unread badge)
 */
export async function markOrderAsRead(orderId: string): Promise<Order> {
  try {
    const res = await fetch(`/api/orders/${orderId}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success && data.order) {
      return data.order;
    }
  } catch {}

  return null as any;
}

/**
 * Fetch Unread Count for Notification Badge
 */
export async function fetchUnreadOrdersCount(sellerId?: string): Promise<number> {
  try {
    const url = sellerId ? `/api/orders/badge/unread-count?sellerId=${encodeURIComponent(sellerId)}` : '/api/orders/badge/unread-count';
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.unreadCount === 'number') {
        return data.unreadCount;
      }
    }
  } catch {}
  return 0;
}

export const fetchUnreadOrderCount = fetchUnreadOrdersCount;
