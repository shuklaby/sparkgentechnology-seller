import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
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
  ADMIN_PHONE_NUMBER
} from '../data/mockDemoData';

// Local storage fallback cache to ensure seamless zero-lag execution even before Firestore rules propagation
const LOCAL_STORAGE_KEY_PREFIX = 'b2b_saas_';

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
  try {
    const sellerRef = doc(db, 'sellers', DEMO_SELLER_ID);
    const snap = await getDoc(sellerRef);
    if (!snap.exists()) {
      // Seed Demo Seller in Firestore
      await setDoc(sellerRef, sampleSellerProfile);
      
      // Seed subcollections
      for (const cat of sampleCategories) {
        await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'categories', cat.id), cat);
      }
      for (const prod of sampleProducts) {
        await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'products', prod.id), prod);
      }
      await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'websiteSettings', 'config'), sampleWebsiteSettings);
      await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'socialLinks', 'config'), sampleSocialLinks);
      await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'seo', 'config'), sampleSeoSettings);
      await setDoc(doc(db, 'sellers', DEMO_SELLER_ID, 'domains', 'config'), {
        sellerId: DEMO_SELLER_ID,
        customDomain: 'abcenterprises.com',
        status: 'active',
        verificationToken: 'b2b-verify-abc982348234',
        cnameTarget: 'domains.b2bseller.app',
        aRecordIp: '34.120.54.10',
        dnsCheckedAt: Date.now() - 3600000,
        sslIssuedAt: Date.now() - 3600000,
        updatedAt: Date.now(),
      } as DomainRecord);
    }
  } catch (err) {
    console.warn('Firestore remote seeding skipped or offline. Local state fallback engaged:', err);
  }

  // Ensure local memory cache is populated
  if (!getLocal(`seller_${DEMO_SELLER_ID}`, null)) {
    setLocal(`seller_${DEMO_SELLER_ID}`, sampleSellerProfile);
    setLocal(`categories_${DEMO_SELLER_ID}`, sampleCategories);
    setLocal(`products_${DEMO_SELLER_ID}`, sampleProducts);
    setLocal(`websiteSettings_${DEMO_SELLER_ID}`, sampleWebsiteSettings);
    setLocal(`socialLinks_${DEMO_SELLER_ID}`, sampleSocialLinks);
    setLocal(`seo_${DEMO_SELLER_ID}`, sampleSeoSettings);
  }
}

// ----------------------------------------------------
// 2. User Record Operations
// ----------------------------------------------------
export async function getUserRecord(uid: string): Promise<AppUser | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as AppUser;
    }
  } catch (err) {
    console.error('Error loading user record from Firestore:', err);
  }
  return null;
}


// ----------------------------------------------------
// 3. Seller Profile APIs
// ----------------------------------------------------
export async function getSellerById(sellerId: string): Promise<SellerProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'sellers', sellerId));
    if (snap.exists()) {
      return snap.data() as SellerProfile;
    }
  } catch (e) {
    console.warn('Firestore fetch failed, checking local storage:', e);
  }

  // Local fallback
  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<SellerProfile>(`seller_${DEMO_SELLER_ID}`, sampleSellerProfile);
  }
  return getLocal<SellerProfile | null>(`seller_${sellerId}`, null);
}

export async function getSellerBySlug(slug: string): Promise<SellerProfile | null> {
  const cleanSlug = slug.toLowerCase().trim();
  try {
    const q = query(collection(db, 'sellers'), where('slug', '==', cleanSlug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as SellerProfile;
    }
  } catch (e) {
    console.warn('Firestore slug lookup fallback to local:', e);
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

  try {
    await setDoc(doc(db, 'sellers', profile.id), updated, { merge: true });
  } catch (e) {
    console.warn('Firestore write fallback to local:', e);
  }

  setLocal(`seller_${profile.id}`, updated);
}

// ----------------------------------------------------
// 4. Products APIs
// ----------------------------------------------------
export async function getProducts(sellerId: string): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(db, 'sellers', sellerId, 'products'));
    if (!snap.empty) {
      const items: Product[] = [];
      snap.forEach(d => items.push(d.data() as Product));
      return items.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch (e) {
    console.warn('Firestore getProducts fallback to local:', e);
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

  try {
    await setDoc(doc(db, 'sellers', product.sellerId, 'products', product.id), updated, { merge: true });
  } catch (e) {
    console.warn('Firestore saveProduct error:', e);
  }

  // Update local storage
  const current = getLocal<Product[]>(`products_${product.sellerId}`, product.sellerId === DEMO_SELLER_ID ? sampleProducts : []);
  const index = current.findIndex(p => p.id === product.id);
  if (index >= 0) {
    current[index] = updated;
  } else {
    current.unshift(updated);
  }
  setLocal(`products_${product.sellerId}`, current);
}

export async function deleteProduct(sellerId: string, productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sellers', sellerId, 'products', productId));
  } catch (e) {
    console.warn('Firestore deleteProduct error:', e);
  }

  const current = getLocal<Product[]>(`products_${sellerId}`, sellerId === DEMO_SELLER_ID ? sampleProducts : []);
  const filtered = current.filter(p => p.id !== productId);
  setLocal(`products_${sellerId}`, filtered);
}

// ----------------------------------------------------
// 5. Categories APIs
// ----------------------------------------------------
export async function getCategories(sellerId: string): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, 'sellers', sellerId, 'categories'));
    if (!snap.empty) {
      const items: Category[] = [];
      snap.forEach(d => items.push(d.data() as Category));
      return items.sort((a, b) => a.order - b.order);
    }
  } catch (e) {
    console.warn('Firestore getCategories fallback:', e);
  }

  if (sellerId === DEMO_SELLER_ID) {
    return getLocal<Category[]>(`categories_${DEMO_SELLER_ID}`, sampleCategories);
  }
  return getLocal<Category[]>(`categories_${sellerId}`, []);
}

