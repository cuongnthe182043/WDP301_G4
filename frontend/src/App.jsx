import React, { useEffect } from "react";
import AppRouter from "./router";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import { useNotifications } from "./context/NotificationContext";
import { userService } from "./services/userService";
import AppLoader from "./components/ui/AppLoader";
import TopProgressBar from "./components/ui/TopProgressBar";
import ScrollToTop from "./components/ui/ScrollToTop";

export default function App() {
  const { user, logout, isAuthenticated, authReady, updateUser } = useAuth();
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();

  // Refresh user profile on login to get latest avatar_url and other fields
  // userService.get() returns { user: {...} } from the API wrapper — extract the inner user
  useEffect(() => {
    if (!isAuthenticated) return;
    userService.get().then((res) => {
      const profile = res?.user || res;
      if (profile?._id || profile?.email) updateUser(profile);
    }).catch(() => {});
  }, [isAuthenticated]);

  return (
    <>
      {/* Full-screen branded loader — visible until AuthContext finishes initialising */}
      <AppLoader ready={authReady} />

      {/* Thin top progress bar on every route change */}
      <TopProgressBar />

      <div className="app-container">
        <ScrollToTop />
        <Header
          user={user}
          cartCount={itemCount}
          notifyCount={unreadCount}
          onLogout={logout}
        />
        <AppRouter />
        <Footer />
      </div>
    </>
  );
}
