import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  KeyRound,
  Trash2,
  Shield,
  Briefcase,
  Store,
  RefreshCw,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Lock,
  Phone
} from 'lucide-react';
import { AppUser, UserRole, UserStatus } from '../types';
import {
  fetchAllUsers,
  createNewUser,
  updateExistingUser,
  adminResetUserPassword,
  deleteExistingUser
} from '../lib/authService';

interface UserManagementProps {
  currentUser: AppUser;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<AppUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
    role: 'SELLER' as UserRole,
    status: 'ACTIVE' as UserStatus,
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    displayName: '',
    mobileNumber: '',
    role: 'SELLER' as UserRole,
    status: 'ACTIVE' as UserStatus,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load user list', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Stats Calculations
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const inactiveUsers = users.filter((u) => u.status === 'INACTIVE').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const employeeCount = users.filter((u) => u.role === 'EMPLOYEE').length;
  const sellerCount = users.filter((u) => u.role === 'SELLER').length;

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.mobileNumber && u.mobileNumber.includes(q));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesQuery && matchesRole && matchesStatus;
  });

  // Handle Create
  const handleOpenCreate = () => {
    setCreateForm({
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      mobileNumber: '',
      role: 'SELLER',
      status: 'ACTIVE',
    });
    setCreateError(null);
    setShowCreatePassword(false);
    setIsCreateModalOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.displayName.trim()) {
      setCreateError('Full name is required.');
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes('@')) {
      setCreateError('A valid email address is required.');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Passwords do not match.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const created = await createNewUser({
        displayName: createForm.displayName,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        status: createForm.status,
        mobileNumber: createForm.mobileNumber || undefined,
      });

      setUsers([created, ...users]);
      setIsCreateModalOpen(false);
      showToast(`User ${created.email} successfully created.`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit
  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName,
      mobileNumber: user.mobileNumber || '',
      role: user.role,
      status: user.status,
    });
    setEditError(null);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editForm.displayName.trim()) {
      setEditError('Full name is required.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await updateExistingUser(editingUser.uid, {
        displayName: editForm.displayName,
        mobileNumber: editForm.mobileNumber || undefined,
        role: editForm.role,
        status: editForm.status,
      });

      setUsers(users.map((u) => (u.uid === updated.uid ? updated : u)));
      setEditingUser(null);
      showToast(`User ${updated.email} updated.`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle Status (Enable/Disable)
  const handleToggleStatus = async (user: AppUser) => {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await updateExistingUser(user.uid, { status: nextStatus });
      setUsers(users.map((u) => (u.uid === updated.uid ? updated : u)));
      showToast(`User ${user.email} is now ${nextStatus === 'ACTIVE' ? 'Active' : 'Disabled'}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  // Handle Reset Password
  const handleOpenResetPassword = (user: AppUser) => {
    setPasswordResetUser(user);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetError(null);
    setShowNewPassword(false);
  };

  const handleSubmitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser) return;
    setResetError(null);

    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setIsSubmittingReset(true);
    try {
      await adminResetUserPassword(passwordResetUser.uid, newPassword);
      setPasswordResetUser(null);
      showToast(`Password reset successfully for ${passwordResetUser.email}.`);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteExistingUser(deletingUser.uid);
      setUsers(users.filter((u) => u.uid !== deletingUser.uid));
      setDeletingUser(null);
      showToast(`User ${deletingUser.email} deleted.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user.', 'error');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-semibold">
            <Shield className="w-3 h-3 text-purple-600" />
            Admin
          </span>
        );
      case 'EMPLOYEE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
            <Briefcase className="w-3 h-3 text-amber-600" />
            Employee
          </span>
        );
      case 'SELLER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
            <Store className="w-3 h-3 text-blue-600" />
            Seller
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalUsers}</div>
          <span className="text-[11px] text-slate-500">Registered accounts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{activeUsers}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Enabled accounts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inactive</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-400">{inactiveUsers}</div>
          <span className="text-[11px] text-slate-400">Disabled / Suspended</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Admins</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{adminCount}</div>
          <span className="text-[11px] text-purple-600 font-medium">Full master access</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Employees</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{employeeCount}</div>
          <span className="text-[11px] text-amber-600 font-medium">Staff & associates</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sellers</span>
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{sellerCount}</div>
          <span className="text-[11px] text-blue-600 font-medium">Store & tenant users</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header & Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              User Management
            </h2>
            <p className="text-xs text-slate-500">
              Create, edit, assign roles, reset passwords, and manage status for system accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-56 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, mobile..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="SELLER">Seller</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadUsers}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Create User Button */}
            <button
              onClick={handleOpenCreate}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create User
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email / User ID</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    {isLoading ? 'Loading users...' : 'No users match the search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/75 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <span>{user.displayName}</span>
                          {user.uid === currentUser.uid && (
                            <span className="ml-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                      {user.email}
                    </td>

                    <td className="py-3.5 px-4">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {user.mobileNumber ? (
                        <span>{user.mobileNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Not provided</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={user.email === 'admin@sparkgentech.com'}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        } ${user.email === 'admin@sparkgentech.com' ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={
                          user.email === 'admin@sparkgentech.com'
                            ? 'Primary admin cannot be disabled'
                            : `Click to ${user.status === 'ACTIVE' ? 'Disable' : 'Enable'}`
                        }
                      >
                        {user.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-red-600" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenResetPassword(user)}
                          className="p-1.5 rounded-md hover:bg-amber-50 text-amber-600 hover:text-amber-800 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {user.email !== 'admin@sparkgentech.com' && (
                          <button
                            onClick={() => setDeletingUser(user)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-600 hover:text-red-800 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Create New User</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email / User ID *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@sparkgentech.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Min 6 chars"
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-slate-400 font-normal">(Optional; NOT used for login)</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={createForm.mobileNumber}
                    onChange={(e) => setCreateForm({ ...createForm, mobileNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e: any) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="SELLER">Seller</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status *</label>
                  <select
                    value={createForm.status}
                    onChange={(e: any) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">Active (Can log in)</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingCreate ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Edit User</h3>
                  <span className="text-[11px] font-mono text-slate-500">{editingUser.email}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={editForm.mobileNumber}
                  onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={editForm.role}
                    disabled={editingUser.email === 'admin@sparkgentech.com'}
                    onChange={(e: any) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="SELLER">Seller</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status *</label>
                  <select
                    value={editForm.status}
                    disabled={editingUser.email === 'admin@sparkgentech.com'}
                    onChange={(e: any) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Reset User Password</h3>
                  <span className="text-[11px] font-mono text-slate-500">{passwordResetUser.email}</span>
                </div>
              </div>
              <button
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50"
                >
                  {isSubmittingReset ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm text-slate-900">Delete User Account?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-800">{deletingUser.email}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium shadow-xs transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs flex items-center gap-2 animate-in fade-in ${
            toastMsg.type === 'error'
              ? 'bg-red-900 text-white border border-red-800'
              : 'bg-slate-900 text-white border border-slate-800'
          }`}
        >
          {toastMsg.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
};
