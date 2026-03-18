import React, { useState } from "react";
import Sidebar from "../../components/common/Sidebar";
import AnalyticsPage from "./AnalyticsPage";
import ChartPage from "./ChartPage";
import ForecastPage from "./ForecastPage";
import RevenuePage from "./RevenuePage";
import ManageProducts from "./ManageProducts";
import ManageVoucher from "./ManageVoucher";
import ManageBanner from "./ManageBanner";
import ManageFlashsale from "./ManageFlashsale";

const PAGES = {
  analytics:       <AnalyticsPage />,
  chart:           <ChartPage />,
  forecast:        <ForecastPage />,
  revenue:         <RevenuePage />,
  manage_products: <ManageProducts />,
  manage_vouchers: <ManageVoucher />,
  manage_banners:  <ManageBanner />,
  manage_flashsale:<ManageFlashsale />,
};

const ShopOwner = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu,  setActiveMenu]  = useState("analytics");

  return (
    <div className="flex h-screen bg-default-50 overflow-hidden">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex-1 overflow-auto">
        <div className="p-5 md:p-7">
          {PAGES[activeMenu] || <AnalyticsPage />}
        </div>
      </div>
    </div>
  );
};

export default ShopOwner;
