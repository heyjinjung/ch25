import "./HomeRedesign.css";

const ASSET_PATH = "/src/v2/public/assets/01home";

export default function HomePage() {
  return (
    <div className="home-content-container pt-4">
      {/* 32px Notice Bar moved to V2AppLayout */}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-main-title">
          <h2 className="hero-title-text">MAIN TITLE</h2>
          <button className="hero-button">BUTTON</button>
        </div>
      </section>

      {/* Quick Action Slots */}
      <div className="quick-actions my-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="action-slot flex items-center justify-center">
             <img src={`${ASSET_PATH}/Vector-${i}.svg`} alt={`icon-${i}`} className="w-8 h-8 opacity-40" />
          </div>
        ))}
      </div>

      {/* Feature Section */}
      <section className="feature-section">
        <div className="today-label">today / 18pt</div>
        <div className="feature-card">
          {/* Main feature content here */}
        </div>
      </section>
    </div>
  );
}
