import { Route, Routes } from 'react-router-dom'
import AdminContactsPage from '@/pages/admin/AdminContactsPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminPage from '@/pages/admin/AdminPage'
import ResourceDetailPage from '@/pages/admin/ResourceDetailPage'
import ResourceFormPage from '@/pages/admin/ResourceFormPage'
import ResourceManagePage from '@/pages/admin/ResourceManagePage'
import ProductCreatePage from '@/pages/admin/ProductCreatePage'
import ProductEditPage from '@/pages/admin/ProductEditPage'
import ProductManagePage from '@/pages/admin/ProductManagePage'
import AdminRoute from '@/routes/AdminRoute'
import BoardPage from '@/pages/BoardPage'
import BoardResourceDetailPage from '@/pages/BoardResourceDetailPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import ContactPage from '@/pages/ContactPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import MyContactEditPage from '@/pages/MyContactEditPage'
import MyContactsPage from '@/pages/MyContactsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OrderCompletePage from '@/pages/OrderCompletePage'
import OrdersPage from '@/pages/OrdersPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import ProductsPage from '@/pages/ProductsPage'
import ProfilePage from '@/pages/ProfilePage'
import QuotePayPage from '@/pages/QuotePayPage'
import ReviewsPage from '@/pages/ReviewsPage'
import ReviewEditPage from '@/pages/ReviewEditPage'
import ReviewWritePage from '@/pages/ReviewWritePage'
import SignUpPage from '@/pages/SignUpPage'

function AppRouter() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/reviews/write" element={<ReviewWritePage />} />
      <Route path="/reviews/:reviewId/edit" element={<ReviewEditPage />} />
      <Route path="/board/resources/new" element={<ResourceFormPage />} />
      <Route path="/board/resources/:id" element={<BoardResourceDetailPage />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/contacts" element={<MyContactsPage />} />
      <Route path="/profile/contacts/:contactId/edit" element={<MyContactEditPage />} />
      <Route path="/quotes/pay/:token" element={<QuotePayPage />} />
      <Route path="/orders/complete" element={<OrderCompletePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/contacts"
        element={
          <AdminRoute>
            <AdminContactsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <AdminOrdersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/resources"
        element={
          <AdminRoute>
            <ResourceManagePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/resources/new"
        element={
          <AdminRoute>
            <ResourceFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/resources/:id/edit"
        element={
          <AdminRoute>
            <ResourceFormPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/resources/:id"
        element={
          <AdminRoute>
            <ResourceDetailPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <AdminRoute>
            <ProductManagePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/products/new"
        element={
          <AdminRoute>
            <ProductCreatePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/products/:id/edit"
        element={
          <AdminRoute>
            <ProductEditPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRouter
