/**
 * Cloudflare Worker for Startup Operating System
 *
 * This worker intercepts incoming requests, extracts a `client_id`,
 * queries the KV cache (and Master Supabase DB if necessary) for the
 * isolated deployment's Supabase URL and Anon Key, and proxies the request.
 */

export interface Env {
  // Cloudflare KV Namespace binding
  ROUTING_KV: KVNamespace;
  
  // Environment variables for Master DB
  MASTER_SUPABASE_URL: string;
  MASTER_SUPABASE_SERVICE_ROLE_KEY: string;
}

interface DeploymentKeys {
  url: string;
  anon_key: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Identify the Client ID. 
    // We expect it via a custom header. 
    const clientId = request.headers.get("x-client-id");
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Missing x-client-id header" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // 2. Check Cloudflare KV Cache First
      let cachedKeys = await env.ROUTING_KV.get<DeploymentKeys>(clientId, "json");

      if (!cachedKeys) {
        // 3. Cache Miss: Fetch from Master Supabase DB via RPC
        const dbResponse = await fetch(`${env.MASTER_SUPABASE_URL}/rest/v1/rpc/get_deployment_keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // MUST use the service role key to execute the secure RPC
            'apikey': env.MASTER_SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.MASTER_SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ p_client_id: clientId })
        });

        if (!dbResponse.ok) {
          console.error("Failed to fetch keys from master DB:", await dbResponse.text());
          return new Response(JSON.stringify({ error: "Failed to resolve deployment keys" }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const data: any = await dbResponse.json();
        
        if (!data || !data.url || !data.anon_key) {
          return new Response(JSON.stringify({ error: "Deployment not found for this client" }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        cachedKeys = {
          url: data.url,
          anon_key: data.anon_key
        };

        // 4. Cache the decrypted keys in KV for 1 hour (3600 seconds)
        ctx.waitUntil(env.ROUTING_KV.put(clientId, JSON.stringify(cachedKeys), { expirationTtl: 3600 }));
      }

      // 5. Proxy the request to the isolated Supabase instance
      const requestUrl = new URL(request.url);
      const isolatedUrl = new URL(cachedKeys.url);
      
      // Rewrite the hostname to point to the isolated instance
      requestUrl.hostname = isolatedUrl.hostname;
      // Inherit the protocol (https)
      requestUrl.protocol = isolatedUrl.protocol;

      // Construct the new request headers
      const newHeaders = new Headers(request.headers);
      
      // Inject the isolated credentials
      newHeaders.set("apikey", cachedKeys.anon_key);
      newHeaders.set("Authorization", `Bearer ${cachedKeys.anon_key}`);
      
      // Prevent the downstream instance from seeing the routing header if desired
      newHeaders.delete("x-client-id");

      const proxyRequest = new Request(requestUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: 'manual'
      });

      // Fetch from the isolated instance and return to client
      return await fetch(proxyRequest);

    } catch (err: any) {
      console.error("Worker routing error:", err.message);
      return new Response(JSON.stringify({ error: "Internal Server Error during routing" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
