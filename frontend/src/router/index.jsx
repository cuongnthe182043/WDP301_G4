import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ===== Auth Pages ===== */
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ChangePassword from "../pages/auth/ChangePassword";
import TermsAndPolicy from "../pages/support/TermsAndPolicy";

/* ===== Customer Pages ===== */
import HomePage from "../pages/customer/HomePage";
import ProductDetail from "../pages/customer/ProductDetail";
import AllProductsPages from "../pages/customer/AllProductsPages";
import CategoryProductsPage from "../pages/customer/CategoryProductsPage";
import ProfilePage from "../pages/customer/Profile";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import PaymentReturn from "../pages/customer/PaymentReturn";
import OrderDetail from "../pages/customer/OrderDetail";
import Orders from "../pages/customer/Orders";
import Wishlist from "../pages/customer/Wishlist";
import Wallet from "../pages/customer/Wallet";

/* ===== Support / Ticket Pages (customer-facing) ===== */
import Tickets from "../pages/support/Tickets";
import TicketDetail from "../pages/support/TicketDetail";

/* ===== Shop (Seller) Pages ===== */
import ShopLayout from "../pages/shop/ShopLayout";
import Dashboard from "../pages/shop/Dashboard";
import ManageProducts from "../pages/shop/ManageProducts";
import AddProduct from "../pages/shop/AddProduct";
import LowStockPage from "../pages/shop/LowStockPage";
import CategoriesPage from "../pages/shop/CategoriesPage";
import AttributesPage from "../pages/shop/AttributesPage";
import BrandsPage from "../pages/shop/BrandsPage";
import VariantsPage from "../pages/shop/VariantsPage";

/* ===== New Vendor / Admin Pages ===== */
import RegisterShop from "../pages/customer/RegisterShop";
import ShopPage from "../pages/customer/ShopPage";
import ShopSettings from "../pages/shop/ShopSettings";
import AdminShops from "../pages/admin/AdminShops";

/* ===== Admin Pages ===== */
import AdminLayout from "../pages/admin/AdminLayout";
import SystemConfig from "../pages/admin/SystemConfig";
import AuditLogs from "../pages/admin/AuditLogs";
import Reconciliation from "../pages/admin/Reconciliation";
import ApiKeyManager from "../pages/admin/ApiKeyManager";

/* ===== Other Roles ===== */
import SalesOrders from "../pages/sales/SalesOrders";
import NotFound from "../pages/errors/NotFound";

/* ===== Route Guards ===== */
function ProtectedRoute({ children }) {
  const { isAuthenticated, authReady } = useAuth();
  if (!authReady) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ children, roles = [], permAny = [], permAll = [] }) {
  const { user, authReady } = useAuth();
  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  const roleName = user.role_name || user.role || user.role_id;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const roleOK    = roles.length   === 0 ? true : roles.includes(roleName);
  const permAnyOK = permAny.length === 0 ? true : permAny.some((p) => perms.includes(p));
  const permAllOK = permAll.length === 0 ? true : permAll.every((p) => perms.includes(p));
  return roleOK && permAnyOK && permAllOK ? children : <Navigate to="/" replace />;
}

function ShopGuard({ children }) {
  return (
    <ProtectedRoute>
      <RoleRoute roles={["shop_owner", "sales", "system_admin"]}>
        {children}
      </RoleRoute>
    </ProtectedRoute>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* ===== Public ===== */}
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/legal/privacy"   element={<TermsAndPolicy />} />

      {/* ===== Auth Required ===== */}
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

      {/* ===== Customer — Public ===== */}
      <Route path="/"                   element={<HomePage />} />
      <Route path="/product/:idOrSlug"  element={<ProductDetail />} />
      <Route path="/products/:idOrSlug" element={<ProductDetail />} />
      <Route path="/products"           element={<AllProductsPages />} />
      <Route path="/search"             element={<AllProductsPages />} />
      <Route path="/categories/:slug"   element={<CategoryProductsPage />} />
      <Route path="/shops/:shopSlug"    element={<ShopPage />} />

      {/* ===== Customer — Protected ===== */}
      <Route path="/register-shop" element={<ProtectedRoute><RegisterShop /></ProtectedRoute>} />
      <Route path="/profile"  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/cart"     element={<ProtectedRoute><Cart /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/payment/return" element={<ProtectedRoute><PaymentReturn /></ProtectedRoute>} />
      <Route path="/orders"         element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/orders/:id"     element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
      <Route path="/wishlist"       element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
      <Route path="/wallet"         element={<ProtectedRoute><Wallet /></ProtectedRoute>} />

      {/* ===== Customer Support / Tickets ===== */}
      <Route path="/tickets"     element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
      <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
      {/* Legacy support route — redirect customers to /tickets */}
      <Route path="/support/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />

      {/* ===== SHOP AREA ===== */}
      <Route path="/shop" element={<ShopGuard><ShopLayout /></ShopGuard>}>
        <Route index                              element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"                   element={<Dashboard />} />
        <Route path="admin/products"              element={<ManageProducts />} />
        <Route path="admin/products/new"          element={<AddProduct />} />
        <Route path="admin/products/:id"          element={<AddProduct mode="edit" />} />
        <Route path="admin/products/:id/variants" element={<VariantsPage />} />
        <Route path="inventory/low-stock"         element={<LowStockPage />} />
        <Route path="catalog/categories"          element={<CategoriesPage />} />
        <Route path="catalog/attributes"          element={<AttributesPage />} />
        <Route path="catalog/brands"              element={<BrandsPage />} />
        <Route path="settings"                    element={<ShopSettings />} />
      </Route>

      {/* Backward-compat shop redirects */}
      <Route path="/shop/products"     element={<Navigate to="/shop/admin/products" replace />} />
      <Route path="/shop/products/new" element={<Navigate to="/shop/admin/products/new" replace />} />
      <Route path="/shop/dashboard"    element={<Navigate to="/shop" replace />} />

      {/* ===== Sales ===== */}
      <Route path="/sales/orders" element={<RoleRoute roles={["sales"]}><SalesOrders /></RoleRoute>} />

      {/* ===== Admin ===== */}
      <Route path="/admin" element={<RoleRoute roles={["system_admin"]}><AdminLayout /></RoleRoute>}>
        <Route index element={<Navigate to="/admin/shops" replace />} />
        <Route path="shops"          element={<AdminShops />} />
        <Route path="system-config"  element={<SystemConfig />} />
        <Route path="audit-logs"     element={<AuditLogs />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="api-keys"       element={<ApiKeyManager />} />
      </Route>

      {/* ===== 404 ===== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
