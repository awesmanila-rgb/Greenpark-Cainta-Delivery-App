import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { LocationSharingProvider } from './context/LocationSharingContext'
import { RequireAuth, RouteByStatus } from './routing/guards'
import { RequireRole } from './routing/RequireRole'
import ToastStack from './components/ToastStack'
import NotificationBell from './components/NotificationBell'
import RoleSelect from './pages/RoleSelect'
import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Pending from './pages/Pending'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import ProductList from './pages/merchant/ProductList'
import ProductForm from './pages/merchant/ProductForm'
import OrderList from './pages/merchant/OrderList'
import AdminApprovals from './pages/admin/AdminApprovals'
import JobList from './pages/rider/JobList'
import Settlements from './pages/rider/Settlements'
import MerchantList from './pages/customer/MerchantList'
import MerchantMenu from './pages/customer/MerchantMenu'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import OrderConfirmation from './pages/customer/OrderConfirmation'
import OrderHistory from './pages/customer/OrderHistory'

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <LocationSharingProvider>
        <CartProvider>
          <BrowserRouter>
            <ToastStack />
            <NotificationBell />
            <Routes>
              <Route path="/" element={<RoleSelect />} />
              <Route path="/register/:role" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/redirect" element={<RouteByStatus />} />
              <Route
                path="/pending"
                element={
                  <RequireAuth>
                    <Pending />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/notifications"
                element={
                  <RequireAuth>
                    <Notifications />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route
                path="/merchant/products"
                element={
                  <RequireRole role="merchant">
                    <ProductList />
                  </RequireRole>
                }
              />
              <Route
                path="/merchant/products/new"
                element={
                  <RequireRole role="merchant">
                    <ProductForm />
                  </RequireRole>
                }
              />
              <Route
                path="/merchant/products/:id/edit"
                element={
                  <RequireRole role="merchant">
                    <ProductForm />
                  </RequireRole>
                }
              />
              <Route
                path="/merchant/orders"
                element={
                  <RequireRole role="merchant">
                    <OrderList />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/approvals"
                element={
                  <RequireRole role="admin">
                    <AdminApprovals />
                  </RequireRole>
                }
              />
              <Route
                path="/rider/jobs"
                element={
                  <RequireRole role="rider">
                    <JobList />
                  </RequireRole>
                }
              />
              <Route
                path="/rider/settlements"
                element={
                  <RequireRole role="rider">
                    <Settlements />
                  </RequireRole>
                }
              />
              <Route
                path="/browse"
                element={
                  <RequireRole role="customer">
                    <MerchantList />
                  </RequireRole>
                }
              />
              <Route
                path="/orders"
                element={
                  <RequireRole role="customer">
                    <OrderHistory />
                  </RequireRole>
                }
              />
              <Route
                path="/merchants/:id"
                element={
                  <RequireRole role="customer">
                    <MerchantMenu />
                  </RequireRole>
                }
              />
              <Route
                path="/cart"
                element={
                  <RequireRole role="customer">
                    <Cart />
                  </RequireRole>
                }
              />
              <Route
                path="/checkout"
                element={
                  <RequireRole role="customer">
                    <Checkout />
                  </RequireRole>
                }
              />
              <Route
                path="/orders/:id/confirmation"
                element={
                  <RequireRole role="customer">
                    <OrderConfirmation />
                  </RequireRole>
                }
              />
            </Routes>
          </BrowserRouter>
        </CartProvider>
        </LocationSharingProvider>
      </NotificationsProvider>
    </AuthProvider>
  )
}
