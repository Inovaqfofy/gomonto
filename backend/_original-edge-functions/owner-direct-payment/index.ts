import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DirectPaymentRequest {
  reservation_id: string;
  owner_id: string;
  amount: number;
  customer: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
  };
  callback_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: DirectPaymentRequest = await req.json();
    
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        console.error("FedaPay error:", error);
        paymentResult = {
          success: false,
          provider: "fedapay",
          error: error instanceof Error ? error.message : "FedaPay payment failed",
        };
      }

    } else if (preferredGateway === "kkiapay" && ownerSettings.kkiapay_enabled && ownerSettings.kkiapay_public_key) {
      // Use owner's KkiaPay credentials - client-side SDK
      console.log("Using owner's KkiaPay credentials for direct payment");
      
      const transactionId = `kki_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      paymentResult = {
        success: true,
        provider: "kkiapay",
        transaction_id: transactionId,
        use_client_sdk: true,
        config: {
          amount,
          key: ownerSettings.kkiapay_public_key,
          sandbox: false, // Production mode for real payments
          data: { 
            reservation_id, 
            owner_id,
            platform: "gomonto",
          },
          callback: callback_url,
          theme: "#1fb2a6",
          name: customer.firstname + " " + customer.lastname,
          phone: customer.phone,
          email: customer.email,
        },
      };

    } else {
      // Fallback to Mobile Money direct (show available methods)
      console.log("Using Mobile Money direct payment");
      
      const enabledMethods: string[] = [];
      if (ownerSettings.mtn_momo_enabled) enabledMethods.push("mtn_momo");
      if (ownerSettings.moov_money_enabled) enabledMethods.push("moov_money");
      if (ownerSettings.orange_money_enabled) enabledMethods.push("orange_money");
      if (ownerSettings.wave_enabled) enabledMethods.push("wave");

      if (enabledMethods.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: "Aucune méthode de paiement configurée",
            message: "Le loueur doit configurer au moins une méthode de paiement"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      paymentResult = {
        success: true,
        provider: "mobile_money",
        transaction_id: `mm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        use_client_sdk: false,
        config: {
          available_methods: enabledMethods,
          owner_settings: {
            mtn_momo_merchant_id: ownerSettings.mtn_momo_merchant_id,
            moov_money_merchant_id: ownerSettings.moov_money_merchant_id,
            orange_money_merchant_id: ownerSettings.orange_money_merchant_id,
            wave_merchant_id: ownerSettings.wave_merchant_id,
          }
        }
      };
    }

    if (!paymentResult.success) {
      return new Response(
        JSON.stringify({ error: paymentResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store payment transaction with owner info
    await supabase.from("payment_transactions").insert({
      reservation_id,
      amount,
      payment_method: paymentResult.provider === "fedapay" ? "orange_money" : 
                      paymentResult.provider === "kkiapay" ? "wave" : "mtn_momo",
      status: "pending",
      provider_reference: paymentResult.transaction_id,
      provider_response: {
        provider: paymentResult.provider,
        owner_id,
        business_name: businessName,
        direct_to_owner: true,
      }
    });

    console.log("Direct payment initiated:", paymentResult);

    return new Response(
      JSON.stringify({
        ...paymentResult,
        business_name: businessName,
        receipt_info: {
          payee: businessName,
          platform: "GoMonto",
          disclaimer: "GoMonto est le prestataire technique. Inopay Group n'encaisse pas les frais de location.",
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Direct payment error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
