import { AppUser, UserRole, UserStatus } from '../types';

const TOKEN_KEY = 'spark_auth_token';
const USER_KEY = 'spark_auth_user';

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AppUser;
  seller?: any;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: AppUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('Failed to clear session from localStorage:', e);
  }
}

/**
 * Safely executes a fetch request and validates JSON response,
 * gracefully handling HTTP proxy errors without noisy parser exceptions.
 */
async function safeFetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Authentication invalid (Status ${res.status}).`);
    }
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status} (${res.statusText}).`);
    }
    throw new Error('Unexpected non-JSON response from server endpoint.');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Failed to parse server response as JSON.');
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Server request failed with status ${res.status}.`);
  }

  return data as T;
}

// ----------------------------------------------------
// Authentication API Calls
// ----------------------------------------------------

export async function loginWithEmailPassword(
  email: string,
  password: string,
  _roleHint?: string
): Promise<{ user: AppUser; token: string; seller?: any }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  const data = await safeFetchJson<{
    success: boolean;
    token: string;
    user: AppUser;
    seller?: any;
  }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password }),
  });

  if (!data.token || !data.user) {
    throw new Error('Authentication succeeded but session payload was incomplete.');
  }

  setStoredSession(data.token, data.user);
  return { user: data.user, token: data.token, seller: data.seller };
}

export async function verifyCurrentSession(): Promise<{ user: AppUser; seller?: any } | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const data = await safeFetchJson<{
      success: boolean;
      user: AppUser;
      seller?: any;
    }>('/api/auth/session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (data && data.user) {
      setStoredSession(token, data.user);
      return { user: data.user, seller: data.seller };
    }
  } catch (e: any) {
    // If token was rejected as 401/403, clear stale session token
    if (e?.message?.includes('401') || e?.message?.includes('403') || e?.message?.includes('Authentication invalid')) {
      clearStoredSession();
      return null;
    }
    const cached = getStoredUser();
    if (cached) return { user: cached };
  }

  return null;
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const data = await safeFetchJson<{
    success: boolean;
    message: string;
  }>('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });

  return {
    success: true,
    message: data.message || 'If an account exists with this email, password reset instructions have been dispatched.',
  };
}

export function logout(): void {
  clearStoredSession();
}

export const logoutUser = logout;

// ----------------------------------------------------
// User Management API Calls (Admin Only)
// ----------------------------------------------------

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAllUsers(): Promise<AppUser[]> {
  const data = await safeFetchJson<{
    success: boolean;
    users: AppUser[];
  }>('/api/users', {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return data.users || [];
}

export async function createNewUser(payload: {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  mobileNumber?: string;
  sellerId?: string;
}): Promise<AppUser> {
  const data = await safeFetchJson<{
    success: boolean;
    user: AppUser;
  }>('/api/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...payload,
      email: payload.email.trim().toLowerCase(),
    }),
  });

  return data.user;
}

export async function updateExistingUser(
  uid: string,
  updates: {
    displayName?: string;
    mobileNumber?: string;
    role?: UserRole;
    status?: UserStatus;
    sellerId?: string;
  }
): Promise<AppUser> {
  const data = await safeFetchJson<{
    success: boolean;
    user: AppUser;
  }>(`/api/users/${uid}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  return data.user;
}

export async function adminResetUserPassword(uid: string, newPassword: string): Promise<string> {
  const data = await safeFetchJson<{
    success: boolean;
    message: string;
  }>(`/api/users/${uid}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ newPassword }),
  });

  return data.message || 'Password updated successfully.';
}

export async function deleteExistingUser(uid: string): Promise<string> {
  const data = await safeFetchJson<{
    success: boolean;
    message: string;
  }>(`/api/users/${uid}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return data.message || 'User removed successfully.';
}
