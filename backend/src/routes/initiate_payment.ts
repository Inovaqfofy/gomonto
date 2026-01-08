import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const initiate_paymentRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

initiate_paymentRouter.post('/', async (req: Request, res: Response) => {
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
        const payload: PaymentRequest = req.body;
        
        console.log("Payment request:", payload);
    
        const { provider, amount, currency, description, customer, reservation_id, credit_pack_id, user_id, callback_url } = payload;
    
        let paymentUrl: string;
        let transactionId: string;
    
        if (provider === "fedapay") {
          // FedaPay Integration
          // Note: User needs to configure FEDAPAY_SECRET_KEY and FEDAPAY_PUBLIC_KEY
          const fedapaySecretKey = process.env.FEDAPAY_SECRET_KEY;
          
          if (!fedapaySecretKey) {
            return new Response(
              JSON.stringify({ 
                error: "FedaPay not configured",
                message: "Veuillez configurer les clés API FedaPay dans les paramètres."
              }),
              { status: 400 }
            );
          }
    
          const fedapayResponse = await fetch("https://api.fedapay.com/v1/transactions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${fedapaySecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              description,
              amount,
              currency: currency || "XOF",
              callback_url,
              customer: {
                firstname: customer.firstname,
                lastname: customer.lastname,
                email: customer.email,
                phone_number: { number: customer.phone, country: "ci" },
              },
            }),
          });
    
          const fedapayData = await fedapayResponse.json();
          console.log("FedaPay response:", fedapayData);
    
          if (!fedapayResponse.ok) {
            throw new Error(fedapayData.message || "FedaPay payment creation failed");
          }
    
          transactionId = fedapayData.v1.transaction.id.toString();
          
          // Get payment token
          const tokenResponse = await fetch(`https://api.fedapay.com/v1/transactions/${transactionId}/token`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${fedapaySecretKey}`,
              "Content-Type": "application/json",
            },
          });
          
          const tokenData = await tokenResponse.json();
          paymentUrl = tokenData.v1.url;
    
        } else if (provider === "kkiapay") {
          // KkiaPay Integration
          const kkiapayPublicKey = process.env.KKIAPAY_PUBLIC_KEY;
          const kkiapayPrivateKey = process.env.KKIAPAY_PRIVATE_KEY;
          const kkiapaySecret = process.env.KKIAPAY_SECRET;
    
          if (!kkiapayPublicKey || !kkiapayPrivateKey) {
            return new Response(
              JSON.stringify({ 
                error: "KkiaPay not configured",
                message: "Veuillez configurer les clés API KkiaPay dans les paramètres."
              }),
              { status: 400 }
            );
          }
    
          // KkiaPay uses client-side SDK primarily, so we return the config for frontend
          transactionId = `kki_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          paymentUrl = "kkiapay_client_sdk"; // Indicates to use client-side SDK
    
          // Store pending transaction
          await supabase.from("payment_transactions").insert({
            id: transactionId,
            reservation_id: reservation_id || null,
            amount,
            payment_method: "wave", // KkiaPay supports multiple methods
            status: "pending",
            provider_reference: transactionId,
          });
    
          return new Response(
            JSON.stringify({
              success: true,
              provider: "kkiapay",
              transaction_id: transactionId,
              use_client_sdk: true,
              config: {
                amount,
                key: kkiapayPublicKey,
                sandbox: process.env.KKIAPAY_SANDBOX === "true",
                data: { 
                  reservation_id, 
                  credit_pack_id, 
                  user_id,
                  description 
                },
                callback: callback_url,
                theme: "#1fb2a6",
                name: customer.firstname + " " + customer.lastname,
                phone: customer.phone,
                email: customer.email,
              },
            }),
            { status: 200 }
          );
    
        } else {
          throw new Error("Invalid payment provider");
        }
    
        // Store transaction in database
        if (reservation_id) {
          await supabase.from("payment_transactions").insert({
            reservation_id,
            amount,
            payment_method: provider === "fedapay" ? "orange_money" : "wave",
            status: "pending",
            provider_reference: transactionId,
          });
        }
    
        console.log("Payment initiated:", { transactionId, paymentUrl });
    
        return new Response(
          JSON.stringify({
            success: true,
            provider,
            transaction_id: transactionId,
            payment_url: paymentUrl,
          }),
          { status: 200 }
        );
  } catch (error) {
    console.error('[initiate_payment] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'initiate-payment'
    });
  }
});
