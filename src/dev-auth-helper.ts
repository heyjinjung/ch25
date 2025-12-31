/**
 * Development mode authentication helper
 * 
 * Usage in browser console:
 * 1. Open http://localhost:5173
 * 2. Open browser console (F12)
 * 3. Run: await window.devAuth()
 * 4. Refresh page - you're now logged in as test user!
 */

// Add to window for easy access
declare global {
    interface Window {
        devAuth: () => Promise<void>;
        devLogout: () => void;
    }
}

/**
 * Get test user token from backend and store in localStorage
 */
window.devAuth = async () => {
    try {
        const response = await fetch("http://localhost:8000/api/dev/create-test-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("❌ Dev auth failed:", error);
            alert("Dev auth failed. Make sure backend is running in dev mode.");
            return;
        }

        const data = await response.json();

        // Store token in localStorage
        localStorage.setItem("token", data.access_token);

        console.log("✅ Dev auth successful!");
        console.log("User:", data.user);
        console.log("Token:", data.access_token);
        console.log("\n🔄 Refreshing page...");

        // Refresh to apply auth
        setTimeout(() => window.location.reload(), 500);
    } catch (error) {
        console.error("❌ Dev auth error:", error);
        alert("Dev auth failed. Make sure backend is running on http://localhost:8000");
    }
};

/**
 * Clear auth token
 */
window.devLogout = () => {
    localStorage.removeItem("token");
    console.log("✅ Logged out. Refreshing...");
    setTimeout(() => window.location.reload(), 500);
};

// Auto-run on load in development
if (import.meta.env.DEV) {
    console.log(`
╔═══════════════════════════════════════════════╗
║  🛠️  Development Mode Authentication Helper  ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  Quick Login:                                 ║
║  → await window.devAuth()                     ║
║                                               ║
║  Logout:                                      ║
║  → window.devLogout()                         ║
║                                               ║
║  Test User:                                   ║
║  - Username: 개발 테스트 유저                 ║
║  - Level: 10                                  ║
║  - Vault: 100,000원                           ║
║  - Cash: 25,000원                             ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
}

export { };
