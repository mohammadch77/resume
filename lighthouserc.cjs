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
        "categories:performance": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 1800 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.02 }],
        "total-blocking-time": ["error", { maxNumericValue: 150 }],
        // initial JavaScript <= 120 KB gzip (transfer size of every script on first load)
        "resource-summary:script:size": ["error", { maxNumericValue: 122880 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
