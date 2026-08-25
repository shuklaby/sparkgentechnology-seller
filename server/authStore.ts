import crypto from 'crypto';

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

// In-Memory Persistent Store (with initial seed)
const usersMap = new Map<string, StoredUser>();
const JWT_SECRET = process.env.SESSION_SECRET || 'spark-gen-b2b-saas-auth-secret-key-2026';

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

// Token Handling
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

export function verifySessionToken(token: string): { uid: string; email: string; role: ServerUserRole; status: ServerUserStatus; sellerId?: string } | null {
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

// Initial Admin & Demo Seeding
export function initializeInitialUsers() {
  const adminEmail = 'admin@sparkgentech.com';
  
  // 1. Initial Admin Account (admin@sparkgentech.com / Spark@321)
  if (!findUserByEmail(adminEmail)) {
    const { hash, salt } = hashPassword('Spark@321');
    const adminUser: StoredUser = {
      uid: 'spark-admin-root',
      email: adminEmail.toLowerCase(),
      displayName: 'Spark Gen Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      mobileNumber: '+91 78977 52217',
      passwordHash: hash,
      salt,
      createdAt: Date.now() - 30 * 86400000,
      lastLoginAt: Date.now(),
    };
    usersMap.set(adminUser.uid, adminUser);
  }

  // 2. Demo Seller Account (seller@sparkgentech.com / Spark@321)
  const sellerEmail = 'seller@sparkgentech.com';
  if (!findUserByEmail(sellerEmail)) {
    const { hash, salt } = hashPassword('Spark@321');
    const sellerUser: StoredUser = {
      uid: 'spark-seller-demo',
      email: sellerEmail.toLowerCase(),
      displayName: 'ABC Enterprises (Seller)',
      role: 'SELLER',
      status: 'ACTIVE',
      sellerId: 'demo-abc-enterprises',
      mobileNumber: '+91 98765 43210',
      passwordHash: hash,
      salt,
      createdAt: Date.now() - 20 * 86400000,
      lastLoginAt: Date.now(),
    };
    usersMap.set(sellerUser.uid, sellerUser);
  }

  // 3. Demo Employee Account (employee@sparkgentech.com / Spark@321)
  const employeeEmail = 'employee@sparkgentech.com';
  if (!findUserByEmail(employeeEmail)) {
    const { hash, salt } = hashPassword('Spark@321');
    const employeeUser: StoredUser = {
      uid: 'spark-employee-demo',
      email: employeeEmail.toLowerCase(),
      displayName: 'Operations Associate',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      sellerId: 'demo-abc-enterprises',
      mobileNumber: '+91 98111 22233',
      passwordHash: hash,
      salt,
      createdAt: Date.now() - 10 * 86400000,
      lastLoginAt: Date.now(),
    };
    usersMap.set(employeeUser.uid, employeeUser);
  }
}

// User CRUD operations
export function findUserByEmail(email: string): StoredUser | undefined {
  const normalized = email.toLowerCase().trim();
  for (const user of usersMap.values()) {
    if (user.email.toLowerCase().trim() === normalized) {
      return user;
    }
  }
  return undefined;
}

export function findUserById(uid: string): StoredUser | undefined {
  return usersMap.get(uid);
}

export function getAllUsers(): SanitizedUser[] {
  return Array.from(usersMap.values()).map(sanitizeUser);
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
    throw new Error(`A user with email ${data.email} is already registered.`);
  }

  const { hash, salt } = hashPassword(data.password);
  const uid = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  
  const newUser: StoredUser = {
    uid,
    email: normalizedEmail,
    displayName: data.displayName.trim(),
    role: data.role,
    status: data.status,
    mobileNumber: data.mobileNumber?.trim() || undefined,
    sellerId: data.sellerId || (data.role === 'SELLER' ? 'demo-abc-enterprises' : undefined),
    passwordHash: hash,
    salt,
    createdAt: Date.now(),
    lastLoginAt: 0,
  };

  usersMap.set(uid, newUser);
  return sanitizeUser(newUser);
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

  // Guard: Protect Root Admin from deactivation or demotion
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
  return sanitizeUser(updated);
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
}

export function recordLoginSuccess(uid: string): void {
  const existing = usersMap.get(uid);
  if (existing) {
    existing.lastLoginAt = Date.now();
    usersMap.set(uid, existing);
  }
}
