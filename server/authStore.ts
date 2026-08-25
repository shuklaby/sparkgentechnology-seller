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
  deleteDoc,
  collection,
  query,
  where
} from 'firebase/firestore';
import fileConfig from '../firebase-applet-config.json';

export type ServerUserRole = 'ADMIN' | 'EMPLOYEE' | 'SELLER';
export type ServerUserStatus = 'ACTIVE' | 'INACTIVE';

export interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  role: ServerUserRole;
  status: ServerUserStatus;
  mobileNumber?: string;
  sellerId?: string;
  assignedPermissions?: string[];
  passwordHash: string;
  salt: string;
  createdAt: number;
  lastLoginAt: number;
  updatedAt?: number;
}

export interface SanitizedUser {
  uid: string;
  email: string;
  displayName: string;
  role: ServerUserRole;
  status: ServerUserStatus;
  mobileNumber?: string;
  sellerId?: string;
  assignedPermissions?: string[];
  createdAt: number;
  lastLoginAt: number;
  updatedAt?: number;
}

// In-Memory Fast Fallback & Cache Store
const usersMap = new Map<string, StoredUser>();
const JWT_SECRET = process.env.SESSION_SECRET || 'spark-gen-b2b-saas-auth-secret-key-2026';

// Persistent Local File Path for durable server storage across reboots
const LOCAL_STORAGE_FILE = path.join(process.cwd(), '.server_users_data.json');

function saveToDisk(): void {
  try {
    const list = Array.from(usersMap.values());
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {
    // ignore disk write errors in read-only environments
  }
}

function loadFromDisk(): void {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf-8');
      const list: StoredUser[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const u of list) {
          if (u.uid && u.email) {
            usersMap.set(u.uid, u);
          }
        }
      }
    }
  } catch {
    // fallback gracefully
  }
}

// Initialize Firebase Firestore for server-side persistence
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

// Safe timeout wrapper for cloud database queries
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timed out')), timeoutMs)
    ),
  ]);
}

// Secure Password Hashing using Node.js scrypt + random salt
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

export function sanitizeUser(user: StoredUser): SanitizedUser {
  const { passwordHash, salt, ...sanitized } = user;
  return sanitized;
}

// Session Token Creation and Verification
export function createSessionToken(user: SanitizedUser): string {
  const payload = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    status: user.status,
    sellerId: user.sellerId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(
  token: string
): { uid: string; email: string; role: ServerUserRole; status: ServerUserStatus; sellerId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Default Seed Accounts
export async function initializeInitialUsers(): Promise<void> {
  // Load any previously persisted users from disk first
  loadFromDisk();

  // 1. Primary Root Admin Account (admin@sparkgentech.com / Spark@321)
  const adminEmail = 'admin@sparkgentech.com';
  const { hash: adminHash, salt: adminSalt } = hashPassword('Spark@321');
  const adminUser: StoredUser = {
    uid: 'spark-admin-root',
    email: adminEmail.toLowerCase(),
    displayName: 'Spark Gen Administrator',
    role: 'ADMIN',
    status: 'ACTIVE',
    passwordHash: adminHash,
    salt: adminSalt,
    createdAt: Date.now() - 30 * 86400000,
    lastLoginAt: Date.now(),
  };

  // 2. Demo Seller Account (seller@sparkgentech.com / Spark@321)
  const sellerEmail = 'seller@sparkgentech.com';
  const { hash: sellerHash, salt: sellerSalt } = hashPassword('Spark@321');
  const sellerUser: StoredUser = {
    uid: 'spark-seller-demo',
    email: sellerEmail.toLowerCase(),
    displayName: 'ABC Enterprises (Seller)',
    role: 'SELLER',
    status: 'ACTIVE',
    sellerId: 'demo-abc-enterprises',
    mobileNumber: '+91 98765 43210',
    passwordHash: sellerHash,
    salt: sellerSalt,
    createdAt: Date.now() - 20 * 86400000,
    lastLoginAt: Date.now(),
  };

  // 3. Alternate seller alias (abc.seller@sparkgentech.com / Seller@123)
  const abcSellerEmail = 'abc.seller@sparkgentech.com';
  const { hash: abcHash, salt: abcSalt } = hashPassword('Seller@123');
  const abcSellerUser: StoredUser = {
    uid: 'spark-seller-abc',
    email: abcSellerEmail.toLowerCase(),
    displayName: 'ABC Industrial Supplies',
    role: 'SELLER',
    status: 'ACTIVE',
    sellerId: 'demo-abc-enterprises',
    mobileNumber: '+91 98765 43210',
    passwordHash: abcHash,
    salt: abcSalt,
    createdAt: Date.now() - 15 * 86400000,
    lastLoginAt: Date.now(),
  };

  // Seed memory store if not present
  if (!usersMap.has(adminUser.uid)) usersMap.set(adminUser.uid, adminUser);
  if (!usersMap.has(sellerUser.uid)) usersMap.set(sellerUser.uid, sellerUser);
  if (!usersMap.has(abcSellerUser.uid)) usersMap.set(abcSellerUser.uid, abcSellerUser);

  saveToDisk();

  // Test / sync Firestore if available
  if (db && isFirestoreAvailable) {
    try {
      const adminDocRef = doc(db, 'users', adminUser.uid);
      const adminSnap = await withTimeout(getDoc(adminDocRef), 1500);
      if (!adminSnap.exists()) {
        await withTimeout(setDoc(adminDocRef, adminUser), 1500);
      } else {
        const remoteAdmin = adminSnap.data() as StoredUser;
        usersMap.set(remoteAdmin.uid, remoteAdmin);
      }

      const usersCol = collection(db, 'users');
      const allDocsSnap = await withTimeout(getDocs(usersCol), 1500);
      allDocsSnap.forEach((d) => {
        const u = d.data() as StoredUser;
        if (u.uid && u.email) {
          usersMap.set(u.uid, u);
        }
      });
      saveToDisk();
    } catch {
      // If Firestore is disabled in GCP or offline, seamlessly deactivate remote calls
      isFirestoreAvailable = false;
    }
  }
}

// User Lookups (Sync & Async)
export function findUserByEmail(email: string): StoredUser | undefined {
  const normalized = email.toLowerCase().trim();
  for (const user of usersMap.values()) {
    if (user.email.toLowerCase().trim() === normalized) {
      return user;
    }
  }
  return undefined;
}

export async function findUserByEmailAsync(email: string): Promise<StoredUser | undefined> {
  const localUser = findUserByEmail(email);
  if (localUser) return localUser;

  const normalized = email.toLowerCase().trim();
  if (db && isFirestoreAvailable) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', normalized));
      const querySnap = await withTimeout(getDocs(q), 1500);
      if (!querySnap.empty) {
        const remoteUser = querySnap.docs[0].data() as StoredUser;
        usersMap.set(remoteUser.uid, remoteUser);
        saveToDisk();
        return remoteUser;
      }
    } catch {
      isFirestoreAvailable = false;
    }
  }
  return undefined;
}

