import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/I18nProvider";
import { QuoteProvider } from "@/contexts/QuoteContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAdmin, RequireAuth } from "@/components/auth/RouteGuards";
import { Loader2 } from "lucide-react";
import Home from "./pages/Home";
import Brands from "./pages/Brands";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Quote from "./pages/Quote";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MyQuotes from "./pages/MyQuotes";
import MyQuoteDetail from "./pages/MyQuoteDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Profile from "./pages/Profile";
import MyMessages from "./pages/MyMessages";

// Admin pages are heavy; load them on demand
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminStock = lazy(() => import("./pages/admin/AdminStock"));
const AdminQuotes = lazy(() => import("./pages/admin/AdminQuotes"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminImport = lazy(() => import("./pages/admin/AdminImport"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCities = lazy(() => import("./pages/admin/AdminCities"));

const Fallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient();

/** Must match vite.config `base` (e.g. /Industrial_Shakkel/ on GitHub Pages). */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename}>
        <AuthProvider>
          <I18nProvider>
            <QuoteProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner position="top-center" />
                <Suspense fallback={<Fallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/brands" element={<Brands />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:id" element={<ProductDetails />} />
                    <Route path="/quote" element={<Quote />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/my-quotes" element={<RequireAuth><MyQuotes /></RequireAuth>} />
                    <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                    <Route path="/my-messages" element={<RequireAuth><MyMessages /></RequireAuth>} />
                    <Route path="/my-quotes/:id" element={<RequireAuth><MyQuoteDetail /></RequireAuth>} />
                    <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                    <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
                    <Route path="/admin/brands" element={<RequireAdmin><AdminBrands /></RequireAdmin>} />
                    <Route path="/admin/categories" element={<RequireAdmin><AdminCategories /></RequireAdmin>} />
                    <Route path="/admin/products" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
                    <Route path="/admin/stock" element={<RequireAdmin><AdminStock /></RequireAdmin>} />
                    <Route path="/admin/quotes" element={<RequireAdmin><AdminQuotes /></RequireAdmin>} />
                    <Route path="/admin/customers" element={<RequireAdmin><AdminCustomers /></RequireAdmin>} />
                    <Route path="/admin/messages" element={<RequireAdmin><AdminMessages /></RequireAdmin>} />
                    <Route path="/admin/import" element={<RequireAdmin><AdminImport /></RequireAdmin>} />
                    <Route path="/admin/audit-log" element={<RequireAdmin><AdminAuditLog /></RequireAdmin>} />
                    <Route path="/admin/roles" element={<RequireAdmin><AdminRoles /></RequireAdmin>} />
                    <Route path="/admin/settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />
                    <Route path="/admin/cities" element={<RequireAdmin><AdminCities /></RequireAdmin>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </QuoteProvider>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
