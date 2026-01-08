import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditPurchaseRequest {
  user_id: string;
  pack_id: string;
  payment_method: string;
  payment_reference?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, pack_id, payment_method, payment_reference }: CreditPurchaseRequest = await req.json();
    console.log("Processing credit purchase:", { user_id, pack_id, payment_method });

    // Get pack details
    const { data: pack, error: packError } = await supabase
      .from("credit_packs")
      .select("*")
      .eq("id", pack_id)
      .eq("is_active", true)
      .single();

    if (packError || !pack) {
      return new Response(
        JSON.stringify({ success: false, message: "Pack not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalCredits = pack.credits + (pack.bonus_credits || 0);

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from("credit_purchases")
      .insert({
        user_id,
        pack_id,
        credits_purchased: totalCredits,
        amount_paid: pack.price,
        payment_method,
        payment_reference,
        status: "pending",
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Failed to create purchase:", purchaseError);
      throw purchaseError;
    }

    // In production, initiate payment with the provider here
    // For now, simulate immediate success
    console.log("Payment initiated, awaiting webhook confirmation...");

    // Simulate webhook callback for demo (remove in production)
    // The trigger will handle wallet update when status changes to 'completed'
    const { error: updateError } = await supabase
      .from("credit_purchases")
      .update({ status: "completed" })
      .eq("id", purchase.id);

    if (updateError) {
      console.error("Failed to update purchase status:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Credit purchase processed successfully",
        purchase_id: purchase.id,
        credits_added: totalCredits,
        amount_paid: pack.price,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Credit purchase error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
