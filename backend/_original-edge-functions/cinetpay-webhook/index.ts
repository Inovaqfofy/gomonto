import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CinetPayNotification {
  cpm_site_id: string;
  cpm_trans_id: string;
  cpm_trans_date: string;
  cpm_amount: string;
  cpm_currency: string;
  cpm_payment_date: string;
  cpm_payment_time: string;
  cpm_error_message: string;
  cpm_payid: string;
  cpm_phone_prefixe: string;
  cpm_cel_phone: string;
  cpm_result: string;
  signature: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook data - CinetPay sends form data or JSON
    let notificationData: CinetPayNotification;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      notificationData = Object.fromEntries(formData.entries()) as unknown as CinetPayNotification;
    } else {
      notificationData = await req.json();
    }

    console.log("CinetPay webhook received:", notificationData);

    const transactionId = notificationData.cpm_trans_id;

    if (!transactionId) {
      console.error("No transaction ID in webhook");
      return new Response(
        JSON.stringify({ success: false, error: "Missing transaction ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment status with CinetPay API
    const verifyResponse = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
      }),
    });

    const verifyResult = await verifyResponse.json();
    console.log("CinetPay verification result:", verifyResult);

    if (verifyResult.code !== "00") {
      console.error("Payment verification failed:", verifyResult);
      return new Response(
        JSON.stringify({ success: false, error: "Payment verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentStatus = verifyResult.data.status;
    let dbStatus = "pending";
    
    if (paymentStatus === "ACCEPTED") {
      dbStatus = "completed";
    } else if (paymentStatus === "REFUSED" || paymentStatus === "CANCELLED") {
      dbStatus = "failed";
    }

    // Check if this is a deposit transaction (starts with DEP-)
    if (transactionId.startsWith("DEP-")) {
      console.log("Processing deposit transaction:", transactionId);
      
      // Find the deposit transaction
      const { data: depositTx, error: depositError } = await supabase
        .from("deposit_transactions")
        .select("*, reservations(id, owner_id, renter_id, vehicle_id)")
        .eq("cinetpay_transaction_id", transactionId)
        .single();

      if (depositError || !depositTx) {
        console.error("Deposit transaction not found:", transactionId);
        return new Response(
          JSON.stringify({ success: false, error: "Deposit transaction not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (dbStatus === "completed") {
        // Update deposit transaction to held
        const { error: updateError } = await supabase
          .from("deposit_transactions")
          .update({
            status: "held",
            payment_status: "completed",
          })
          .eq("id", depositTx.id);

        if (updateError) {
          console.error("Failed to update deposit transaction:", updateError);
        }

        // Update reservation
        await supabase
          .from("reservations")
          .update({
            deposit_paid: true,
            deposit_mode: "gomonto",
          })
          .eq("id", depositTx.reservation_id);

        // Notify owner that deposit is secured
        const reservation = depositTx.reservations as any;
        if (reservation) {
          await supabase.from("notifications").insert({
            user_id: reservation.owner_id,
            type: "deposit_secured",
            title: "Caution sécurisée",
            message: `Une caution de ${depositTx.amount} FCFA a été sécurisée via GoMonto pour votre véhicule.`,
            data: {
              reservation_id: depositTx.reservation_id,
              amount: depositTx.amount,
            },
          });

          // Notify renter
          await supabase.from("notifications").insert({
            user_id: reservation.renter_id,
            type: "deposit_paid",
            title: "Caution payée",
            message: `Votre caution de ${depositTx.amount} FCFA a été sécurisée. Elle vous sera restituée à la fin de la location si aucun dommage n'est constaté.`,
            data: {
              reservation_id: depositTx.reservation_id,
              amount: depositTx.amount,
            },
          });
        }

        console.log("Deposit secured successfully:", depositTx.id);
      } else if (dbStatus === "failed") {
        // Update deposit transaction as failed
        await supabase
          .from("deposit_transactions")
          .update({
            status: "failed",
            payment_status: "failed",
          })
          .eq("id", depositTx.id);

        console.log("Deposit payment failed:", depositTx.id);
      }

      return new Response(
        JSON.stringify({ success: true, status: dbStatus, type: "deposit" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Regular payment transaction handling - use provider_reference to find the transaction
    const { data: existingTransaction, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("provider_reference", transactionId)
      .single();

    if (fetchError || !existingTransaction) {
      console.error("Transaction not found:", transactionId);
      return new Response(
        JSON.stringify({ success: false, error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: dbStatus,
        provider_response: verifyResult,
      })
      .eq("id", existingTransaction.id);

    if (updateError) {
      console.error("Failed to update transaction:", updateError);
    }

    // Process successful payment
    if (dbStatus === "completed") {
      // Handle reservation payment
      if (existingTransaction.reservation_id) {
        const { error: resError } = await supabase
          .from("reservations")
          .update({
            status: "guaranteed",
            deposit_paid: true,
            payment_reference: transactionId,
          })
          .eq("id", existingTransaction.reservation_id);

        if (resError) {
          console.error("Failed to update reservation:", resError);
        } else {
          console.log("Reservation updated to guaranteed:", existingTransaction.reservation_id);

          // Get reservation details for notification
          const { data: reservation } = await supabase
            .from("reservations")
            .select("owner_id, vehicle_id, renter_id, start_date, end_date")
            .eq("id", existingTransaction.reservation_id)
            .single();

          if (reservation) {
            // Create notification for owner
            await supabase.from("notifications").insert({
              user_id: reservation.owner_id,
              type: "payment_received",
              title: "Paiement reçu",
              message: `Un paiement de ${existingTransaction.amount} XOF a été reçu pour une réservation.`,
              data: {
                reservation_id: existingTransaction.reservation_id,
                amount: existingTransaction.amount,
                transaction_id: transactionId,
              },
            });

            // Block dates in vehicle availability
            await supabase.from("vehicle_availability").insert({
              vehicle_id: reservation.vehicle_id,
              start_date: reservation.start_date,
              end_date: reservation.end_date,
              is_blocked: true,
              reason: "reservation",
              reservation_id: existingTransaction.reservation_id,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: dbStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("CinetPay webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