export async function saveCategory(category: Category): Promise<void> {
  try {
    await setDoc(doc(db, 'sellers', category.sellerId, 'categories', category.id), category, { merge: true });
  } catch (e) {
    console.warn('Firestore saveCategory error:', e);
  }

  const current = getLocal<Category[]>(`categories_${category.sellerId}`, category.sellerId === DEMO_SELLER_ID ? sampleCategories : []);
  const index = current.findIndex(c => c.id === category.id);
  if (index >= 0) {
    current[index] = category;
  } else {
    current.push(category);
  }
  setLocal(`categories_${category.sellerId}`, current);
}

export async function deleteCategory(sellerId: string, categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sellers', sellerId, 'categories', categoryId));
  } catch (e) {
    console.warn('Firestore deleteCategory error:', e);
  }

  const current = getLocal<Category[]>(`categories_${sellerId}`, sellerId === DEMO_SELLER_ID ? sampleCategories : []);
  setLocal(`categories_${sellerId}`, current.filter(c => c.id !== categoryId));
}

// ----------------------------------------------------
// 6. Website Design & Settings APIs
// ----------------------------------------------------
export async function getWebsiteDesignSettings(sellerId: string): Promise<WebsiteDesignSettings> {
  try {
    const snap = await getDoc(doc(db, 'sellers', sellerId, 'websiteSettings', 'config'));
    if (snap.exists()) {
      return snap.data() as WebsiteDesignSettings;
    }
  } catch (e) {
    console.warn('Firestore website settings fallback:', e);
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
  try {
    await setDoc(doc(db, 'sellers', settings.sellerId, 'websiteSettings', 'config'), updated, { merge: true });
  } catch (e) {
    console.warn('Firestore save websiteSettings error:', e);
  }
  setLocal(`websiteSettings_${settings.sellerId}`, updated);
}

// ----------------------------------------------------
// 7. Social Links APIs
// ----------------------------------------------------
export async function getSocialLinks(sellerId: string): Promise<SocialLinksSettings> {
  try {
    const snap = await getDoc(doc(db, 'sellers', sellerId, 'socialLinks', 'config'));
    if (snap.exists()) {
      return snap.data() as SocialLinksSettings;
    }
  } catch (e) {
    console.warn('Firestore getSocialLinks error:', e);
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
  try {
    await setDoc(doc(db, 'sellers', settings.sellerId, 'socialLinks', 'config'), updated, { merge: true });
  } catch (e) {
    console.warn('Firestore saveSocialLinks error:', e);
  }
  setLocal(`socialLinks_${settings.sellerId}`, updated);
}

// ----------------------------------------------------
// 8. SEO Settings APIs
// ----------------------------------------------------
export async function getSeoSettings(sellerId: string): Promise<SeoSettings> {
  try {
    const snap = await getDoc(doc(db, 'sellers', sellerId, 'seo', 'config'));
    if (snap.exists()) {
      return snap.data() as SeoSettings;
    }
  } catch (e) {
    console.warn('Firestore getSeoSettings error:', e);
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
  try {
    await setDoc(doc(db, 'sellers', settings.sellerId, 'seo', 'config'), updated, { merge: true });
  } catch (e) {
    console.warn('Firestore saveSeoSettings error:', e);
  }
  setLocal(`seo_${settings.sellerId}`, updated);
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

  try {
    const snap = await getDoc(doc(db, 'sellers', sellerId, 'domains', 'config'));
    if (snap.exists()) {
      return snap.data() as DomainRecord;
    }
  } catch (e) {
    console.warn('Firestore getDomainRecord error:', e);
  }

  return getLocal<DomainRecord>(`domain_${sellerId}`, fallback);
}

export async function saveDomainRecord(record: DomainRecord): Promise<void> {
  const updated = { ...record, updatedAt: Date.now() };
  try {
    await setDoc(doc(db, 'sellers', record.sellerId, 'domains', 'config'), updated, { merge: true });
  } catch (e) {
    console.warn('Firestore saveDomainRecord error:', e);
  }
  setLocal(`domain_${record.sellerId}`, updated);
}

// ----------------------------------------------------
// 10. Admin Overview & Management APIs
// ----------------------------------------------------
export async function getAllSellers(): Promise<SellerProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'sellers'));
    if (!snap.empty) {
      const list: SellerProfile[] = [];
      snap.forEach(d => list.push(d.data() as SellerProfile));
      return list;
    }
  } catch (e) {
    console.warn('Firestore getAllSellers error:', e);
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
