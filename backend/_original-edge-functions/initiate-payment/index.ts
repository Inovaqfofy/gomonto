import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  provider: "fedapay" | "kkiapay";
  amount: number;
  currency: string;
  description: string;
  customer: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
  };
  reservation_id?: string;
  credit_pack_id?: string;
  user_id: string;
  callback_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PaymentRequest = await req.json();
    
    console.log("Payment request:", payload);

    const { provider, amount, currency, description, customer, reservation_id, credit_pack_id, user_id, callback_url } = payload;

    let paymentUrl: string;
    let transactionId: string;

    if (provider === "fedapay") {
      // FedaPay Integration
      // Note: User needs to configure FEDAPAY_SECRET_KEY and FEDAPAY_PUBLIC_KEY
      const fedapaySecretKey = Deno.env.get("FEDAPAY_SECRET_KEY");
      
      if (!fedapaySecretKey) {
        return new Response(
          JSON.stringify({ 
            error: "FedaPay not configured",
            message: "Veuillez configurer les clés API FedaPay dans les paramètres."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      const kkiapayPublicKey = Deno.env.get("KKIAPAY_PUBLIC_KEY");
      const kkiapayPrivateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
      const kkiapaySecret = Deno.env.get("KKIAPAY_SECRET");

      if (!kkiapayPublicKey || !kkiapayPrivateKey) {
        return new Response(
          JSON.stringify({ 
            error: "KkiaPay not configured",
            message: "Veuillez configurer les clés API KkiaPay dans les paramètres."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            sandbox: Deno.env.get("KKIAPAY_SANDBOX") === "true",
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment initiation error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
