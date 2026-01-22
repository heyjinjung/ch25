// src/v2/pages/home/HomePage.tsx
import "./HomeRedesign.css";

export default function HomePage() {
  return (
    <div className="home-container-v2">
      <div className="home-bg-overlay" />

      {/* Hero Section */}
      <div className="home-hero-card">
        <h1 className="hero-title">
          WELCOME TO<br />THE GAME
        </h1>
        <div className="hero-cta">PLAY NOW</div>
      </div>

      {/* Quick Access Tiles */}
      <div className="home-quick-grid">
        <div className="quick-card" />
        <div className="quick-card" />
        <div className="quick-card" />
        <div className="quick-card" />
      </div>

      {/* Featured Section */}
      <div className="home-featured-section">
        <div className="featured-header">
          <span className="featured-label">today / 18pt</span>
        </div>
        <div className="featured-card" />
      </div>
    </div>
  );
}
