import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  TrendingUp,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import {
  fetchSellerOrders,
  updateOrderStatus,
  markOrderAsRead,
} from '../lib/orderService';
import { OrderDetailsModal } from './OrderDetailsModal';

interface SellerOrdersManagerProps {
  sellerId?: string;
  sellerCompanyName?: string;
  isAdminView?: boolean;
}

export const SellerOrdersManager: React.FC<SellerOrdersManagerProps> = ({
  sellerId = 'demo-abc-enterprises',
  sellerCompanyName,
  isAdminView = false,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const list = await fetchSellerOrders(isAdminView ? 'all' : sellerId);
      setOrders(list);
    } catch (err) {
      console.warn('Error loading orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // Poll for new orders every 15 seconds
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [sellerId, isAdminView]);

  const handleOpenOrder = async (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
    if (!order.isReadBySeller) {
      try {
        await markOrderAsRead(order.id);
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, isReadBySeller: true } : o))
        );
      } catch {}
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    const updated = await updateOrderStatus(orderId, newStatus, note);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(updated);
    }
    showToast(`Order ${orderId} status set to ${newStatus}`);
  };

  // Metrics
  const totalOrders = orders.length;
  const newOrders = orders.filter((o) => o.status === 'NEW').length;
  const processingOrders = orders.filter((o) => ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const totalRevenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Filtered List
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerMobile.includes(searchQuery) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.sellerName && order.sellerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMED':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'PROCESSING':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Order Management</h1>
            {newOrders > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                {newOrders} NEW
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track customer procurement requests, update order fulfillment stages, and monitor transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOrders}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Orders</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700">New Orders</span>
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2">{newOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">In Fulfillment</span>
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{processingOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Delivered</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{completedOrders}</p>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Volume</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2 truncate">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-xs font-medium">
          {(
            [
              { id: 'ALL', label: 'All Orders', count: orders.length },
              { id: 'NEW', label: 'New', count: orders.filter((o) => o.status === 'NEW').length },
              { id: 'CONFIRMED', label: 'Confirmed', count: orders.filter((o) => o.status === 'CONFIRMED').length },
              { id: 'PROCESSING', label: 'Processing', count: orders.filter((o) => o.status === 'PROCESSING').length },
              { id: 'SHIPPED', label: 'Shipped', count: orders.filter((o) => o.status === 'SHIPPED').length },
              { id: 'DELIVERED', label: 'Delivered', count: orders.filter((o) => o.status === 'DELIVERED').length },
              { id: 'CANCELLED', label: 'Cancelled', count: orders.filter((o) => o.status === 'CANCELLED').length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, Customer Name, Mobile Number, or Email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? 'No orders match your search parameters. Try clearing the filter.'
                : 'No customer procurement orders have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Order ID & Date</th>
                  <th className="px-5 py-3.5">Customer Details</th>
                  {isAdminView && <th className="px-5 py-3.5">Seller</th>}
                  <th className="px-5 py-3.5">Items Summary</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !order.isReadBySeller ? 'bg-blue-50/30 font-semibold' : ''
                    }`}
                  >
                    {/* Order ID & Date */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {!order.isReadBySeller && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="New Unread Order" />
                        )}
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">{order.id}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {new Date(order.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{order.customerName}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{order.customerMobile}</span>
                        </div>
                      </div>
                    </td>

                    {/* Seller (Admin View Only) */}
                    {isAdminView && (
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {order.sellerName || order.sellerId}
                        </span>
                      </td>
                    )}

                    {/* Items */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="text-slate-900 font-medium">
                          {order.items.length} {order.items.length === 1 ? 'Product' : 'Products'} (
                          {order.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} units)
                        </span>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">
                          {order.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                        </p>
                      </div>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick status dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                          title="Quick Status Change"
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>

                        <button
                          onClick={() => handleOpenOrder(order)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onUpdateStatus={handleUpdateStatus}
        isEditable={true}
      />
    </div>
  );
};
