import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  AppUser,
  SellerProfile,
  Product,
  Category,
  WebsiteDesignSettings,
  SocialLinksSettings,
  SeoSettings,
  DomainRecord,
  AdminStats
} from '../types';
import {
  sampleSellerProfile,
  sampleCategories,
  sampleProducts,
  sampleWebsiteSettings,
  sampleSocialLinks,
  sampleSeoSettings,
  DEMO_SELLER_ID,
} from '../data/mockDemoData';

// Local storage fallback cache to ensure seamless zero-lag execution
const LOCAL_STORAGE_KEY_PREFIX = 'b2b_saas_';

let isFirestoreClientEnabled = true;

// Safe wrapper to prevent hanging or failing when Firestore is offline/unprovisioned
async function safeFirestore<T>(operation: () => Promise<T>, timeoutMs = 1500): Promise<T | null> {
  if (!isFirestoreClientEnabled) return null;

  try {
    const res = await Promise.race([
      operation(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs)
      ),
    ]);
    return res;
  } catch (err: any) {
    // If Cloud Firestore API is disabled or client is offline, disable remote calls gracefully
    if (
      err?.message?.includes('PERMISSION_DENIED') ||
      err?.message?.includes('disabled') ||
      err?.message?.includes('client is offline') ||
      err?.message?.includes('timeout')
    ) {
      isFirestoreClientEnabled = false;
    }
    return null;
  }
}

export function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setLocal(key: string, val: unknown): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

export function saveActiveSessionUser(user: AppUser): void {
  setLocal('active_session_user', user);
}

export function clearActiveSessionUser(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_PREFIX + 'active_session_user');
  } catch (e) {
    console.warn('LocalStorage clear error:', e);
  }
}

// ----------------------------------------------------
// 1. Initial Seeding / Demo Data Initialization
// ----------------------------------------------------
export async function initializeDemoDataIfMissing(): Promise<void> {
  // Ensure local state is seeded first
  if (!getLocal(`seller_${DEMO_SELLER_ID}`, null)) {
    setLocal(`seller_${DEMO_SELLER_ID}`, sampleSellerProfile);
    setLocal(`categories_${DEMO_SELLER_ID}`, sampleCategories);
    setLocal(`products_${DEMO_SELLER_ID}`, sampleProducts);
    setLocal(`websiteSettings_${DEMO_SELLER_ID}`, sampleWebsiteSettings);
    setLocal(`socialLinks_${DEMO_SELLER_ID}`, sampleSocialLinks);
    setLocal(`seo_${DEMO_SELLER_ID}`, sampleSeoSettings);
  }

  // Attempt Firestore sync if enabled
  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      const sellerRef = doc(db, 'sellers', DEMO_SELLER_ID);
      const snap = await getDoc(sellerRef);
      if (!snap.exists()) {
        await setDoc(sellerRef, sampleSellerProfile);
        for (const cat of sampleCategories) {
          await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'categories', cat.id), cat);
        }
        for (const prod of sampleProducts) {
          await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'products', prod.id), prod);
        }
        await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'websiteSettings', 'config'), sampleWebsiteSettings);
        await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'socialLinks', 'config'), sampleSocialLinks);
        await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'seo', 'config'), sampleSeoSettings);
      }
    });
  }
}

// ----------------------------------------------------
// 2. User Record Operations
// ----------------------------------------------------
export async function getUserRecord(uid: string): Promise<AppUser | null> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      const userDocRef = doc(db, 'users', uid);
      return await getDoc(userDocRef);
    });

    if (snap && snap.exists()) {
      return snap.data() as AppUser;
    }
  }

  return getLocal<AppUser | null>(`user_${uid}`, null);
}

// ----------------------------------------------------
// 3. Seller Profile APIs
// ----------------------------------------------------
export function createDefaultSellerProfile(user: AppUser, customSellerId?: string): SellerProfile {
  const sellerId = customSellerId || user.sellerId || `seller-${user.uid}`;
  const companyName = user.displayName || 'B2B Enterprise';
  const cleanSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + user.uid.slice(-4);

  return {
    id: sellerId,
    companyName,
    slug: cleanSlug,
    logoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80',
    businessDescription: 'Wholesale B2B Catalog, Manufacturing, and Industrial Distribution.',
    mobileNumber: user.mobileNumber || '+91 98765 43210',
    whatsappNumber: user.mobileNumber || '+91 98765 43210',
    email: user.email,
    address: 'Plot No. 42, Industrial Area, Phase II',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400093',
    googleMapsUrl: 'https://maps.google.com',
    businessType: 'Manufacturer',
    yearEstablished: new Date().getFullYear(),
    isActive: true,
    isPublished: true,
    ownerUid: user.uid,
    createdAt: user.createdAt || Date.now(),
    updatedAt: Date.now(),
    subscriptionPlan: 'Growth',
  };
}

export async function getSellerById(sellerId: string): Promise<SellerProfile | null> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDoc(doc(db, 'sellers', sellerId));
    });
    if (snap && snap.exists()) {
      return snap.data() as SellerProfile;
    }
  }

  // Local fallback
  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<SellerProfile>(`seller_${DEMO_SELLER_ID}`, sampleSellerProfile);
  }
  return getLocal<SellerProfile | null>(`seller_${sellerId}`, null);
}

