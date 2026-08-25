import React, { useState } from 'react';
import {
  X,
  Package,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Printer,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  isEditable?: boolean;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  isEditable = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order?.status || 'NEW');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleStatusChange = async () => {
    if (!onUpdateStatus || selectedStatus === order.status) return;
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, selectedStatus, statusNote.trim() || undefined);
      setSuccessNotice(`Order status successfully updated to ${selectedStatus}`);
      setStatusNote('');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CONFIRMED':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'PROCESSING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Order Details</h2>
                <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-sky-300">
                  {order.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Print Order"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Quick Action Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status:</span>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${getStatusBadge(
                  order.status
                )}`}
              >
                {order.status}
              </span>
              {order.emailSent && (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                  📧 Seller Email Dispatched
                </span>
              )}
            </div>

            {/* Status Updater for Seller / Admin */}
            {isEditable && onUpdateStatus && (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                <input
                  type="text"
                  placeholder="Optional update note..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-48 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />

                <button
                  onClick={handleStatusChange}
                  disabled={isUpdating || selectedStatus === order.status}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Update</span>
                </button>
              </div>
            )}
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-sky-600" />
                <span>Customer Profile</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Name:</span>
                  <span className="font-bold text-slate-900">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Mobile:</span>
                  <a href={`tel:${order.customerMobile}`} className="font-bold text-sky-600 hover:underline">
                    {order.customerMobile}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Email:</span>
                  <a href={`mailto:${order.customerEmail}`} className="font-medium text-sky-600 hover:underline">
                    {order.customerEmail}
                  </a>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>Delivery Address</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {order.deliveryAddress?.fullAddress ||
                  `${order.deliveryAddress?.houseNumber}, ${order.deliveryAddress?.streetArea}, ${order.deliveryAddress?.city}, ${order.deliveryAddress?.state} - ${order.deliveryAddress?.pincode}`}
              </p>
              {order.orderNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                  <span className="font-bold">Customer Notes: </span>
                  {order.orderNotes}
                </div>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Order Items ({order.items.length})
              </span>
              <span className="text-xs text-slate-500">
                Total Quantity: {order.items.reduce((acc, i) => acc + (i.quantity || 1), 0)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3 text-center">Quantity</th>
                    <th className="px-5 py-3 text-right">Unit Price</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
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
                          <div>
                            <span className="font-bold text-slate-900 block leading-snug">{item.productName}</span>
                            <span className="text-[11px] text-slate-500">{item.unit || 'Piece'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">{item.sku || '—'}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="px-5 py-3.5 text-right text-slate-600">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹{item.subtotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-5 py-2.5 text-right font-semibold text-slate-600">
                      Subtotal:
                    </td>
                    <td className="px-5 py-2.5 text-right font-bold text-slate-900">
                      ₹{order.subtotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-2 text-right font-semibold text-slate-600">
                      Shipping / Delivery:
                    </td>
                    <td className="px-5 py-2 text-right font-semibold text-emerald-600">Free / Standard</td>
                  </tr>
                  <tr className="border-t border-slate-200 text-sm">
                    <td colSpan={4} className="px-5 py-3 text-right font-black text-slate-900">
                      Total Order Amount:
                    </td>
                    <td className="px-5 py-3 text-right font-black text-sky-700 text-base">
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Timeline History */}
          {order.timeline && order.timeline.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Order Activity & Status Timeline
              </h4>
              <div className="space-y-3">
                {order.timeline.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{entry.status}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(entry.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      {entry.note && <p className="text-slate-600 mt-0.5">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
