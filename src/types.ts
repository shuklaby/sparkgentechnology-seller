export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'SELLER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  mobileNumber?: string; // Optional, NOT used for authentication
  sellerId?: string; // If role is SELLER, matches the seller document ID
  assignedPermissions?: string[];
  createdAt: number;
  lastLoginAt: number;
  updatedAt?: number;
}

export interface SellerProfile {
  id: string; // sellerId (usually uid or unique slug)
  companyName: string;
  slug: string; // e.g. "abc-enterprises"
  logoUrl: string;
  businessDescription: string;
  mobileNumber: string;
  whatsappNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  googleMapsUrl: string;
  businessType: 'Manufacturer' | 'Wholesaler' | 'Exporter' | 'Distributor' | 'Trader' | 'OEM/ODM Service';
  yearEstablished: number;
  isActive: boolean;
  isPublished: boolean;
  ownerUid: string;
  createdAt: number;
  updatedAt: number;
  subscriptionPlan?: 'Starter' | 'Growth' | 'Enterprise';
  customDomain?: string;
  domainStatus?: DomainStatus;
}

export interface ProductSpecification {
  id: string;
  key: string;
  value: string;
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  unit: string; // e.g. "Piece", "Kg", "Meter", "Box", "Set", "Ton"
  sku: string;
  categoryId: string;
  categoryName: string;
  subCategory?: string;
  minOrderQuantity: number;
  stockQuantity?: number; // Available inventory count
  inStock?: boolean;
  isPublished: boolean;
  images: string[];
  specifications: ProductSpecification[];
  keywords: string[];
  keyFeatures?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
  order: number;
}

export type WebsiteTemplateType = 'modern-business' | 'industrial-manufacturer' | 'clean-wholesale';

export interface WebsiteSectionSettings {
  hero: boolean;
  aboutCompany: boolean;
  categories: boolean;
  products: boolean;
  whyChooseUs: boolean;
  gallery: boolean;
  testimonials: boolean;
  contact: boolean;
  location: boolean;
  socialLinks: boolean;
  footer: boolean;
}

export interface WebsiteDesignSettings {
  sellerId: string;
  template: WebsiteTemplateType;
  primaryColor: string;
  secondaryColor: string;
  fontStyle: 'inter' | 'plus-jakarta' | 'playfair' | 'roboto-mono' | 'outfit';
  buttonStyle: 'rounded-md' | 'rounded-full' | 'rounded-none';
  headerStyle: 'sticky-glass' | 'solid-minimal' | 'bold-dark';
  productCardStyle: 'card-modern' | 'card-bordered' | 'card-compact';
  heroHeadline?: string;
  heroSubheadline?: string;
  heroBannerUrl?: string;
  heroCtaText?: string;
  sections: WebsiteSectionSettings;
  whyChooseUsItems?: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  testimonials?: Array<{
    author: string;
    company: string;
    quote: string;
    rating: number;
  }>;
  galleryImages?: string[];
  updatedAt: number;
}

export interface SocialLinkItem {
  id: string;
  platform: 'whatsapp' | 'youtube' | 'instagram' | 'facebook' | 'googleBusiness' | 'googleMaps' | 'email' | 'phone' | 'linkedin' | 'website';
  label: string;
  value: string;
  isEnabled: boolean;
  customMessage?: string; // For WhatsApp pre-filled enquiry message
}

export interface SocialLinksSettings {
  sellerId: string;
  links: SocialLinkItem[];
  updatedAt: number;
}

export interface SeoSettings {
  sellerId: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  updatedAt: number;
}

export type DomainStatus = 'not_connected' | 'verification_pending' | 'connected' | 'ssl_pending' | 'active';

export interface DomainRecord {
  sellerId: string;
  customDomain: string;
  status: DomainStatus;
  verificationToken: string;
  cnameTarget: string; // e.g. "domains.b2bseller.app"
  aRecordIp: string; // e.g. "34.120.54.10"
  dnsCheckedAt?: number;
  sslIssuedAt?: number;
  updatedAt: number;
}

export interface AdminStats {
  totalSellers: number;
  activeSellers: number;
  inactiveSellers: number;
  totalProducts: number;
  publishedWebsites: number;
  customDomainsConnected: number;
}

// ----------------------------------------------------
// E-Commerce Ordering System Types
// ----------------------------------------------------

export type OrderStatus = 'NEW' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unit?: string;
}

export interface OrderDeliveryAddress {
  fullName: string;
  mobileNumber: string;
  email: string;
  houseNumber: string;
  streetArea: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  fullAddress: string;
}

export interface Order {
  id: string; // e.g. ORD-2026-000001
  sellerId: string;
  sellerName?: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  deliveryAddress: OrderDeliveryAddress;
  orderNotes?: string;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  isReadBySeller: boolean;
  emailSent?: boolean;
  createdAt: number;
  updatedAt: number;
  timeline?: Array<{
    status: OrderStatus;
    timestamp: number;
    note?: string;
  }>;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  total: number;
}

