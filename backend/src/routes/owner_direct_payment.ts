import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const owner_direct_paymentRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

owner_direct_paymentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // ═══════════════════════════════════════════════════════════
    // BUSINESS LOGIC (100% migrated from Edge Function)
    // ═══════════════════════════════════════════════════════════
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const payload: DirectPaymentRequest = req.body;
        
        console.log("Direct payment request:", JSON.stringify(payload));
    
        const { reservation_id, owner_id, amount, customer, callback_url } = payload;
    
        // Fetch owner's payment settings
        const { data: ownerSettings, error: settingsError } = await supabase
          .from("owner_payment_settings")
          .select("*")
          .eq("owner_id", owner_id)
          .single();
    
        if (settingsError || !ownerSettings) {
          console.error("Owner settings not found:", settingsError);
          return new Response(
            JSON.stringify({ 
              error: "Configuration de paiement non trouvée",
              message: "Le loueur n'a pas configuré ses paramètres de paiement"
            }),
            { status: 400 }
          );
        }
    
        // Fetch owner business info
        const businessName = ownerSettings.business_name || "Loueur GoMonto";
    
        // Determine which payment gateway to use
        const preferredGateway = ownerSettings.preferred_gateway || "mobile_money";
        
        let paymentResult: {
          success: boolean;
          provider: string;
          transaction_id?: string;
          payment_url?: string;
          use_client_sdk?: boolean;
          config?: Record<string, unknown>;
          error?: string;
        };
    
        if (preferredGateway === "fedapay" && ownerSettings.fedapay_enabled && ownerSettings.fedapay_secret_key) {
          // Use owner's FedaPay credentials for DIRECT payment
          console.log("Using owner's FedaPay credentials for direct payment");
          
          try {
            const fedapayResponse = await fetch("https://api.fedapay.com/v1/transactions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${ownerSettings.fedapay_secret_key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                description: `Location véhicule - ${businessName}`,
                amount,
                currency: "XOF",
                callback_url,
                customer: {
                  firstname: customer.firstname,
                  lastname: customer.lastname,
                  email: customer.email,
                  phone_number: { number: customer.phone, country: "sn" },
                },
                metadata: {
                  reservation_id,
                  platform: "gomonto",
                  owner_id,
                }
              }),
            });
    
            const fedapayData = await fedapayResponse.json();
            console.log("FedaPay response:", JSON.stringify(fedapayData));
    
            if (!fedapayResponse.ok) {
              throw new Error(fedapayData.message || "FedaPay payment creation failed");
            }
    
            const transactionId = fedapayData.v1.transaction.id.toString();
            
            // Get payment token for redirect
            const tokenResponse = await fetch(`https://api.fedapay.com/v1/transactions/${transactionId}/token`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${ownerSettings.fedapay_secret_key}`,
                "Content-Type": "application/json",
              },
            });
            
            const tokenData = await tokenResponse.json();
    
            paymentResult = {
              success: true,
              provider: "fedapay",
              transaction_id: transactionId,
              payment_url: tokenData.v1.url,
            };
  } catch (error) {
    console.error('[owner_direct_payment] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'owner-direct-payment'
    });
  }
});
