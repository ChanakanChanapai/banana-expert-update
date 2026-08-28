import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import Pages
import Index from "./pages/Index";
import Auth from "./pages/auth/Auth";
import ResetPassword from "./pages/auth/ResetPassword"; // เพิ่ม Import หน้า Reset Password
import Knowledge from "./pages/Knowledge";
import CultivarDetail from "./pages/CultivarDetail";
import Market from "./pages/Market";
import Dashboard from "./pages/user/Dashboard";
import ProductDetail from "./pages/ProductDetail";
import UpdateProfile from "./pages/user/UpdateProfile";
import NotFound from "./pages/NotFound";
import UserOrders from "./pages/user/UserOrders";
import FarmReviews from "@/pages/FarmReviews";

// Farm Pages
import FarmDashboard from "./pages/farm/FarmDashboard";
import AddProduct from "./pages/farm/AddProduct";
import EditProduct from "./pages/farm/EditProduct";
import ManageProducts from "./pages/farm/ManageProducts";
import FarmOrders from "./pages/farm/FarmOrders";
import OrderDetail from "./pages/farm/OrderDetail";
import FarmPublic from "@/pages/farm/FarmPublic";

import BananaChatbot from "@/components/chat/BananaChatbot";
import ScrollToTop from "@/components/layout/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* 🏠 Main Route */}
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} /> {/* เพิ่ม Route สำหรับตั้งรหัสผ่านใหม่ */}

          {/* 📖 Knowledge & Cultivar */}
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/knowledge/:slug" element={<CultivarDetail />} />
          <Route path="/cultivar/:slug" element={<CultivarDetail />} />

          {/* 🛒 Market & Products */}
          <Route path="/market" element={<Market />} />
          <Route path="/market/product/:id" element={<ProductDetail />} />

          {/* 👤 User & Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/orders" element={<UserOrders />} />
          <Route path="/profile" element={<UpdateProfile />} />

          {/* 🚜 Farm Management */}
          <Route path="/farm/dashboard" element={<FarmDashboard />} />
          <Route path="/farm/products" element={<ManageProducts />} />
          <Route path="/farm/products/add" element={<AddProduct />} />
          <Route path="/farm/products/edit/:id" element={<EditProduct />} />
          <Route path="/farm/orders" element={<FarmOrders />} />
          <Route path="/farm/orders/:id" element={<OrderDetail />} />

          {/* Farm Public Profile */}
          <Route path="/farm/:farmId" element={<FarmPublic />} />
          <Route path="/farm/reviews/:farmId" element={<FarmReviews />} />

          {/* Catch-all Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Banana AI Chatbot Assistant */}
        <BananaChatbot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
