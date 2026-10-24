/**
 * Lighthouse CI, mobile, throttled (CLAUDE.md section 3). Run with `npm run lhci`, which starts a production build on
 * port 3101 against the e2e database (seeded with the landing fixture) and points Lighthouse at Playwright's Chromium.
 * Lab data has no INP; Total Blocking Time is the lab proxy and carries the 150 ms budget.
 */
const BASE = process.env.LHCI_BASE_URL ?? "http://localhost:3101";

module.exports = {
  ci: {
    collect: {
      url: [`${BASE}/`, `${BASE}/work/home-appliances-store`],
      numberOfRuns: Number(process.env.LHCI_RUNS ?? 3),
      settings: {
        // Lighthouse's default mobile profile: Moto G Power emulation, simulated slow 4G (150 ms RTT, 1.6 Mbps), 4x CPU slowdown
        formFactor: "mobile",
        chromeFlags: "--headless=new --no-sandbox --disable-gpu",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
    },
    assert: {
      assertions: {
        // Hard gates (always fail the run): layout stability and accessibility.
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.02 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        // Speed budgets: warn on this machine (simulated throttling on a dev laptop, `next start` without Nginx/HTTP2).
        // The full gate (error) is for Phase 8 on the real server; see docs/BACKLOG.md.
        "categories:performance": ["warn", { minScore: 0.95 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        "total-blocking-time": ["warn", { maxNumericValue: 150 }],
        // initial JavaScript <= 160 KB gzip (transfer size of every script on first load); the Next/React floor is ~135 KB
        "resource-summary:script:size": ["warn", { maxNumericValue: 163840 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
