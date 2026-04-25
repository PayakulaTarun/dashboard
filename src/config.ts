// All secrets are read from environment variables (defined in .env)
// Never hardcode tokens here – .env is gitignored.
export const shopifyConfig = {
  storeUrl: import.meta.env.VITE_SHOPIFY_STORE_URL as string,
  adminToken: import.meta.env.VITE_SHOPIFY_ADMIN_TOKEN as string,
  apiBase: "/shopify", // Vite proxies /shopify/* → Shopify Admin REST API
};
