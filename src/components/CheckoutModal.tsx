import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Lock,
  Loader2,
  Package,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Order, OrderDeliveryAddress } from '../types';
import { placeOrder } from '../lib/orderService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  sellerId: string;
  sellerName?: string;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  sellerId,
  sellerName,
  onOrderSuccess,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    houseNumber: '',
    streetArea: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    orderNotes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalQuantity = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const subtotal = items.reduce(
    (acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1),
    0
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): string | null => {
    if (!formData.fullName.trim()) return 'Full Name is required.';
    if (!formData.mobileNumber.trim() || formData.mobileNumber.trim().length < 10) {
      return 'Please enter a valid 10-digit mobile phone number.';
    }
    if (!formData.email.trim() || !formData.email.includes('@') || !formData.email.includes('.')) {
      return 'Please enter a valid email address.';
    }
    if (!formData.houseNumber.trim()) return 'House / Flat / Unit Number is required.';
    if (!formData.streetArea.trim()) return 'Street, Road or Industrial Area is required.';
    if (!formData.city.trim()) return 'City is required.';
    if (!formData.state.trim()) return 'State / Province is required.';
    if (!formData.pincode.trim() || formData.pincode.trim().length < 5) {
      return 'Please enter a valid PIN / Postal code.';
    }
    if (items.length === 0) return 'Your shopping cart is empty.';
    return null;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        sellerId,
        customerName: formData.fullName.trim(),
        customerEmail: formData.email.trim().toLowerCase(),
        customerMobile: formData.mobileNumber.trim(),
        deliveryAddress: {
          fullName: formData.fullName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          email: formData.email.trim().toLowerCase(),
          houseNumber: formData.houseNumber.trim(),
          streetArea: formData.streetArea.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          landmark: formData.landmark.trim() || undefined,
        },
        orderNotes: formData.orderNotes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity || 1,
        })),
      };

      const placedOrder = await placeOrder(orderPayload);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      onOrderSuccess(placedOrder);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Failed to place order. Please check all details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Checkout & Place Order</h2>
              <p className="text-xs text-slate-400">
                Direct procurement order with {sellerName || 'Wholesale Supplier'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Validation Notice: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Customer & Delivery Details Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Customer Contact Information */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Customer Information</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="e.g. Ramesh Kumar / ABC Engineering"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      required
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. procurement@company.com"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>Delivery Address Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      House / Flat / Unit No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="houseNumber"
                      required
                      value={formData.houseNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. Plot No. 12-A / Shed 4"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Street / Road / Area <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="streetArea"
                      required
                      value={formData.streetArea}
                      onChange={handleInputChange}
                      placeholder="e.g. MIDC Industrial Area"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Ahmedabad"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="e.g. Gujarat"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      required
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="e.g. 382445"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder="e.g. Near Water Tank / Opposite Power Substation"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order Notes / Packaging Instructions (Optional)
                </label>
                <textarea
                  name="orderNotes"
                  rows={2}
                  value={formData.orderNotes}
                  onChange={handleInputChange}
                  placeholder="e.g. Please include test certificate and dispatch with wooden crate packaging."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-none"
                />
              </div>
            </form>
          </div>

          {/* Right: Order Summary Sidebar (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-bold text-slate-900 text-sm">Order Summary</span>
                <span className="text-xs text-slate-500 font-medium">
                  {totalQuantity} {totalQuantity === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Items List Preview */}
              <div className="max-h-56 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-200/60">
                {items.map((item) => (
                  <div key={item.product.id} className="pt-2 first:pt-0 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                      {item.product.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Qty: {item.quantity} × ₹{item.product.price?.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">
                        ₹{((item.product.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-emerald-600">Free / Covered by Seller</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total Payable</span>
                  <span className="text-lg text-sky-700">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 justify-center">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secure Wholesaler Order Dispatch</span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Place Order (₹{subtotal.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