export async function getSellerBySlug(slug: string): Promise<SellerProfile | null> {
  const cleanSlug = slug.toLowerCase().trim();

  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      const q = query(collection(db, 'sellers'), where('slug', '==', cleanSlug));
      return await getDocs(q);
    });
    if (snap && !snap.empty) {
      return snap.docs[0].data() as SellerProfile;
    }
  }

  // Local lookup
  const allSellers = await getAllSellers();
  const matched = allSellers.find(s => s.slug.toLowerCase() === cleanSlug);
  return matched || (cleanSlug === 'abc-enterprises' ? sampleSellerProfile : null);
}

export async function saveSellerProfile(profile: SellerProfile): Promise<void> {
  const updated: SellerProfile = {
    ...profile,
    updatedAt: Date.now(),
  };

  setLocal(`seller_${profile.id}`, updated);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await setDoc(doc(db, 'sellers', profile.id), updated, { merge: true });
    });
  }
}

// ----------------------------------------------------
// 4. Products APIs
// ----------------------------------------------------
export async function getProducts(sellerId: string): Promise<Product[]> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDocs(collection(db, 'sellers', sellerId, 'products'));
    });
    if (snap && !snap.empty) {
      const items: Product[] = [];
      snap.forEach(d => items.push(d.data() as Product));
      return items.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  }

  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<Product[]>(`products_${DEMO_SELLER_ID}`, sampleProducts);
  }
  return getLocal<Product[]>(`products_${sellerId}`, []);
}

export async function saveProduct(product: Product): Promise<void> {
  const updated: Product = {
    ...product,
    updatedAt: Date.now(),
  };

  const current = getLocal<Product[]>(`products_${product.sellerId}`, product.sellerId === DEMO_SELLER_ID ? sampleProducts : []);
  const index = current.findIndex(p => p.id === product.id);
  if (index >= 0) {
    current[index] = updated;
  } else {
    current.unshift(updated);
  }
  setLocal(`products_${product.sellerId}`, current);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await setDoc(doc(db, 'sellers', product.sellerId, 'products', product.id), updated, { merge: true });
    });
  }
}

export async function deleteProduct(sellerId: string, productId: string): Promise<void> {
  const current = getLocal<Product[]>(`products_${sellerId}`, sellerId === DEMO_SELLER_ID ? sampleProducts : []);
  const filtered = current.filter(p => p.id !== productId);
  setLocal(`products_${sellerId}`, filtered);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await deleteDoc(doc(db, 'sellers', sellerId, 'products', productId));
    });
  }
}

// ----------------------------------------------------
// 5. Categories APIs
// ----------------------------------------------------
export async function getCategories(sellerId: string): Promise<Category[]> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDocs(collection(db, 'sellers', sellerId, 'categories'));
    });
    if (snap && !snap.empty) {
      const items: Category[] = [];
      snap.forEach(d => items.push(d.data() as Category));
      return items.sort((a, b) => a.order - b.order);
    }
  }

  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<Category[]>(`categories_${DEMO_SELLER_ID}`, sampleCategories);
  }
  return getLocal<Category[]>(`categories_${sellerId}`, []);
}

export async function saveCategory(category: Category): Promise<void> {
  const current = getLocal<Category[]>(`categories_${category.sellerId}`, category.sellerId === DEMO_SELLER_ID ? sampleCategories : []);
  const index = current.findIndex(c => c.id === category.id);
  if (index >= 0) {
    current[index] = category;
  } else {
    current.push(category);
  }
  setLocal(`categories_${category.sellerId}`, current);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await setDoc(doc(db, 'sellers', category.sellerId, 'categories', category.id), category, { merge: true });
    });
  }
}

export async function deleteCategory(sellerId: string, categoryId: string): Promise<void> {
  const current = getLocal<Category[]>(`categories_${sellerId}`, sellerId === DEMO_SELLER_ID ? sampleCategories : []);
  setLocal(`categories_${sellerId}`, current.filter(c => c.id !== categoryId));

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await deleteDoc(doc(db, 'sellers', sellerId, 'categories', categoryId));
    });
  }
}

// ----------------------------------------------------
// 6. Website Design & Settings APIs
// ----------------------------------------------------
export async function getWebsiteDesignSettings(sellerId: string): Promise<WebsiteDesignSettings> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDoc(doc(db, 'sellers', sellerId, 'websiteSettings', 'config'));
    });
    if (snap && snap.exists()) {
      return snap.data() as WebsiteDesignSettings;
    }
  }

  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<WebsiteDesignSettings>(`websiteSettings_${DEMO_SELLER_ID}`, sampleWebsiteSettings);
  }
  return getLocal<WebsiteDesignSettings>(`websiteSettings_${sellerId}`, {
    ...sampleWebsiteSettings,
    sellerId,
  });
}

