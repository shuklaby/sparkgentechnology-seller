import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Share2,
  ExternalLink,
  ShieldCheck,
  Award,
  ChevronRight,
  Package,
  Sliders,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Info,
  Clock,
  Tag,
  Search,
  Filter
} from 'lucide-react';
import {
  SellerProfile,
  Product,
  Category,
  WebsiteDesignSettings,
  SocialLinksSettings,
  SeoSettings
} from '../types';

interface PublicSellerWebsiteProps {
  seller: SellerProfile;
  products: Product[];
  categories: Category[];
  designSettings: WebsiteDesignSettings;
  socialLinks: SocialLinksSettings;
  seoSettings?: SeoSettings;
  onBackToDashboard?: () => void;
  isIframePreview?: boolean;
}

export const PublicSellerWebsite: React.FC<PublicSellerWebsiteProps> = ({
  seller,
  products,
  categories,
  designSettings,
  socialLinks,
  seoSettings,
  onBackToDashboard,
  isIframePreview = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rfqSuccessModal, setRfqSuccessModal] = useState<string | null>(null);
  const [rfqQuantity, setRfqQuantity] = useState<number>(10);
  const [rfqNotes, setRfqNotes] = useState<string>('');
  const [rfqContactName, setRfqContactName] = useState<string>('');
  const [rfqContactPhone, setRfqContactPhone] = useState<string>('');

  const activeSocials = (socialLinks?.links || []).filter((s) => s.isEnabled && s.value.trim());

  const whatsappLink = socialLinks?.links?.find((l) => l.platform === 'whatsapp' && l.isEnabled);

  const filterProducts = products.filter((p) => {
    if (!p.isPublished) return false;
    const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.keywords?.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleOpenWhatsAppEnquiry = (productName?: string) => {
    if (!whatsappLink) return;
    const phoneClean = whatsappLink.value.replace(/\D/g, '');
    let msg = whatsappLink.customMessage || `Hello ${seller.companyName}, I would like to request a bulk wholesale quotation.`;
    if (productName) {
      msg = `Hello ${seller.companyName}, I am inquiring regarding bulk supply & pricing for: "${productName}". Please share FOB/CIF quotation.`;
    }
    const url = `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSendQuickRfq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setRfqSuccessModal(selectedProduct.name);
    // In production this triggers a webhook / Firestore RFQ order doc
    setTimeout(() => {
      setSelectedProduct(null);
      setRfqNotes('');
    }, 2500);
  };

  // Style attributes based on seller design choices
  const primaryColor = designSettings?.primaryColor || '#0284c7';
  const secondaryColor = designSettings?.secondaryColor || '#0f172a';
  const template = designSettings?.template || 'modern-business';

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${designSettings?.fontStyle === 'plus-jakarta' ? 'font-sans' : ''}`}>
      {/* Top Banner if in Preview Mode */}
      {isIframePreview && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between sticky top-0 z-50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Live Website Preview:</span>
            <span className="font-mono text-slate-300">/site/{seller.slug}</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
              Template: {template}
            </span>
          </div>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
            >
              Exit Preview
            </button>
          )}
        </div>
      )}

      {/* 1. Header / Navbar */}
      <header
        className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {seller.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt={seller.companyName}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
              >
                {seller.companyName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                {seller.companyName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-blue-700">{seller.businessType}</span>
                <span>•</span>
                <span>Est. {seller.yearEstablished}</span>
                <span>•</span>
                <span>{seller.city}, {seller.state}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {whatsappLink && (
              <button
                onClick={() => handleOpenWhatsAppEnquiry()}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp RFQ
              </button>
            )}

            <a
              href="#contact-section"
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm hover:opacity-90 transition"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      {designSettings?.sections?.hero && (
        <section
          className={`relative overflow-hidden ${
            template === 'industrial-manufacturer'
              ? 'bg-slate-950 text-white'
              : template === 'clean-wholesale'
              ? 'bg-gradient-to-b from-blue-50/70 to-white text-slate-900 border-b border-slate-200'
              : 'bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white'
          } py-16 sm:py-24`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  Verified Industrial & Wholesale Supplier
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                  {designSettings?.heroHeadline ||
                    `${seller.companyName} - Precision Wholesale & Manufacturing`}
                </h2>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  {designSettings?.heroSubheadline || seller.businessDescription}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="#catalog-section"
                    style={{ backgroundColor: primaryColor }}
                    className="px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:opacity-95 transition flex items-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Browse Wholesale Catalog
                  </a>

                  {whatsappLink && (
                    <button
                      onClick={() => handleOpenWhatsAppEnquiry()}
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-sm font-semibold transition flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      Quick WhatsApp Quote
                    </button>
                  )}
                </div>

                {/* Key Trust Badges */}
                <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="block font-bold text-lg text-white">ISO Compliant</span>
                    <span className="text-slate-400">Quality Certified</span>
                  </div>
                  <div>
                    <span className="block font-bold text-lg text-white">Direct Factory</span>
                    <span className="text-slate-400">Bulk Pricing</span>
                  </div>
                  <div>
                    <span className="block font-bold text-lg text-white">Worldwide</span>
                    <span className="text-slate-400">Export Ready</span>
                  </div>
                </div>
              </div>

              {/* Hero Visual Image Banner */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-800">
                  <img
                    src={
                      designSettings?.heroBannerUrl ||
                      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80'
                    }
                    alt={seller.companyName}
                    className="w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs">
                    <div className="flex items-center justify-between text-white font-semibold">
                      <span>{seller.companyName}</span>
                      <span className="text-emerald-400">● Active Exporter</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 truncate">
                      {seller.address}, {seller.city}, {seller.state}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Product Categories Bar */}
      {designSettings?.sections?.categories && categories.length > 0 && (
        <section className="bg-white border-b border-slate-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Product Categories
              </h3>
              <span className="text-xs text-slate-500">{categories.length} Wholesale Verticals</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Products ({products.filter((p) => p.isPublished).length})
              </button>
              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id && p.isPublished).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Main Product Catalog Grid */}
      {designSettings?.sections?.products && (
        <section id="catalog-section" className="py-12 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Commercial Catalog</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct manufacturer inventory with tiered MOQ and full technical specifications.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, keywords, SKU..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Product Cards Grid */}
            {filterProducts.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No products match your filter.</p>
                <p className="text-xs text-slate-400 mt-1">Try searching another keyword or clear category selection.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      <img
                        src={
                          prod.images[0] ||
                          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
                        }
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-slate-900/80 backdrop-blur text-white text-[10px] font-semibold">
                        {prod.categoryName}
                      </span>
                      {prod.sku && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-white/90 backdrop-blur text-slate-800 font-mono text-[10px] font-bold">
                          {prod.sku}
                        </span>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                          {prod.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>

                      {/* Technical Specs Badges */}
                      {prod.specifications && prod.specifications.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                          {prod.specifications.slice(0, 2).map((s, i) => (
                            <div key={i} className="truncate">
                              <span className="text-slate-400 font-semibold">{s.key}: </span>
                              <span className="text-slate-800 font-medium">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Price & Action */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Wholesale Price</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-extrabold text-slate-900">
                              ₹{prod.price.toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">/ {prod.unit}</span>
                          </div>
                          <span className="text-[10px] text-blue-600 font-semibold">
                            MOQ: {prod.minOrderQuantity} {prod.unit}s
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedProduct(prod)}
                            className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                          >
                            Details & RFQ
                          </button>
                          {whatsappLink && (
                            <button
                              onClick={() => handleOpenWhatsAppEnquiry(prod.name)}
                              title="Enquire on WhatsApp"
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Why Choose Us Section */}
      {designSettings?.sections?.whyChooseUs && (
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h3 className="text-2xl font-bold text-slate-900">Why Partner With {seller.companyName}</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                We deliver robust manufacturing consistency, transparent wholesale pricing, and worldwide logistics compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(designSettings?.whyChooseUsItems || []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-md transition space-y-3"
                >
                  <div
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Company About & Profile */}
      {designSettings?.sections?.aboutCompany && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">About Company</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  Over {new Date().getFullYear() - seller.yearEstablished} Years of Industrial Excellence
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {seller.businessDescription}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Business Structure</span>
                    <span className="font-bold text-slate-900">{seller.businessType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Established Year</span>
                    <span className="font-bold text-slate-900">{seller.yearEstablished}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Headquarters</span>
                    <span className="font-bold text-slate-900">{seller.city}, {seller.state}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 space-y-4">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  Commercial Procurement Desk
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{seller.mobileNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{seller.email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {seller.address}, {seller.city}, {seller.state} - {seller.pincode}, {seller.country}
                    </span>
                  </div>
                </div>

                {seller.googleMapsUrl && (
                  <a
                    href={seller.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    View Plant on Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. Contact / RFQ Submission Form */}
      {designSettings?.sections?.contact && (
        <section id="contact-section" className="py-16 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h3 className="text-2xl font-bold text-slate-900">Request Bulk Wholesale Quote</h3>
              <p className="text-xs text-slate-500 mt-1">
                Direct inquiry dispatched straight to {seller.companyName}'s sales desk.
              </p>
            </div>

            <div className="max-w-xl mx-auto bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert('Your RFQ request has been received. Our sales engineer will contact you shortly.');
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Buyer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PetroFlow Ltd / Rajesh Sharma"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="procurement@company.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 00000"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Products Required & Quantity</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide required items, nominal sizes, quantities and delivery destination..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  style={{ backgroundColor: primaryColor }}
                  className="w-full py-3 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition"
                >
                  Submit Official RFQ Request
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* 8. Footer & Dynamic Social Links */}
      {designSettings?.sections?.footer && (
        <footer className="bg-slate-950 text-white pt-12 pb-8 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {seller.logoUrl ? (
                  <img src={seller.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-blue-400" />
                )}
                <div>
                  <span className="font-bold text-sm">{seller.companyName}</span>
                  <p className="text-[11px] text-slate-400">{seller.businessType} • Verified B2B Supplier</p>
                </div>
              </div>

              {/* Dynamic Social & Business Links (Only enabled items) */}
              {activeSocials.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  {activeSocials.map((soc) => (
                    <a
                      key={soc.id}
                      href={soc.platform === 'phone' ? `tel:${soc.value}` : soc.platform === 'email' ? `mailto:${soc.value}` : soc.value}
                      target={soc.platform === 'phone' || soc.platform === 'email' ? '_self' : '_blank'}
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5"
                    >
                      <Share2 className="w-3 h-3 text-blue-400" />
                      {soc.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <p>© {new Date().getFullYear()} {seller.companyName}. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span>Powered by Catalogo B2B SaaS</span>
                <span>•</span>
                <span className="font-mono">/site/{seller.slug}</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* 9. Product Detail & RFQ Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400">{selectedProduct.categoryName}</span>
                <h3 className="font-bold text-sm truncate max-w-md">{selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Image & Price Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden bg-slate-100 aspect-video border border-slate-200">
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold">Standard Wholesale Unit</span>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">
                      ₹{selectedProduct.price.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-500">/ {selectedProduct.unit}</span>
                    </div>
                    <p className="text-xs text-blue-600 font-semibold mt-1">
                      Minimum Order Quantity: {selectedProduct.minOrderQuantity} {selectedProduct.unit}s
                    </p>
                  </div>
                  {whatsappLink && (
                    <button
                      onClick={() => handleOpenWhatsAppEnquiry(selectedProduct.name)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Enquire on WhatsApp
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Product Overview</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedProduct.description}</p>
              </div>

              {/* Key Features */}
              {selectedProduct.keyFeatures && selectedProduct.keyFeatures.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Key Highlights</h4>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {selectedProduct.keyFeatures.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Technical Specifications */}
              {selectedProduct.specifications && selectedProduct.specifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Technical Specifications
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedProduct.specifications.map((s, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold block">{s.key}</span>
                        <span className="text-xs font-semibold text-slate-800">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick RFQ Request */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <h4 className="text-xs font-bold text-blue-950 mb-2">Send Instant RFQ to Seller</h4>
                <form onSubmit={handleSendQuickRfq} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={rfqContactName}
                      onChange={(e) => setRfqContactName(e.target.value)}
                      placeholder="Your Name / Business"
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                    />
                    <input
                      type="tel"
                      required
                      value={rfqContactPhone}
                      onChange={(e) => setRfqContactPhone(e.target.value)}
                      placeholder="Mobile / WhatsApp"
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={selectedProduct.minOrderQuantity}
                      value={rfqQuantity}
                      onChange={(e) => setRfqQuantity(parseInt(e.target.value) || 1)}
                      className="w-24 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={rfqNotes}
                      onChange={(e) => setRfqNotes(e.target.value)}
                      placeholder="Additional specs or delivery port requirement..."
                      className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition"
                  >
                    Submit Quotation Inquiry
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Toast */}
      {rfqSuccessModal && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-700 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="font-bold">Inquiry Sent Successfully!</p>
            <p className="text-emerald-200 text-[11px]">Quotation request for {rfqSuccessModal} logged.</p>
          </div>
        </div>
      )}
    </div>
  );
};
