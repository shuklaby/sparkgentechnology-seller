import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Check,
  X,
  Copy,
  DollarSign,
  PackageCheck,
  Sliders,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Product, Category, ProductSpecification } from '../types';
import { AiProductGeneratorModal } from './AiProductGeneratorModal';

interface ProductEditorModalProps {
  product: Product | null;
  categories: Category[];
  sellerId: string;
  onSave: (product: Product) => void;
  onClose: () => void;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  product,
  categories,
  sellerId,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState<number>(product?.price || 1000);
  const [currency, setCurrency] = useState(product?.currency || 'INR');
  const [unit, setUnit] = useState(product?.unit || 'Piece');
  const [sku, setSku] = useState(product?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [categoryId, setCategoryId] = useState(product?.categoryId || (categories[0]?.id || ''));
  const [subCategory, setSubCategory] = useState(product?.subCategory || '');
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(product?.minOrderQuantity || 1);
  const [isPublished, setIsPublished] = useState<boolean>(product ? product.isPublished : true);
  const [images, setImages] = useState<string[]>(
    product?.images && product.images.length > 0
      ? product.images
      : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80']
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [specifications, setSpecifications] = useState<ProductSpecification[]>(
    product?.specifications || [
      { id: '1', key: 'Material', value: 'Commercial Grade' },
      { id: '2', key: 'Packaging', value: 'Standard Bulk Packaging' },
    ]
  );
  const [keywords, setKeywords] = useState<string[]>(product?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>(product?.keyFeatures || []);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleAddSpecification = () => {
    setSpecifications([
      ...specifications,
      { id: `spec-${Date.now()}`, key: '', value: '' },
    ]);
  };

  const handleRemoveSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...specifications];
    updated[index][field] = val;
    setSpecifications(updated);
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = keywordInput.trim();
      if (trimmed && !keywords.includes(trimmed)) {
        setKeywords([...keywords, trimmed]);
        setKeywordInput('');
      }
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAiApply = (aiData: {
    title: string;
    description: string;
    keyFeatures: string[];
    specifications: ProductSpecification[];
    keywords: string[];
    suggestedUnit?: string;
    suggestedMoq?: number;
  }) => {
    setName(aiData.title);
    setDescription(aiData.description);
    if (aiData.keyFeatures?.length) setKeyFeatures(aiData.keyFeatures);
    if (aiData.specifications?.length) setSpecifications(aiData.specifications);
    if (aiData.keywords?.length) setKeywords(aiData.keywords);
    if (aiData.suggestedUnit) setUnit(aiData.suggestedUnit);
    if (aiData.suggestedMoq) setMinOrderQuantity(aiData.suggestedMoq);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!price || price <= 0) errs.price = 'Valid wholesale price is required';
    if (!categoryId) errs.category = 'Please select a category';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCategory ? selectedCategory.name : 'General';

    const savedProduct: Product = {
      id: product?.id || `prod-${Date.now()}`,
      sellerId,
      name,
      description,
      price,
      currency,
      unit,
      sku,
      categoryId,
      categoryName,
      subCategory,
      minOrderQuantity,
      isPublished,
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'],
      specifications: specifications.filter((s) => s.key.trim() && s.value.trim()),
      keywords,
      keyFeatures,
      createdAt: product?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(savedProduct);
  };

  const selectedCat = categories.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {product ? 'Edit Catalog Product' : 'Add New B2B Product'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure SKU, tiered pricing, specifications, gallery & SEO keywords
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="open-ai-generator-btn"
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              Generate with AI
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Title / Model Name *
              </label>
              <input
                id="product-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="e.g. Heavy Duty Forged Steel Industrial Ball Valve"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
              {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Item Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="VALVE-FS-2IN"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pricing, Unit & MOQ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price *</label>
              <div className="relative">
                <input
                  id="product-price-input"
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => {
                    setPrice(parseFloat(e.target.value) || 0);
                    if (errors.price) setErrors({ ...errors, price: '' });
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pricing Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="Piece">Piece / Unit</option>
                <option value="Kg">Kilogram (Kg)</option>
                <option value="Meter">Meter</option>
                <option value="Box">Box / Carton</option>
                <option value="Set">Set</option>
                <option value="Ton">Ton (Metric)</option>
                <option value="Roll">Roll</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Order Qty (MOQ)</label>
              <input
                type="number"
                min="1"
                value={minOrderQuantity}
                onChange={(e) => setMinOrderQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catalog Status</label>
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isPublished ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
                {isPublished ? 'Published' : 'Draft / Hidden'}
              </button>
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategory</label>
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. Ball Valves, Class 300"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              B2B Product Description & Commercial Overview
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed technical description, testing standards, temperature limits and application sectors..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Multiple Product Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Product Image Gallery ({images.length} images)
              </label>
              <span className="text-[11px] text-slate-400">Primary image is shown first on catalog</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video">
                  <img src={img} alt="Product" className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Add image URL (e.g. https://... or upload link)"
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Image
              </button>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                Technical Specifications ({specifications.length})
              </label>
              <button
                type="button"
                onClick={handleAddSpecification}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Specification
              </button>
            </div>

            <div className="space-y-2">
              {specifications.map((spec, idx) => (
                <div key={spec.id || idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                    placeholder="Parameter (e.g. Pressure Rating)"
                    className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                    placeholder="Value (e.g. Class 300 / 50 Bar)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              SEO & Catalog Search Tags (Press Enter or Comma)
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px] items-center">
              {keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium flex items-center gap-1.5"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleAddKeyword}
                placeholder="Add keyword..."
                className="flex-1 min-w-[120px] bg-transparent border-none text-xs text-slate-800 focus:outline-none p-1"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              id="save-product-submit-btn"
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition"
            >
              <Check className="w-4 h-4" />
              Save to Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Gemini AI Generator */}
      {isAiModalOpen && (
        <AiProductGeneratorModal
          categoryName={selectedCat?.name || 'Industrial Wholesale'}
          onApply={handleAiApply}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}
    </div>
  );
};
