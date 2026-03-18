import "./Landing.css";

interface LandingProps {
  onEnterApp: () => void;
}

export default function Landing({ onEnterApp }: LandingProps) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <span className="landing-logo">🤖 Bumpa</span>
          <button type="button" className="landing-nav-cta" onClick={onEnterApp}>
            Open app
          </button>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="landing-hero-content">
          <h1 className="landing-title">
            Smart subscriptions
            <br />
            <span className="landing-title-accent">on Polkadot</span>
          </h1>
          <p className="landing-lead">
            Create and manage recurring payments in native PAS or stablecoins (USDC, USDt). Connect your wallet and pay when due.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="landing-btn landing-btn-primary" onClick={onEnterApp}>
              Get started
            </button>
            <a
              href="https://blockscout-testnet.polkadot.io"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn landing-btn-ghost"
            >
              View on Polkadot Explorer
            </a>
          </div>
        </div>
      </header>

      <section className="landing-features">
        <div className="landing-features-inner">
          <h2 className="landing-section-title">Why Bumpa</h2>
          <ul className="landing-feature-list">
            <li className="landing-feature">
              <span className="landing-feature-icon">💧</span>
              <div>
                <strong>Pay in PAS or stablecoins</strong>
                <p>Pay with native PAS or Polkadot Hub stablecoins (USDC, USDt) with one click when a payment is due.</p>
              </div>
            </li>
            <li className="landing-feature">
              <span className="landing-feature-icon">📋</span>
              <div>
                <strong>On-chain subscriptions</strong>
                <p>Create weekly, monthly, or yearly subscriptions on Polkadot Hub. Recipients get PAS directly.</p>
              </div>
            </li>
            <li className="landing-feature">
              <span className="landing-feature-icon">🤖</span>
              <div>
                <strong>AI suggestions</strong>
                <p>Get cancellation and usage suggestions so you keep only the subscriptions you need.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2 className="landing-cta-title">Ready to manage your subscriptions?</h2>
          <p className="landing-cta-text">Connect your wallet on Polkadot Hub TestNet and create your first subscription.</p>
          <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={onEnterApp}>
            Open app
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-logo">🤖 Bumpa</span>
          <p className="landing-footer-tagline">Smart subscription manager on Polkadot Hub</p>
        </div>
      </footer>
    </div>
  );
}
