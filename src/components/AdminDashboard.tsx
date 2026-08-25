import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Package,
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Edit,
  Eye,
  Sliders,
  TrendingUp,
  Server,
  Lock,
  RefreshCw,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { SellerProfile, AdminStats } from '../types';
import { getAllSellers, getAdminStatistics, saveSellerProfile } from '../lib/dbService';

interface AdminDashboardProps {
  onViewSellerWebsite: (slug: string) => void;
  onViewSellerCatalog: (sellerId: string) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onViewSellerWebsite,
  onViewSellerCatalog,
  onLogout,
}) => {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalSellers: 0,
    activeSellers: 0,
    inactiveSellers: 0,
    totalProducts: 0,
    publishedWebsites: 0,
    customDomainsConnected: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [editingSeller, setEditingSeller] = useState<SellerProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allSellersList, adminStats] = await Promise.all([
        getAllSellers(),
        getAdminStatistics(),
      ]);
      setSellers(allSellersList);
      setStats(adminStats);
    } catch (err) {
      console.warn('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleStatus = async (seller: SellerProfile) => {
    const updated: SellerProfile = {
      ...seller,
      isActive: !seller.isActive,
    };
    await saveSellerProfile(updated);
    setSellers(sellers.map((s) => (s.id === seller.id ? updated : s)));
    showToast(`${seller.companyName} status set to ${updated.isActive ? 'Active' : 'Inactive'}`);
  };

  const handleTogglePublish = async (seller: SellerProfile) => {
    const updated: SellerProfile = {
      ...seller,
      isPublished: !seller.isPublished,
    };
    await saveSellerProfile(updated);
    setSellers(sellers.map((s) => (s.id === seller.id ? updated : s)));
    showToast(`${seller.companyName} public site set to ${updated.isPublished ? 'Published' : 'Unpublished'}`);
  };

  const handleSaveSellerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeller) return;
    await saveSellerProfile(editingSeller);
    setSellers(sellers.map((s) => (s.id === editingSeller.id ? editingSeller : s)));
    setEditingSeller(null);
    showToast(`Updated profile for ${editingSeller.companyName}`);
  };

  const filteredSellers = sellers.filter((s) => {
    const matchesSearch =
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mobileNumber.includes(searchQuery);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && s.isActive) ||
      (statusFilter === 'INACTIVE' && !s.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Admin Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm text-slate-900 tracking-tight">Catalogo Master Console</h1>
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-mono font-bold">
                  ADMIN: 7897752217
                </span>
              </div>
              <p className="text-xs text-slate-500">Multi-tenant seller control & verification hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="admin-logout-btn"
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sellers</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSellers}</div>
            <span className="text-xs text-slate-500">Tenants registered</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Sellers</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeSellers}</div>
            <span className="text-xs text-emerald-600 font-medium">Live accounts</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inactive Sellers</span>
            <div className="text-2xl font-bold text-slate-400 mt-1">{stats.inactiveSellers}</div>
            <span className="text-xs text-slate-400">Suspended / Draft</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog Items</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProducts}</div>
            <span className="text-xs text-blue-600 font-medium">B2B products</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Published Sites</span>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.publishedWebsites}</div>
            <span className="text-xs text-slate-500">Public websites</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Custom Domains</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.customDomainsConnected}</div>
            <span className="text-xs text-slate-500">Mapped domains</span>
          </div>
        </div>

        {/* Sellers Management Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Seller Organizations & Websites</h2>
              <p className="text-xs text-slate-500">
                Oversee tenant company profiles, account activation, custom domain routing & catalogs.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company, slug, phone..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Sellers Data Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Company & Slug</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Category & Plan</th>
                  <th className="py-3 px-4">Domain Status</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={seller.logoUrl || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100'}
                          alt={seller.companyName}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{seller.companyName}</span>
                          <span className="font-mono text-[11px] text-blue-600">/site/{seller.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{seller.mobileNumber}</div>
                      <div className="text-[11px] text-slate-400">{seller.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800 block">{seller.businessType}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {seller.subscriptionPlan || 'Starter'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {seller.customDomain ? (
                        <div>
                          <span className="font-mono text-[11px] text-slate-800 block">{seller.customDomain}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                            ● Active CNAME
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Subpath Only</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePublish(seller)}
                        className={`inline-flex items-center text-xs hover:underline cursor-pointer`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full inline-block mr-1.5 ${
                            seller.isPublished ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className={seller.isPublished ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                          {seller.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(seller)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition ${
                          seller.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {seller.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-red-600" /> Deactivated
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewSellerCatalog(seller.id)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                          title="View Catalog"
                        >
                          Catalog
                        </button>
                        <button
                          onClick={() => onViewSellerWebsite(seller.slug)}
                          className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1 transition"
                          title="View Public Site"
                        >
                          <Eye className="w-3 h-3" /> Site
                        </button>
                        <button
                          onClick={() => setEditingSeller({ ...seller })}
                          className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                          title="Edit Seller Basics"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Seller Edit Modal */}
      {editingSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Edit Seller Organization</h3>
              <button
                onClick={() => setEditingSeller(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSellerEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={editingSeller.companyName}
                  onChange={(e) => setEditingSeller({ ...editingSeller, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Slug URL</label>
                  <input
                    type="text"
                    value={editingSeller.slug}
                    onChange={(e) => setEditingSeller({ ...editingSeller, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Type</label>
                  <select
                    value={editingSeller.businessType}
                    onChange={(e: any) => setEditingSeller({ ...editingSeller, businessType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Exporter">Exporter</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Trader">Trader</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editingSeller.mobileNumber}
                    onChange={(e) => setEditingSeller({ ...editingSeller, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingSeller.email}
                    onChange={(e) => setEditingSeller({ ...editingSeller, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Domain</label>
                  <input
                    type="text"
                    value={editingSeller.customDomain || ''}
                    onChange={(e) => setEditingSeller({ ...editingSeller, customDomain: e.target.value })}
                    placeholder="e.g. domain.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan</label>
                  <select
                    value={editingSeller.subscriptionPlan || 'Starter'}
                    onChange={(e: any) => setEditingSeller({ ...editingSeller, subscriptionPlan: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Growth">Growth</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSeller(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-slate-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
