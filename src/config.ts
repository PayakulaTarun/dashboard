// We are now using a Serverless Function (Vercel/Node backend) for API calls.
// The frontend DOES NOT need the admin token anymore! It is safely stored on the server.
export const shopifyConfig = {
  // This points to our new api/shopify.js serverless function
  apiBase: "/api/shopify", 
};
