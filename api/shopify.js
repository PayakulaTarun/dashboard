export default async function handler(req, res) {
  // Read query parameters
  const { path } = req.query;

  // The actual Shopify Store URL and Admin Token should be set in Vercel's Environment Variables
  const STORE_URL = process.env.VITE_SHOPIFY_STORE_URL || "https://basant-kothi-online.myshopify.com";
  const ADMIN_TOKEN = process.env.VITE_SHOPIFY_ADMIN_TOKEN;

  if (!ADMIN_TOKEN) {
    return res.status(500).json({ error: "Missing Shopify Admin Token in server environment." });
  }

  if (!path) {
    return res.status(400).json({ error: "Missing 'path' query parameter." });
  }

  // Construct the full Shopify API URL
  const shopifyUrl = `${STORE_URL}/admin/api/2024-07/${path}`;

  try {
    const response = await fetch(shopifyUrl, {
      method: req.method || "GET",
      headers: {
        "X-Shopify-Access-Token": ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
    });

    // We must return the exact status from Shopify
    if (!response.ok) {
      return res.status(response.status).json({ error: `Shopify API returned ${response.status}` });
    }

    const data = await response.json();
    
    // Shopify pagination uses the "Link" header. 
    // We need to pass this header back to the React app so it knows if there's a next page.
    const linkHeader = response.headers.get("link");
    if (linkHeader) {
      res.setHeader("Link", linkHeader);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Shopify proxy error:", error);
    return res.status(500).json({ error: "Internal server error connecting to Shopify." });
  }
}
