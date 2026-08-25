import { AppUser, UserRole, UserStatus } from '../types';

const TOKEN_KEY = 'spark_auth_token';
const USER_KEY = 'spark_auth_user';

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AppUser;
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

// ----------------------------------------------------
// Authentication API Calls
// ----------------------------------------------------

export async function loginWithEmailPassword(
  email: string,
  password: string,
  _roleHint?: string
): Promise<{ user: AppUser; token: string; seller?: any }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Authentication failed. Please check your credentials.');
  }

  setStoredSession(data.token, data.user);
  return { user: data.user, token: data.token };
}

export async function verifyCurrentSession(): Promise<{ user: AppUser; seller?: any } | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      clearStoredSession();
      return null;
    }

    const data = await res.json();
    if (data.success && data.user) {
      setStoredSession(token, data.user);
      return { user: data.user };
    }
  } catch (e) {
    console.warn('Session verification fallback to stored user:', e);
    const cached = getStoredUser();
    if (cached) return { user: cached };
  }

  return null;
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit password reset request.');
  }

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
  const res = await fetch('/api/users', {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch users from server.');
  }

  return data.users as AppUser[];
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
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create user account.');
  }

  return data.user as AppUser;
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
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update user profile.');
  }

  return data.user as AppUser;
}

export async function adminResetUserPassword(uid: string, newPassword: string): Promise<string> {
  const res = await fetch(`/api/users/${uid}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ newPassword }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to reset user password.');
  }

  return data.message || 'Password updated successfully.';
}

export async function deleteExistingUser(uid: string): Promise<string> {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete user.');
  }

  return data.message || 'User removed successfully.';
}