export function findUserById(uid: string): StoredUser | undefined {
  return usersMap.get(uid);
}

export async function findUserByIdAsync(uid: string): Promise<StoredUser | undefined> {
  const localUser = usersMap.get(uid);
  if (localUser) return localUser;

  if (db && isFirestoreAvailable) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', uid)), 1500);
      if (snap.exists()) {
        const remoteUser = snap.data() as StoredUser;
        usersMap.set(remoteUser.uid, remoteUser);
        saveToDisk();
        return remoteUser;
      }
    } catch {
      isFirestoreAvailable = false;
    }
  }
  return undefined;
}

export function getAllUsers(): SanitizedUser[] {
  return Array.from(usersMap.values()).map(sanitizeUser);
}

export async function getAllUsersAsync(): Promise<SanitizedUser[]> {
  if (db && isFirestoreAvailable) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'users')), 1500);
      snap.forEach((d) => {
        const u = d.data() as StoredUser;
        if (u.uid && u.email) {
          usersMap.set(u.uid, u);
        }
      });
      saveToDisk();
    } catch {
      isFirestoreAvailable = false;
    }
  }
  return Array.from(usersMap.values()).map(sanitizeUser);
}

// User Creation
export async function createUserAsync(data: {
  displayName: string;
  email: string;
  password: string;
  role: ServerUserRole;
  status: ServerUserStatus;
  mobileNumber?: string;
  sellerId?: string;
}): Promise<SanitizedUser> {
  const normalizedEmail = data.email.toLowerCase().trim();
  const existing = await findUserByEmailAsync(normalizedEmail);
  if (existing) {
    throw new Error(`A user with email "${data.email}" is already registered.`);
  }

  const { hash, salt } = hashPassword(data.password);
  const uid = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const sellerId = data.sellerId || (data.role === 'SELLER' ? `seller-${uid}` : undefined);

  const newUser: StoredUser = {
    uid,
    email: normalizedEmail,
    displayName: data.displayName.trim(),
    role: data.role,
    status: data.status,
    mobileNumber: data.mobileNumber?.trim() || undefined,
    sellerId,
    passwordHash: hash,
    salt,
    createdAt: Date.now(),
    lastLoginAt: 0,
  };

  // Write to memory cache & disk
  usersMap.set(uid, newUser);
  saveToDisk();

  // Write to Firestore if available
  if (db && isFirestoreAvailable) {
    try {
      await withTimeout(setDoc(doc(db, 'users', uid), newUser), 1500);
      
      if (data.role === 'SELLER' && sellerId) {
        const sellerRef = doc(db, 'sellers', sellerId);
        const sellerSnap = await withTimeout(getDoc(sellerRef), 1500);
        if (!sellerSnap.exists()) {
          const sellerProfile = {
            id: sellerId,
            companyName: data.displayName.trim(),
            slug: data.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + uid.slice(-4),
            email: normalizedEmail,
            mobileNumber: data.mobileNumber?.trim() || '',
            businessDescription: 'Wholesale B2B Catalog & Industrial Supplies',
            businessType: 'Manufacturer',
            yearEstablished: new Date().getFullYear(),
            isActive: true,
            isPublished: true,
            ownerUid: uid,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await withTimeout(setDoc(sellerRef, sellerProfile), 1500);
        }
      }
    } catch {
      isFirestoreAvailable = false;
    }
  }

  return sanitizeUser(newUser);
}

export function createUser(data: {
  displayName: string;
  email: string;
  password: string;
  role: ServerUserRole;
  status: ServerUserStatus;
  mobileNumber?: string;
  sellerId?: string;
}): SanitizedUser {
  const normalizedEmail = data.email.toLowerCase().trim();
  if (findUserByEmail(normalizedEmail)) {
    throw new Error(`A user with email "${data.email}" is already registered.`);
  }

  const { hash, salt } = hashPassword(data.password);
  const uid = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const sellerId = data.sellerId || (data.role === 'SELLER' ? `seller-${uid}` : undefined);

  const newUser: StoredUser = {
    uid,
    email: normalizedEmail,
    displayName: data.displayName.trim(),
    role: data.role,
    status: data.status,
    mobileNumber: data.mobileNumber?.trim() || undefined,
    sellerId,
    passwordHash: hash,
    salt,
    createdAt: Date.now(),
    lastLoginAt: 0,
  };

  usersMap.set(uid, newUser);
  saveToDisk();

  if (db && isFirestoreAvailable) {
    setDoc(doc(db, 'users', uid), newUser).catch(() => {
      isFirestoreAvailable = false;
    });
  }

  return sanitizeUser(newUser);
}

// User Update
export async function updateUserAsync(
  uid: string,
  updates: {
    displayName?: string;
    mobileNumber?: string;
    role?: ServerUserRole;
    status?: ServerUserStatus;
    sellerId?: string;
  }
): Promise<SanitizedUser> {
  const existing = await findUserByIdAsync(uid);
  if (!existing) {
    throw new Error('User not found.');
  }

  // Guard Root Admin
  if (existing.email.toLowerCase() === 'admin@sparkgentech.com') {
    if (updates.status === 'INACTIVE') {
      throw new Error('The primary root administrator account cannot be deactivated.');
    }
    if (updates.role && updates.role !== 'ADMIN') {
      throw new Error('The primary root administrator role cannot be changed.');
    }
  }

  const updated: StoredUser = {
    ...existing,
    displayName: updates.displayName !== undefined ? updates.displayName.trim() : existing.displayName,
    mobileNumber: updates.mobileNumber !== undefined ? updates.mobileNumber.trim() : existing.mobileNumber,
    role: updates.role || existing.role,
    status: updates.status || existing.status,
    sellerId: updates.sellerId !== undefined ? updates.sellerId : existing.sellerId,
    updatedAt: Date.now(),
  };

  usersMap.set(uid, updated);
  saveToDisk();

  if (db && isFirestoreAvailable) {
    try {
      await withTimeout(updateDoc(doc(db, 'users', uid), {
        displayName: updated.displayName,
        mobileNumber: updated.mobileNumber || null,
        role: updated.role,
        status: updated.status,
        sellerId: updated.sellerId || null,
        updatedAt: updated.updatedAt,
      }), 1500);
    } catch {
      isFirestoreAvailable = false;
    }
  }

  return sanitizeUser(updated);
}

export function updateUser(
  uid: string,
  updates: {
    displayName?: string;
    mobileNumber?: string;
    role?: ServerUserRole;
    status?: ServerUserStatus;
    sellerId?: string;
  }
): SanitizedUser {
  const existing = usersMap.get(uid);
  if (!existing) {
    throw new Error('User not found.');
  }

  if (existing.email.toLowerCase() === 'admin@sparkgentech.com') {
    if (updates.status === 'INACTIVE') {
      throw new Error('The primary root administrator account cannot be deactivated.');
    }
    if (updates.role && updates.role !== 'ADMIN') {
      throw new Error('The primary root administrator role cannot be changed.');
    }
  }

  const updated: StoredUser = {
    ...existing,
    displayName: updates.displayName !== undefined ? updates.displayName.trim() : existing.displayName,
    mobileNumber: updates.mobileNumber !== undefined ? updates.mobileNumber.trim() : existing.mobileNumber,
    role: updates.role || existing.role,
    status: updates.status || existing.status,
    sellerId: updates.sellerId !== undefined ? updates.sellerId : existing.sellerId,
    updatedAt: Date.now(),
  };

  usersMap.set(uid, updated);
  saveToDisk();

  if (db && isFirestoreAvailable) {
    updateDoc(doc(db, 'users', uid), {
      displayName: updated.displayName,
      mobileNumber: updated.mobileNumber || null,
      role: updated.role,
      status: updated.status,
      sellerId: updated.sellerId || null,
      updatedAt: updated.updatedAt,
    }).catch(() => {
      isFirestoreAvailable = false;
    });
  }

  return sanitizeUser(updated);
}

// Reset Password
export async function resetUserPasswordAsync(uid: string, newPassword: string): Promise<void> {
  const existing = await findUserByIdAsync(uid);
  if (!existing) {
    throw new Error('User not found.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters in length.');
  }

  const { hash, salt } = hashPassword(newPassword);
  existing.passwordHash = hash;
  existing.salt = salt;
  existing.updatedAt = Date.now();
  usersMap.set(uid, existing);
  saveToDisk();

  if (db && isFirestoreAvailable) {
    try {
      await withTimeout(updateDoc(doc(db, 'users', uid), {
        passwordHash: hash,
        salt,
        updatedAt: existing.updatedAt,
      }), 1500);
    } catch {
      isFirestoreAvailable = false;
    }
  }
}

export function resetUserPassword(uid: string, newPassword: string): void {
  const existing = usersMap.get(uid);
  if (!existing) {
    throw new Error('User not found.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters in length.');
  }

  const { hash, salt } = hashPassword(newPassword);
  existing.passwordHash = hash;
  existing.salt = salt;
  existing.updatedAt = Date.now();
  usersMap.set(uid, existing);
  saveToDisk();

  if (db && isFirestoreAvailable) {
    updateDoc(doc(db, 'users', uid), {
      passwordHash: hash,
      salt,
      updatedAt: existing.updatedAt,
    }).catch(() => {
      isFirestoreAvailable = false;
    });
  }
}

// Delete User
export async function deleteUserAsync(uid: string): Promise<void> {
  const existing = await findUserByIdAsync(uid);
  if (!existing) {
    throw new Error('User not found.');
  }
  if (existing.email.toLowerCase() === 'admin@sparkgentech.com') {
    throw new Error('The primary root administrator account cannot be deleted.');
  }
  usersMap.delete(uid);
  saveToDisk();

  if (db && isFirestoreAvailable) {
    try {
      await withTimeout(deleteDoc(doc(db, 'users', uid)), 1500);
    } catch {
      isFirestoreAvailable = false;
    }
  }
}

export function deleteUser(uid: string): void {
  const existing = usersMap.get(uid);
  if (!existing) {
    throw new Error('User not found.');
  }
  if (existing.email.toLowerCase() === 'admin@sparkgentech.com') {
    throw new Error('The primary root administrator account cannot be deleted.');
  }
  usersMap.delete(uid);
  saveToDisk();

  if (db && isFirestoreAvailable) {
    deleteDoc(doc(db, 'users', uid)).catch(() => {
      isFirestoreAvailable = false;
    });
  }
}

// Record Login Success
export function recordLoginSuccess(uid: string): void {
  const existing = usersMap.get(uid);
  if (existing) {
    existing.lastLoginAt = Date.now();
    usersMap.set(uid, existing);
    saveToDisk();

    if (db && isFirestoreAvailable) {
      updateDoc(doc(db, 'users', uid), { lastLoginAt: existing.lastLoginAt }).catch(() => {
        isFirestoreAvailable = false;
      });
    }
  }
}

// Fetch or Create Seller Profile for a user
export async function getSellerProfileForUser(user: SanitizedUser | StoredUser): Promise<any> {
  const sellerId = user.sellerId || (user.role === 'SELLER' ? `seller-${user.uid}` : 'demo-abc-enterprises');
  
  if (db && isFirestoreAvailable) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'sellers', sellerId)), 1500);
      if (snap.exists()) {
        return snap.data();
      }
    } catch {
      isFirestoreAvailable = false;
    }
  }

  // Fallback default seller profile
  return {
    id: sellerId,
    companyName: user.displayName || 'B2B Enterprise',
    slug: (user.displayName || 'seller').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + user.uid.slice(-4),
    email: user.email,
    mobileNumber: user.mobileNumber || '',
    businessDescription: 'Wholesale and B2B Manufacturing Catalog',
    businessType: 'Manufacturer',
    yearEstablished: new Date().getFullYear(),
    isActive: true,
    isPublished: true,
    ownerUid: user.uid,
    createdAt: user.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}