export async function saveWebsiteDesignSettings(settings: WebsiteDesignSettings): Promise<void> {
  const updated = { ...settings, updatedAt: Date.now() };
  setLocal(`websiteSettings_${settings.sellerId}`, updated);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await setDoc(doc(db, 'sellers', settings.sellerId, 'websiteSettings', 'config'), updated, { merge: true });
    });
  }
}

// ----------------------------------------------------
// 7. Social Links APIs
// ----------------------------------------------------
export async function getSocialLinks(sellerId: string): Promise<SocialLinksSettings> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDoc(doc(db, 'sellers', sellerId, 'socialLinks', 'config'));
    });
    if (snap && snap.exists()) {
      return snap.data() as SocialLinksSettings;
    }
  }

  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<SocialLinksSettings>(`socialLinks_${DEMO_SELLER_ID}`, sampleSocialLinks);
  }
  return getLocal<SocialLinksSettings>(`socialLinks_${sellerId}`, {
    sellerId,
    links: sampleSocialLinks.links.map(l => ({ ...l })),
    updatedAt: Date.now(),
  });
}

export async function saveSocialLinks(settings: SocialLinksSettings): Promise<void> {
  const updated = { ...settings, updatedAt: Date.now() };
  setLocal(`socialLinks_${settings.sellerId}`, updated);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await setDoc(doc(db, 'sellers', settings.sellerId, 'socialLinks', 'config'), updated, { merge: true });
    });
  }
}

// ----------------------------------------------------
// 8. SEO Settings APIs
// ----------------------------------------------------
export async function getSeoSettings(sellerId: string): Promise<SeoSettings> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDoc(doc(db, 'sellers', sellerId, 'seo', 'config'));
    });
    if (snap && snap.exists()) {
      return snap.data() as SeoSettings;
    }
  }

  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<SeoSettings>(`seo_${DEMO_SELLER_ID}`, sampleSeoSettings);
  }
  return getLocal<SeoSettings>(`seo_${sellerId}`, {
    ...sampleSeoSettings,
    sellerId,
  });
}

export async function saveSeoSettings(settings: SeoSettings): Promise<void> {
  const updated = { ...settings, updatedAt: Date.now() };
  setLocal(`seo_${settings.sellerId}`, updated);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await setDoc(doc(db, 'sellers', settings.sellerId, 'seo', 'config'), updated, { merge: true });
    });
  }
}

// ----------------------------------------------------
// 9. Custom Domain APIs
// ----------------------------------------------------
export async function getDomainRecord(sellerId: string): Promise<DomainRecord> {
  const fallback: DomainRecord = {
    sellerId,
    customDomain: sellerId === DEMO_SELLER_ID ? 'abcenterprises.com' : '',
    status: sellerId === DEMO_SELLER_ID ? 'active' : 'not_connected',
    verificationToken: `b2b-verify-${sellerId.slice(-8)}`,
    cnameTarget: 'domains.b2bseller.app',
    aRecordIp: '34.120.54.10',
    updatedAt: Date.now(),
  };

  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDoc(doc(db, 'sellers', sellerId, 'domains', 'config'));
    });
    if (snap && snap.exists()) {
      return snap.data() as DomainRecord;
    }
  }

  return getLocal<DomainRecord>(`domain_${sellerId}`, fallback);
}

export async function saveDomainRecord(record: DomainRecord): Promise<void> {
  const updated = { ...record, updatedAt: Date.now() };
  setLocal(`domain_${record.sellerId}`, updated);

  if (isFirestoreClientEnabled) {
    await safeFirestore(async () => {
      await setDoc(doc(db, 'sellers', record.sellerId, 'domains', 'config'), updated, { merge: true });
    });
  }
}

// ----------------------------------------------------
// 10. Admin Overview & Management APIs
// ----------------------------------------------------
export async function getAllSellers(): Promise<SellerProfile[]> {
  if (isFirestoreClientEnabled) {
    const snap = await safeFirestore(async () => {
      return await getDocs(collection(db, 'sellers'));
    });
    if (snap && !snap.empty) {
      const list: SellerProfile[] = [];
      snap.forEach(d => list.push(d.data() as SellerProfile));
      return list;
    }
  }

  const demo = getLocal<SellerProfile>(`seller_${DEMO_SELLER_ID}`, sampleSellerProfile);
  return [demo];
}

export async function getAdminStatistics(): Promise<AdminStats> {
  const sellers = await getAllSellers();
  let totalProductsCount = 0;

  for (const s of sellers) {
    const prods = await getProducts(s.id);
    totalProductsCount += prods.length;
  }

  const activeSellers = sellers.filter(s => s.isActive).length;
  const inactiveSellers = sellers.filter(s => !s.isActive).length;
  const publishedWebsites = sellers.filter(s => s.isPublished).length;
  const customDomainsConnected = sellers.filter(s => s.domainStatus === 'active' || s.domainStatus === 'connected').length;

  return {
    totalSellers: Math.max(sellers.length, 1),
    activeSellers: Math.max(activeSellers, 1),
    inactiveSellers,
    totalProducts: Math.max(totalProductsCount, sampleProducts.length),
    publishedWebsites: Math.max(publishedWebsites, 1),
    customDomainsConnected: Math.max(customDomainsConnected, 1),
  };
}
