import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Package,
  Layers,
  Palette,
  Share2,
  Globe,
  Search,
  Eye,
  Send,
  Plus,
  Edit,
  Trash2,
  Copy,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  MapPin,
  RefreshCw,
  LogOut,
  Sliders,
  Check,
  ChevronRight,
  ShieldCheck,
  Award,
  DollarSign,
  HelpCircle,
  Table,
  Grid3X3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  SellerProfile,
  Product,
  Category,
  WebsiteDesignSettings,
  SocialLinksSettings,
  SeoSettings,
  DomainRecord,
  DomainStatus,
  WebsiteTemplateType
} from '../types';
import {
  saveSellerProfile,
  getProducts,
  saveProduct,
  deleteProduct,
  getCategories,
  saveCategory,
  deleteCategory,
  getWebsiteDesignSettings,
  saveWebsiteDesignSettings,
  getSocialLinks,
  saveSocialLinks,
  getSeoSettings,
  saveSeoSettings,
  getDomainRecord,
  saveDomainRecord
} from '../lib/dbService';
import { ProductEditorModal } from './ProductEditorModal';
import { PublicSellerWebsite } from './PublicSellerWebsite';

interface SellerDashboardProps {
  seller: SellerProfile;
  onUpdateSeller: (updated: SellerProfile) => void;
  onLogout: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  seller,
  onUpdateSeller,
  onLogout,
}) => {
  // Navigation tabs matching the exact 10 sections requested
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'company_profile'
    | 'product_catalog'
    | 'categories'
    | 'website_designer'
    | 'social_links'
    | 'seo_settings'
    | 'domain_settings'
    | 'website_preview'
    | 'publish_website'
  >('dashboard');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [designSettings, setDesignSettings] = useState<WebsiteDesignSettings | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinksSettings | null>(null);
  const [seoSettings, setSeoSettings] = useState<SeoSettings | null>(null);
  const [domainRecord, setDomainRecord] = useState<DomainRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<SellerProfile>({ ...seller });
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [seoKeywordInput, setSeoKeywordInput] = useState('');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [catalogViewMode, setCatalogViewMode] = useState<'table' | 'grid'>('table');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSellerData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats, design, socials, seo, domain] = await Promise.all([
        getProducts(seller.id),
        getCategories(seller.id),
        getWebsiteDesignSettings(seller.id),
        getSocialLinks(seller.id),
        getSeoSettings(seller.id),
        getDomainRecord(seller.id),
      ]);
      setProducts(prods);
      setCategories(cats);
      setDesignSettings(design);
      setSocialLinks(socials);
      setSeoSettings(seo);
      setDomainRecord(domain);
      setProfileForm({ ...seller });
    } catch (err) {
      console.warn('Error loading seller data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [seller.id]);

  // Handlers for Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSellerProfile(profileForm);
    onUpdateSeller(profileForm);
    showToast('Company profile successfully updated.');
  };

  // Handlers for Products
  const handleSaveProduct = async (prod: Product) => {
    await saveProduct(prod);
    const updated = await getProducts(seller.id);
    setProducts(updated);
    setIsProductModalOpen(false);
    setEditingProduct(null);
    showToast(`Product "${prod.name}" saved to catalog.`);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    await deleteProduct(seller.id, id);
    setProducts(products.filter((p) => p.id !== id));
    showToast('Product removed.');
  };

  const handleDuplicateProduct = async (prod: Product) => {
    const duplicated: Product = {
      ...prod,
      id: `prod-${Date.now()}`,
      name: `${prod.name} (Copy)`,
      sku: `${prod.sku}-COPY`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveProduct(duplicated);
    setProducts([duplicated, ...products]);
    showToast(`Duplicated product created.`);
  };

  const handleTogglePublishProduct = async (prod: Product) => {
    const updated: Product = { ...prod, isPublished: !prod.isPublished };
    await saveProduct(updated);
    setProducts(products.map((p) => (p.id === prod.id ? updated : p)));
    showToast(`Product set to ${updated.isPublished ? 'Published' : 'Hidden'}.`);
  };

  // Handlers for Categories
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    await saveCategory(editingCategory);
    const updatedCats = await getCategories(seller.id);
    setCategories(updatedCats);
    setCategoryModalOpen(false);
    setEditingCategory(null);
    showToast('Category saved.');
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Delete this category?')) return;
    await deleteCategory(seller.id, catId);
    setCategories(categories.filter((c) => c.id !== catId));
    showToast('Category deleted.');
  };

  // Handlers for Website Designer
  const handleUpdateDesign = async (newDesign: WebsiteDesignSettings) => {
    setDesignSettings(newDesign);
    await saveWebsiteDesignSettings(newDesign);
  };

  // Handlers for Social Links
  const handleToggleSocial = async (index: number) => {
    if (!socialLinks) return;
    const updated = { ...socialLinks };
    updated.links[index].isEnabled = !updated.links[index].isEnabled;
    setSocialLinks(updated);
    await saveSocialLinks(updated);
  };

  const handleUpdateSocialValue = async (index: number, val: string, customMsg?: string) => {
    if (!socialLinks) return;
    const updated = { ...socialLinks };
    updated.links[index].value = val;
    if (customMsg !== undefined) updated.links[index].customMessage = customMsg;
    setSocialLinks(updated);
    await saveSocialLinks(updated);
  };

  // Handlers for SEO
  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seoSettings) return;
    await saveSeoSettings(seoSettings);
    showToast('SEO metadata saved.');
  };

  // Handlers for Domain Settings
  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainRecord) return;
    await saveDomainRecord(domainRecord);
    showToast('Domain record saved.');
  };

  const handleSimulateDnsCheck = async () => {
    if (!domainRecord || !domainRecord.customDomain) return;
    setIsVerifyingDomain(true);
    setTimeout(async () => {
      setIsVerifyingDomain(false);
      const isConfigured = domainRecord.customDomain.includes('.');
      const updated: DomainRecord = {
        ...domainRecord,
        status: isConfigured ? 'active' : 'verification_pending',
        dnsCheckedAt: Date.now(),
        sslIssuedAt: isConfigured ? Date.now() : undefined,
      };
      setDomainRecord(updated);
      await saveDomainRecord(updated);

      const updatedSeller: SellerProfile = {
        ...seller,
        customDomain: updated.customDomain,
        domainStatus: updated.status,
      };
      onUpdateSeller(updatedSeller);
      await saveSellerProfile(updatedSeller);

      showToast(
        isConfigured
          ? `CNAME verified! Domain is now ACTIVE with SSL.`
          : `Verification pending. Please configure DNS CNAME record.`
      );
    }, 1200);
  };

  // Publish / Unpublish handler
  const handleTogglePublishSite = async (publish: boolean) => {
    const updated: SellerProfile = {
      ...seller,
      isPublished: publish,
    };
    await saveSellerProfile(updated);
    onUpdateSeller(updated);
    if (publish) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast('🎉 Website Published! Your B2B website is live to the world.');
    } else {
      showToast('Website Unpublished and switched to Draft.');
    }
  };

  interface NavItem {
    id: typeof activeTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'company_profile', label: 'Company Profile', icon: Building2 },
    { id: 'product_catalog', label: 'Product Catalog', icon: Package, badge: products.length },
    { id: 'categories', label: 'Categories', icon: Layers, badge: categories.length },
    { id: 'website_designer', label: 'Website Designer', icon: Palette },
    { id: 'social_links', label: 'Social & Business Links', icon: Share2 },
    { id: 'seo_settings', label: 'SEO Settings', icon: Search },
    { id: 'domain_settings', label: 'Domain Settings', icon: Globe },
    { id: 'website_preview', label: 'Website Preview', icon: Eye },
    { id: 'publish_website', label: 'Publish Website', icon: Send },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-slate-900 font-sans">
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#0F172A] text-white flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm">
              {seller.companyName ? seller.companyName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h2 className="font-semibold text-base text-white tracking-tight leading-tight truncate max-w-[140px]">
                {seller.companyName}
              </h2>
              <span className="text-[11px] text-slate-400">SellerPort</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Tenant Details */}
        <div className="p-4 mt-auto border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 bg-slate-800/50 p-2.5 rounded-lg border border-slate-800/80">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {seller.companyName ? seller.companyName.slice(0, 2).toUpperCase() : 'SE'}
            </div>
            <div className="text-xs min-w-0 flex-1">
              <p className="text-white font-medium truncate">{seller.companyName}</p>
              <p className="text-slate-500 font-mono text-[10px] truncate">ID: {seller.id.slice(0, 10)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => setActiveTab('website_preview')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" /> Preview Site
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 text-xs transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-800 capitalize">
              {activeTab.replace('_', ' ')}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                seller.isPublished
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              {seller.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('website_preview')}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              Preview Site
            </button>

            {activeTab === 'product_catalog' && (
              <button
                id="header-add-product-btn"
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            )}

            {activeTab !== 'product_catalog' && (
              seller.isPublished ? (
                <button
                  onClick={() => handleTogglePublishSite(false)}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  onClick={() => handleTogglePublishSite(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Publish Site
                </button>
              )
            )}
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="p-6 sm:p-8 flex-1 overflow-y-auto">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-6xl">
              {/* Gemini AI Highlight Banner */}
              <div className="bg-blue-600 rounded-xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between shadow-lg shadow-blue-200/50 gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold text-blue-100">
                    <Sparkles className="w-3.5 h-3.5 text-white" /> Gemini AI Enabled
                  </div>
                  <h3 className="text-lg font-bold">Generate with Gemini AI</h3>
                  <p className="text-blue-100 text-sm">
                    Enter a few keywords to automatically create technical descriptions, specifications, and keywords.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-bold shadow-sm transition"
                  >
                    Launch Product Generator
                  </button>
                </div>
              </div>

              {/* Stats Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Products</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{products.length}</div>
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    {products.filter((p) => p.isPublished).length} Published Online
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categories</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</div>
                  <span className="text-xs text-slate-500 font-medium mt-1 block">Active verticals</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Domain Status</span>
                  <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                    {domainRecord?.customDomain || `/site/${seller.slug}`}
                  </div>
                  <span
                    className={`text-xs font-medium flex items-center gap-1 mt-1 ${
                      domainRecord?.status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${
                        domainRecord?.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {domainRecord?.status === 'active' ? 'Custom CNAME' : 'Subpath Routing'}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Template Archetype</span>
                  <div className="text-sm font-bold text-slate-900 mt-1 capitalize">
                    {designSettings?.template?.replace('-', ' ') || 'Modern Business'}
                  </div>
                  <span className="text-xs text-blue-600 font-medium mt-1 block">Live synced</span>
                </div>
              </div>

              {/* Inventory Management Overview Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Recent Products & Inventory
                  </span>
                  <button
                    onClick={() => setActiveTab('product_catalog')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View All ({products.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/50 text-slate-500 text-xs">
                    <tr>
                      <th className="px-6 py-3 border-b border-slate-100 font-medium">Product Details</th>
                      <th className="px-6 py-3 border-b border-slate-100 font-medium">Category</th>
                      <th className="px-6 py-3 border-b border-slate-100 font-medium">Price</th>
                      <th className="px-6 py-3 border-b border-slate-100 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.slice(0, 4).map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-10 h-10 bg-slate-100 rounded border border-slate-200 object-cover shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{prod.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono uppercase">SKU: {prod.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">{prod.categoryName}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          ₹{prod.price.toLocaleString()} / {prod.unit}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span
                            className={`w-2 h-2 rounded-full inline-block mr-2 ${
                              prod.isPublished ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span className={prod.isPublished ? 'text-slate-800' : 'text-slate-500'}>
                            {prod.isPublished ? 'Active' : 'Draft'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY PROFILE */}
          {activeTab === 'company_profile' && (
            <div className="max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Company & Factory Profile</h3>
                  <p className="text-xs text-slate-500">
                    Manage legal entity name, contact desks, factory address, and corporate credentials.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Registered Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.companyName}
                      onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Website URL Slug (/site/...) *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.slug}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-blue-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Logo URL</label>
                  <div className="flex gap-3 items-center">
                    <img
                      src={profileForm.logoUrl || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100'}
                      alt="Logo Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                    />
                    <input
                      type="url"
                      value={profileForm.logoUrl}
                      onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Business / Industrial Description
                  </label>
                  <textarea
                    rows={4}
                    value={profileForm.businessDescription}
                    onChange={(e) => setProfileForm({ ...profileForm, businessDescription: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Mobile *</label>
                    <input
                      type="text"
                      required
                      value={profileForm.mobileNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">WhatsApp RFQ Desk *</label>
                    <input
                      type="text"
                      required
                      value={profileForm.whatsappNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, whatsappNumber: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sales Email *</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Business Type</label>
                    <select
                      value={profileForm.businessType}
                      onChange={(e: any) => setProfileForm({ ...profileForm, businessType: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Exporter">Exporter</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Trader">Trader</option>
                      <option value="OEM/ODM Service">OEM/ODM Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year Established</label>
                    <input
                      type="number"
                      value={profileForm.yearEstablished}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, yearEstablished: parseInt(e.target.value) || 2000 })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Factory Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
                    <input
                      type="text"
                      value={profileForm.state}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pincode / Postal Code</label>
                    <input
                      type="text"
                      value={profileForm.pincode}
                      onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Google Maps Link</label>
                    <input
                      type="url"
                      value={profileForm.googleMapsUrl}
                      onChange={(e) => setProfileForm({ ...profileForm, googleMapsUrl: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                  >
                    Save Company Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PRODUCT CATALOG */}
          {activeTab === 'product_catalog' && (
            <div className="space-y-6 max-w-6xl">
              {/* Top Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">B2B Product Catalog</h3>
                  <p className="text-xs text-slate-500">
                    Manage industrial inventory, wholesale pricing tiers, technical specs, and Gemini AI copy.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="add-product-btn"
                    onClick={() => {
                      setEditingProduct(null);
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar with View Switcher */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      placeholder="Search by title, SKU, or specs..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={catalogCategoryFilter}
                    onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="ALL">All Categories ({products.length})</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 self-end md:self-auto border border-slate-200 rounded-lg p-1 bg-slate-50">
                  <button
                    onClick={() => setCatalogViewMode('table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                      catalogViewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" /> Table
                  </button>
                  <button
                    onClick={() => setCatalogViewMode('grid')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                      catalogViewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" /> Grid
                  </button>
                </div>
              </div>

              {/* View 1: Clean Utility Table */}
              {catalogViewMode === 'table' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50/75 text-slate-500 text-xs">
                      <tr>
                        <th className="px-6 py-3.5 border-b border-slate-100 font-medium">Product Details</th>
                        <th className="px-6 py-3.5 border-b border-slate-100 font-medium">Category</th>
                        <th className="px-6 py-3.5 border-b border-slate-100 font-medium">Wholesale Price</th>
                        <th className="px-6 py-3.5 border-b border-slate-100 font-medium">Min Order</th>
                        <th className="px-6 py-3.5 border-b border-slate-100 font-medium">Status</th>
                        <th className="px-6 py-3.5 border-b border-slate-100 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products
                        .filter((p) => {
                          const matchesSearch =
                            p.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
                            p.sku.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
                            p.description.toLowerCase().includes(catalogSearchQuery.toLowerCase());
                          const matchesCat =
                            catalogCategoryFilter === 'ALL' ||
                            p.categoryId === catalogCategoryFilter ||
                            p.categoryName === catalogCategoryFilter;
                          return matchesSearch && matchesCat;
                        })
                        .map((prod) => (
                          <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <img
                                src={prod.images[0]}
                                alt={prod.name}
                                className="w-11 h-11 bg-slate-100 rounded-lg border border-slate-200 object-cover shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{prod.name}</p>
                                <p className="text-xs text-slate-400 font-mono uppercase">SKU: {prod.sku}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600">{prod.categoryName}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-800">
                              ₹{prod.price.toLocaleString()} / {prod.unit}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                              {prod.minOrderQuantity} {prod.unit}s
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <button
                                onClick={() => handleTogglePublishProduct(prod)}
                                className="inline-flex items-center text-xs hover:underline cursor-pointer"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full inline-block mr-2 ${
                                    prod.isPublished ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                <span className={prod.isPublished ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                                  {prod.isPublished ? 'Active' : 'Draft'}
                                </span>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-xs text-right space-x-1">
                              <button
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setIsProductModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded text-xs font-medium transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(prod)}
                                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-medium transition"
                                title="Duplicate"
                              >
                                Clone
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="px-2.5 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs font-medium transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Cards Grid */}
              {catalogViewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products
                    .filter((p) => {
                      const matchesSearch =
                        p.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
                        p.sku.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
                        p.description.toLowerCase().includes(catalogSearchQuery.toLowerCase());
                      const matchesCat =
                        catalogCategoryFilter === 'ALL' ||
                        p.categoryId === catalogCategoryFilter ||
                        p.categoryName === catalogCategoryFilter;
                      return matchesSearch && matchesCat;
                    })
                    .map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-video bg-slate-100">
                            <img
                              src={prod.images[0]}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleTogglePublishProduct(prod)}
                              className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ${
                                prod.isPublished
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-700 text-slate-200'
                              }`}
                            >
                              {prod.isPublished ? 'Published' : 'Hidden'}
                            </button>
                            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-white/90 font-mono text-[10px] font-bold text-slate-900 shadow-sm">
                              {prod.sku}
                            </span>
                          </div>

                          <div className="p-4 space-y-2">
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                              {prod.categoryName}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                              {prod.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {prod.description}
                            </p>
                            <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                              <span className="text-sm font-extrabold text-slate-900">
                                ₹{prod.price.toLocaleString()}{' '}
                                <span className="text-xs font-normal text-slate-500">/ {prod.unit}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                MOQ: {prod.minOrderQuantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
                          <button
                            onClick={() => handleDuplicateProduct(prod)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition"
                            title="Duplicate Product"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingProduct(prod);
                                setIsProductModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded transition flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="max-w-4xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Product Categories</h3>
                  <p className="text-xs text-slate-500">
                    Group your wholesale inventory into distinct business verticals.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingCategory({
                      id: `cat-${Date.now()}`,
                      sellerId: seller.id,
                      name: '',
                      slug: '',
                      order: categories.length + 1,
                    });
                    setCategoryModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-slate-100 font-bold text-xs text-slate-500 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{cat.name}</h4>
                        <span className="text-[11px] font-mono text-slate-400">/{cat.slug}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded text-xs font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="px-2.5 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs font-medium transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: WEBSITE DESIGNER */}
          {activeTab === 'website_designer' && designSettings && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Visual Website Designer</h3>
                <p className="text-xs text-slate-500">
                  Select your theme template, color identity, header stylings & toggle public sections.
                </p>
              </div>

              {/* 3 Website Templates Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select B2B Website Template (3 Archetypes)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'modern-business' as WebsiteTemplateType,
                      title: '1. Modern Business',
                      desc: 'Polished high-contrast corporate aesthetic with subtle dark hero accents.',
                    },
                    {
                      id: 'industrial-manufacturer' as WebsiteTemplateType,
                      title: '2. Industrial / Manufacturer',
                      desc: 'Heavy duty dark engineering theme designed for OEM & machinery exporters.',
                    },
                    {
                      id: 'clean-wholesale' as WebsiteTemplateType,
                      title: '3. Clean Wholesale',
                      desc: 'Light, crisp high-density product grid optimized for distributors & importers.',
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleUpdateDesign({ ...designSettings, template: tpl.id })}
                      className={`p-4 rounded-xl border text-left transition ${
                        designSettings.template === tpl.id
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        {tpl.title}
                        {designSettings.template === tpl.id && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Identity & Typography */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Brand Colors & Font Styling
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={designSettings.primaryColor}
                        onChange={(e) =>
                          handleUpdateDesign({ ...designSettings, primaryColor: e.target.value })
                        }
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={designSettings.primaryColor}
                        onChange={(e) =>
                          handleUpdateDesign({ ...designSettings, primaryColor: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Button Corners</label>
                    <select
                      value={designSettings.buttonStyle}
                      onChange={(e: any) =>
                        handleUpdateDesign({ ...designSettings, buttonStyle: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="rounded-md">Rounded (Modern)</option>
                      <option value="rounded-full">Pill (Smooth)</option>
                      <option value="rounded-none">Square (Industrial)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Header Style</label>
                    <select
                      value={designSettings.headerStyle}
                      onChange={(e: any) =>
                        handleUpdateDesign({ ...designSettings, headerStyle: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="sticky-glass">Sticky Glass (Default)</option>
                      <option value="solid-minimal">Solid Minimal</option>
                      <option value="bold-dark">Bold Dark Banner</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sections Enable / Disable Toggles */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Page Sections Visibility Toggles
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {Object.entries(designSettings.sections).map(([secKey, isEnabled]) => (
                    <button
                      key={secKey}
                      type="button"
                      onClick={() =>
                        handleUpdateDesign({
                          ...designSettings,
                          sections: {
                            ...designSettings.sections,
                            [secKey]: !isEnabled,
                          },
                        })
                      }
                      className={`p-3 rounded-lg border flex items-center justify-between font-semibold transition ${
                        isEnabled
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="capitalize">{secKey.replace(/([A-Z])/g, ' $1')}</span>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                          isEnabled ? 'bg-blue-600 text-white' : 'bg-slate-300 text-white'
                        }`}
                      >
                        {isEnabled ? '✓' : '✕'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SOCIAL & BUSINESS LINKS */}
          {activeTab === 'social_links' && socialLinks && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Social & Business Links</h3>
                <p className="text-xs text-slate-500">
                  Configure direct enquiry channels. Disabled channels automatically disappear from public pages.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 p-2 overflow-hidden shadow-sm">
                {socialLinks.links.map((link, idx) => (
                  <div key={link.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{link.label}</span>
                        {link.platform === 'whatsapp' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Primary RFQ Channel
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSocial(idx)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          link.isEnabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {link.isEnabled ? 'Active ON' : 'Disabled OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={link.value}
                        onChange={(e) => handleUpdateSocialValue(idx, e.target.value)}
                        placeholder={`Enter ${link.label} URL or phone number...`}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      {link.platform === 'whatsapp' && (
                        <input
                          type="text"
                          value={link.customMessage || ''}
                          onChange={(e) => handleUpdateSocialValue(idx, link.value, e.target.value)}
                          placeholder="Pre-filled enquiry greeting message..."
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SEO SETTINGS */}
          {activeTab === 'seo_settings' && seoSettings && (
            <div className="max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">SEO & Social Meta Configuration</h3>
                <p className="text-xs text-slate-500">
                  Optimize search engine indexing, Open Graph social share cards & canonical URLs for Google bots.
                </p>
              </div>

              <form onSubmit={handleSaveSeo} className="p-6 sm:p-8 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Meta SEO Page Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={seoSettings.seoTitle}
                    onChange={(e) => setSeoSettings({ ...seoSettings, seoTitle: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Meta Description (150-160 chars recommended)
                  </label>
                  <textarea
                    rows={3}
                    value={seoSettings.metaDescription}
                    onChange={(e) => setSeoSettings({ ...seoSettings, metaDescription: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">OG Share Title</label>
                    <input
                      type="text"
                      value={seoSettings.ogTitle}
                      onChange={(e) => setSeoSettings({ ...seoSettings, ogTitle: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Canonical URL</label>
                    <input
                      type="url"
                      value={seoSettings.canonicalUrl}
                      onChange={(e) => setSeoSettings({ ...seoSettings, canonicalUrl: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">OG Image Banner URL</label>
                  <input
                    type="url"
                    value={seoSettings.ogImageUrl}
                    onChange={(e) => setSeoSettings({ ...seoSettings, ogImageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                  >
                    Save SEO Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: CUSTOM DOMAIN SETTINGS */}
          {activeTab === 'domain_settings' && domainRecord && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Custom Domain Connection & DNS Hub</h3>
                <p className="text-xs text-slate-500">
                  Connect your own corporate domain (e.g. abcenterprises.com) directly to your multi-tenant catalog.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
                <form onSubmit={handleSaveDomain} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Custom Domain Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="custom-domain-input"
                        type="text"
                        value={domainRecord.customDomain}
                        onChange={(e) =>
                          setDomainRecord({ ...domainRecord, customDomain: e.target.value.toLowerCase().trim() })
                        }
                        placeholder="e.g. abcenterprises.com"
                        className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm transition"
                      >
                        Save Domain
                      </button>
                    </div>
                  </div>
                </form>

                {/* Verification Architecture Banner */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">DNS Configuration Instructions</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        domainRecord.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Status: {domainRecord.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-200">
                          <th className="py-2">Type</th>
                          <th className="py-2">Host / Name</th>
                          <th className="py-2">Target Value</th>
                          <th className="py-2">TTL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-xs text-slate-800">
                        <tr>
                          <td className="py-2 font-bold text-blue-600">CNAME</td>
                          <td className="py-2">@ or www</td>
                          <td className="py-2">{domainRecord.cnameTarget}</td>
                          <td className="py-2 text-slate-500">Auto / 3600</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-bold text-indigo-600">TXT</td>
                          <td className="py-2">_b2b-verify</td>
                          <td className="py-2">{domainRecord.verificationToken}</td>
                          <td className="py-2 text-slate-500">3600</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                    <span className="text-xs text-slate-500">
                      Automatic SSL certificates are issued via Let's Encrypt upon DNS resolution.
                    </span>
                    <button
                      id="verify-dns-btn"
                      type="button"
                      disabled={isVerifyingDomain || !domainRecord.customDomain}
                      onClick={handleSimulateDnsCheck}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDomain ? 'animate-spin' : ''}`} />
                      Verify DNS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: WEBSITE PREVIEW */}
          {activeTab === 'website_preview' && designSettings && socialLinks && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Live Website Preview</h3>
                  <p className="text-xs text-slate-500">
                    Interactive simulation of public buyer experience with current catalog data & styling.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <PublicSellerWebsite
                  seller={seller}
                  products={products}
                  categories={categories}
                  designSettings={designSettings}
                  socialLinks={socialLinks}
                  seoSettings={seoSettings || undefined}
                  isIframePreview={true}
                />
              </div>
            </div>
          )}

          {/* TAB 10: PUBLISH WEBSITE */}
          {activeTab === 'publish_website' && (
            <div className="max-w-3xl bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Publish & Global Deployment Desk</h3>
                <p className="text-xs text-slate-500">
                  Control the worldwide public availability of your B2B wholesale storefront.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-50/75 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Deployment State</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                      {seller.isPublished ? 'PUBLISHED & ACTIVE' : 'DRAFT (PRIVATE)'}
                    </h4>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      seller.isPublished
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {seller.isPublished ? 'Online' : 'Offline'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Published websites are instantly served to wholesale buyers at{' '}
                  <span className="font-mono text-blue-600 font-bold">/site/{seller.slug}</span> and mapped
                  custom domains. Changes made in the product catalog and website designer reflect in real-time.
                </p>

                <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                  {seller.isPublished ? (
                    <button
                      onClick={() => handleTogglePublishSite(false)}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                    >
                      Unpublish (Revert to Draft)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTogglePublishSite(true)}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-1.5 transition"
                    >
                      <Send className="w-4 h-4" /> Publish Website
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('website_preview')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition"
                  >
                    Review Preview First
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Product Editor Modal */}
      {isProductModalOpen && (
        <ProductEditorModal
          product={editingProduct}
          categories={categories}
          sellerId={seller.id}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Category Editor Modal */}
      {categoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              {editingCategory.name ? 'Edit Category' : 'Create Wholesale Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  required
                  value={editingCategory.slug}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
