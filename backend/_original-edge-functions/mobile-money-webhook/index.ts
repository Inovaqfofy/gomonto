import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

// HMAC-SHA256 signature verification
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  } catch {
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature - REQUIRED when secret is configured
    const signature = req.headers.get("x-webhook-signature");
    if (webhookSecret && webhookSecret.length > 0) {
      if (!signature) {
        console.error("Missing webhook signature - rejecting request");
        return new Response(
          JSON.stringify({ error: "Signature required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature - rejecting request");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Webhook signature verified successfully");
    }
    
    const payload = JSON.parse(rawBody);
    console.log("Mobile Money webhook received:", JSON.stringify(payload, null, 2));

    // Determine provider from webhook structure
    let provider: string;
    let transactionId: string;
    let status: string;
    let amount: number;

    if (payload.entity === "transaction" && payload.v1) {
      // FedaPay webhook
      provider = "fedapay";
      transactionId = payload.v1.id.toString();
      status = payload.v1.status;
      amount = payload.v1.amount;

      console.log(`FedaPay webhook: Transaction ${transactionId} - Status: ${status}`);

      if (status === "approved") {
        // Update payment transaction
        const { error: updateError } = await supabase
          .from("payment_transactions")
          .update({ 
            status: "completed",
            provider_response: payload,
          })
          .eq("provider_reference", transactionId);

        if (updateError) {
          console.error("Error updating transaction:", updateError);
        }

        // Get reservation and update status
        const { data: transaction } = await supabase
          .from("payment_transactions")
          .select("reservation_id")
          .eq("provider_reference", transactionId)
          .single();

        if (transaction?.reservation_id) {
          await supabase
            .from("reservations")
            .update({ 
              status: "guaranteed",
              is_guaranteed: true,
              deposit_paid: true,
              payment_date: new Date().toISOString(),
            })
            .eq("id", transaction.reservation_id);
        }
      } else if (status === "declined" || status === "cancelled") {
        await supabase
          .from("payment_transactions")
          .update({ 
            status: "failed",
            provider_response: payload,
          })
          .eq("provider_reference", transactionId);
      }

    } else if (payload.transactionId || payload.transaction_id) {
      // KkiaPay webhook
      provider = "kkiapay";
      transactionId = payload.transactionId || payload.transaction_id;
      status = payload.status;
      amount = payload.amount;

      console.log(`KkiaPay webhook: Transaction ${transactionId} - Status: ${status}`);

      if (status === "SUCCESS") {
        const { error: updateError } = await supabase
          .from("payment_transactions")
          .update({ 
            status: "completed",
            provider_response: payload,
          })
          .eq("provider_reference", transactionId);

        if (updateError) {
          console.error("Error updating KkiaPay transaction:", updateError);
        }

        // Check if this is a credit purchase or reservation
        if (payload.data?.credit_pack_id) {
          await supabase
            .from("credit_purchases")
            .update({ status: "completed" })
            .eq("id", payload.data.credit_pack_id);
        } else if (payload.data?.reservation_id) {
          await supabase
            .from("reservations")
            .update({ 
              status: "guaranteed",
              is_guaranteed: true,
              deposit_paid: true,
              payment_date: new Date().toISOString(),
            })
            .eq("id", payload.data.reservation_id);
        }
      } else if (status === "FAILED") {
        await supabase
          .from("payment_transactions")
          .update({ 
            status: "failed",
            provider_response: payload,
          })
          .eq("provider_reference", transactionId);
      }

    } else {
      console.log("Unknown webhook format:", payload);
      return new Response(
        JSON.stringify({ error: "Unknown webhook format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, provider, transactionId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Webhook processing error:", error instanceof Error ? error.message : "Unknown error");
    
    // Return generic error message - don't expose internal details
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
