import { useState } from "react";
import "./App.css";
import { useNotificationHelpers } from "./contexts/NotificationContext";
import { NotificationButton } from "./components/NotificationButton";
import { NotificationToasts } from "./components/NotificationCenter";
import SubscriptionManager from "./components/SubscriptionManager";
import MerchantDashboard from "./components/MerchantDashboard";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import Landing from "./pages/Landing";
import PASBalance from "./components/PASBalance";

import {
  ThirdwebClient,
} from "thirdweb";
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { POLKADOT_HUB_TESTNET } from "./services/x402PaymentService";
import { createSubscriptionAgent, SubscriptionAgent } from "./services/subscriptionService";


// custodial wallets for thirdweb
const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "passkey", "phone"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("global.safe"),
];

interface AppProps {
  thirdwebClient: ThirdwebClient;
}

export default function App({ thirdwebClient }: AppProps) {
  const { notifySuccess, notifyError } = useNotificationHelpers();
  const [showLanding, setShowLanding] = useState(true);
  const [activeView, setActiveView] = useState<'subscriptions' | 'analytics'>('subscriptions');
  const [dashboardMode, setDashboardMode] = useState<"user" | "merchant">("user");

  // Initialize subscription agent
  const [subscriptionAgent] = useState<SubscriptionAgent>(() => 
    createSubscriptionAgent(thirdwebClient)
  );

  if (showLanding) {
    return <Landing onEnterApp={() => setShowLanding(false)} />;
  }

  return (
    <div className="app">
      {/* Toast Notifications */}
      <NotificationToasts />
      
      {/* Modern Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-logo">
            <button type="button" className="header-logo-link" onClick={() => setShowLanding(true)}>
              🤖 Ankara
            </button>
          </div>
          <div className="header-actions">
            <NotificationButton />
            <PASBalance client={thirdwebClient} />
            <ConnectButton
              client={thirdwebClient}
              wallets={wallets}
              chain={POLKADOT_HUB_TESTNET}
            />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="main-nav">
        <button
          className={activeView === 'subscriptions' ? 'active' : ''}
          onClick={() => setActiveView('subscriptions')}
        >
          📋 Subscriptions
        </button>
        <button
          className={activeView === 'analytics' ? 'active' : ''}
          onClick={() => setActiveView('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      <div className="main-content">
        <div className="tab-content">
          {activeView === 'subscriptions' ? (
            <>
              <div className="dashboard-nav" style={{ marginTop: "0.25rem" }}>
                <button
                  type="button"
                  className={dashboardMode === "user" ? "nav-tab active" : "nav-tab"}
                  onClick={() => setDashboardMode("user")}
                >
                  👤 User Dashboard
                </button>
                <button
                  type="button"
                  className={dashboardMode === "merchant" ? "nav-tab active" : "nav-tab"}
                  onClick={() => setDashboardMode("merchant")}
                >
                  🏪 Merchant Dashboard
                </button>
              </div>

              {dashboardMode === "user" ? (
                <SubscriptionManager
                  client={thirdwebClient}
                  subscriptionAgent={subscriptionAgent}
                  onSuccess={(message) => {
                    notifySuccess("Success", message);
                  }}
                  onError={(message) => {
                    notifyError("Error", message);
                  }}
                />
              ) : (
                <MerchantDashboard
                  onSuccess={(message) => {
                    notifySuccess("Success", message);
                  }}
                  onError={(message) => {
                    notifyError("Error", message);
                  }}
                />
              )}
            </>
          ) : (
            <RevenueAnalytics />
          )}
        </div>
      </div>
    </div>
  );
}
