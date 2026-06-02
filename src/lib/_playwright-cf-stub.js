// Stub used only during Cloudflare Pages builds.
// The real playwright-core is only available on Vercel (Node.js runtime).
export const chromium = {
  launch: async () => { throw new Error('playwright-core is not available on this platform'); },
};
export const firefox = chromium;
export const webkit = chromium;
