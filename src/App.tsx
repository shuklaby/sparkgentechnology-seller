import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Store,
  Globe,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { AppUser, SellerProfile, Product, Category, WebsiteDesignSettings, SocialLinksSettings, SeoSettings } from './types';
import {
  initializeDemoDataIfMissing,
  getUserRecord,
  getSellerById,
  getSellerBySlug,
  getProducts,
  getCategories,
  getWebsiteDesignSettings,
  getSocialLinks,
  getSeoSettings,
  getLocal,
  clearActiveSessionUser
} from './lib/dbService';
import { verifyCurrentSession, logoutUser } from './lib/authService';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SellerDashboard } from './components/SellerDashboard';
import { PublicSellerWebsite } from './components/PublicSellerWebsite';
import { SparkGenLogo } from './components/SparkGenLogo';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentSeller, setCurrentSeller] = useState<SellerProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'ADMIN' | 'SELLER'>('SELLER');
  const [currentView, setCurrentView] = useState<'HOME' | 'ADMIN' | 'SELLER' | 'PUBLIC_SITE'>('HOME');
  const [activeSiteSlug, setActiveSiteSlug] = useState<string>('abc-enterprises');
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Loaded data for Public Website View
  const [publicSeller, setPublicSeller] = useState<SellerProfile | null>(null);
  const [publicProducts, setPublicProducts] = useState<Product[]>([]);
  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [publicDesign, setPublicDesign] = useState<WebsiteDesignSettings | null>(null);
  const [publicSocials, setPublicSocials] = useState<SocialLinksSettings | null>(null);
  const [publicSeo, setPublicSeo] = useState<SeoSettings | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  // 1. Session Initialization
  useEffect(() => {
    initializeDemoDataIfMissing();

    const checkSession = async () => {
      setIsAuthChecking(true);
      try {
        const sessionRes = await verifyCurrentSession();
        if (sessionRes && sessionRes.user) {
          setCurrentUser(sessionRes.user);
          if (sessionRes.seller) {
            setCurrentSeller(sessionRes.seller);
          } else if (sessionRes.user.role === 'SELLER' && sessionRes.user.sellerId) {
            const sellerObj = await getSellerById(sessionRes.user.sellerId);
            if (sellerObj) setCurrentSeller(sellerObj);
          }
        } else {
          // Fallback to local session storage cache if server response is not available
          const cachedUser = getLocal<AppUser | null>('active_session_user', null);
          if (cachedUser) {
            setCurrentUser(cachedUser);
            if (cachedUser.role === 'SELLER' && cachedUser.sellerId) {
              const sellerObj = await getSellerById(cachedUser.sellerId);
              if (sellerObj) setCurrentSeller(sellerObj);
            }
          } else {
            setCurrentUser(null);
            setCurrentSeller(null);
          }
        }
      } catch (err) {
        console.warn('Session verification fallback:', err);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();
  }, []);

  // 2. Hash Route Navigation & Protection
  useEffect(() => {
    if (isAuthChecking) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/site/')) {
        const slug = hash.replace('#/site/', '').split('/')[0] || 'abc-enterprises';
        openPublicWebsite(slug);
      } else if (hash === '#/admin') {
        if (currentUser?.role === 'ADMIN') {
          setCurrentView('ADMIN');
        } else {
          setAuthModalRole('ADMIN');
          setAuthModalOpen(true);
        }
      } else if (hash === '#/seller') {
        if ((currentUser?.role === 'SELLER' || currentUser?.role === 'EMPLOYEE' || currentUser?.role === 'ADMIN') && currentSeller) {
          setCurrentView('SELLER');
        } else {
          setAuthModalRole('SELLER');
          setAuthModalOpen(true);
        }
      } else {
        setCurrentView('HOME');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser, currentSeller, isAuthChecking]);

  const openPublicWebsite = async (slug: string) => {
    setIsPublicLoading(true);
    try {
      const seller = await getSellerBySlug(slug);
      if (seller) {
        setPublicSeller(seller);
        setActiveSiteSlug(slug);
        const [prods, cats, design, socials, seo] = await Promise.all([
          getProducts(seller.id),
          getCategories(seller.id),
          getWebsiteDesignSettings(seller.id),
          getSocialLinks(seller.id),
          getSeoSettings(seller.id),
        ]);
        setPublicProducts(prods);
        setPublicCategories(cats);
        setPublicDesign(design);
        setPublicSocials(socials);
        setPublicSeo(seo);
        setCurrentView('PUBLIC_SITE');
      }
    } catch (err) {
      console.warn('Error opening public site:', err);
    } finally {
      setIsPublicLoading(false);
    }
  };

  const handleAuthSuccess = (user: AppUser, seller?: SellerProfile) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
    if (user.role === 'ADMIN') {
      setCurrentView('ADMIN');
      window.location.hash = '#/admin';
    } else {
      if (seller) setCurrentSeller(seller);
      setCurrentView('SELLER');
      window.location.hash = '#/seller';
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    clearActiveSessionUser();
    setCurrentUser(null);
    setCurrentSeller(null);
    setCurrentView('HOME');
    window.location.hash = '';
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-700 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Securing Connection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* VIEW: ADMIN CONSOLE */}
      {currentView === 'ADMIN' && currentUser?.role === 'ADMIN' && (
        <AdminDashboard
          currentUser={currentUser}
          onViewSellerWebsite={(slug) => {
            window.location.hash = `#/site/${slug}`;
            openPublicWebsite(slug);
          }}
          onViewSellerCatalog={async (sellerId) => {
            const sellerObj = await getSellerById(sellerId);
            if (sellerObj) {
              setCurrentSeller(sellerObj);
              setCurrentView('SELLER');
            }
          }}
          onLogout={handleLogout}
        />
      )}

      {/* VIEW: SELLER PORTAL */}
      {currentView === 'SELLER' && currentSeller && (
        <SellerDashboard
          seller={currentSeller}
          onUpdateSeller={(updated) => setCurrentSeller(updated)}
          onLogout={handleLogout}
        />
      )}

      {/* VIEW: PUBLIC SELLER WEBSITE (/site/{slug}) */}
      {currentView === 'PUBLIC_SITE' && publicSeller && publicDesign && publicSocials && (
        <PublicSellerWebsite
          seller={publicSeller}
          products={publicProducts}
          categories={publicCategories}
          designSettings={publicDesign}
          socialLinks={publicSocials}
          seoSettings={publicSeo || undefined}
          onBackToDashboard={() => {
            if (currentUser?.role === 'ADMIN') {
              setCurrentView('ADMIN');
            } else if (currentUser?.role === 'SELLER') {
              setCurrentView('SELLER');
            } else {
              setCurrentView('HOME');
            }
          }}
        />
      )}

      {/* VIEW: HOME LANDING / ROLE PORTAL GATEWAY */}
      {currentView === 'HOME' && (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
          {/* Header */}
          <header className="border-b border-slate-200 bg-white px-6 py-3.5 sticky top-0 z-30 shadow-xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SparkGenLogo className="h-9 w-auto max-w-[200px]" alt="Spark Gen Technology" />
                <div className="hidden sm:block pl-3 border-l border-slate-200">
                  <p className="text-[11px] font-medium text-slate-500">B2B Seller Portal &amp; Enterprise Website Builder</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="header-seller-login-btn"
                  onClick={() => {
                    setAuthModalRole('SELLER');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition"
                >
                  Seller Login
                </button>
                <button
                  id="header-admin-login-btn"
                  onClick={() => {
                    setAuthModalRole('ADMIN');
                    setAuthModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-600" /> Admin
                </button>
              </div>
            </div>
          </header>

          {/* Hero Main Content */}
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full text-center space-y-8 my-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Multi-Tenant B2B Architecture &amp; Secure Role Authentication
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                Empower B2B Sellers With Instant Catalogs &amp; Websites
              </h2>

              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Complete multi-tenant SaaS with isolated seller catalogs, role-based access management, AI product copywriting, live website template customizer, custom domain routing, and SEO optimization.
              </p>

              {/* Portal Entry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left pt-4">
                {/* Demo Seller Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-500 transition shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Store className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900">Seller Dashboard</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Manage company profile, product catalog, categories, visual website designer &amp; SEO settings.
                    </p>
                  </div>
                  <button
                    id="hero-seller-btn"
                    onClick={() => {
                      setAuthModalRole('SELLER');
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs flex items-center justify-center gap-2 transition"
                  >
                    Open Seller Portal <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Live Demo Website Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-emerald-500 transition shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900">Public B2B Website</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Experience tenant <span className="text-slate-900 font-semibold">ABC Enterprises</span> live at <span className="font-mono text-emerald-700">/site/abc-enterprises</span>.
                    </p>
                  </div>
                  <button
                    id="hero-public-site-btn"
                    onClick={() => openPublicWebsite('abc-enterprises')}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs flex items-center justify-center gap-2 transition"
                  >
                    View Live Website <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {/* Admin Portal Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-400 transition shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900">Admin Console</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Secure email &amp; password administrator console for system moderation and user management.
                    </p>
                  </div>
                  <button
                    id="hero-admin-btn"
                    onClick={() => {
                      setAuthModalRole('ADMIN');
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs shadow-xs flex items-center justify-center gap-2 transition"
                  >
                    Access Admin Portal <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <SparkGenLogo className="h-6 w-auto" alt="Spark Gen Technology" />
            </div>
            <p>© {new Date().getFullYear()} Spark Gen Technology. All rights reserved. Multi-Tenant B2B Platform.</p>
          </footer>
        </div>
      )}

      {/* Authentication Modal */}
      {authModalOpen && (
        <AuthModal
          initialRole={authModalRole}
          onSuccess={handleAuthSuccess}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
