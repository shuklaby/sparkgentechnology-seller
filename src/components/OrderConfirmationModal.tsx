import React from 'react';
import {
  CheckCircle2,
  Package,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  ArrowRight,
  Printer,
  Copy,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { Order } from '../types';

interface OrderConfirmationModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOrderDetails?: (order: Order) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  isOpen,
  onClose,
  onViewOrderDetails,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !order) return null;

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-xs border border-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Order Placed Successfully!</h2>
          <p className="text-emerald-100 text-sm mt-1">
            Your order has been transmitted directly to {order.sellerName || 'the supplier'}.
          </p>

          {/* Order ID Pill */}
          <div className="mt-4 inline-flex items-center gap-2 bg-slate-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            <span className="text-xs text-emerald-200 uppercase font-bold tracking-wider">Order ID:</span>
            <span className="font-mono font-bold text-white text-sm">{order.id}</span>
            <button
              onClick={copyOrderId}
              className="p-1 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white"
              title="Copy Order ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Order Details Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Customer & Shipping Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5 text-sky-600" />
                Customer
              </div>
              <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
              <p className="text-xs text-slate-600 mt-1">{order.customerMobile}</p>
              <p className="text-xs text-slate-600">{order.customerEmail}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                Delivery Address
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {order.deliveryAddress?.fullAddress || `${order.deliveryAddress?.houseNumber}, ${order.deliveryAddress?.streetArea}, ${order.deliveryAddress?.city}, ${order.deliveryAddress?.state} - ${order.deliveryAddress?.pincode}`}
              </p>
              {order.orderNotes && (
                <p className="text-xs text-slate-500 italic mt-1.5">Note: {order.orderNotes}</p>
              )}
            </div>
          </div>

          {/* Ordered Products Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Ordered Items ({order.items.length})
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.quantity} {item.unit || 'unit'} × ₹{item.unitPrice.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    ₹{item.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Calculation */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-sky-700 font-semibold block">Total Amount</span>
              <span className="text-xs text-sky-600">Inclusive of all applicable wholesale terms</span>
            </div>
            <span className="text-xl font-black text-sky-900">
              ₹{order.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </button>

          <div className="flex items-center gap-2">
            {onViewOrderDetails && (
              <button
                onClick={() => {
                  onViewOrderDetails(order);
                  onClose();
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                View Order Details
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
