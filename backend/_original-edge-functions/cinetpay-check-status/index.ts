import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckStatusRequest {
  transaction_id: string;
}

// Send email notification to owner when payment is recovered
async function sendOwnerPaymentNotification(
  resend: Resend,
  ownerEmail: string,
  ownerName: string,
  renterName: string,
  vehicleName: string,
  amount: number,
  currency: string,
  reservationId: string
) {
  try {
    const emailResponse = await resend.emails.send({
      from: "GoMobie <notifications@resend.dev>",
      to: [ownerEmail],
      subject: "💰 Paiement confirmé pour votre véhicule",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .amount { font-size: 32px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Paiement Confirmé!</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${ownerName}</strong>,</p>
              <p>Excellente nouvelle ! Un paiement a été confirmé pour votre véhicule.</p>
              
              <div class="amount">${amount.toLocaleString()} ${currency}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span>Véhicule</span>
                  <strong>${vehicleName}</strong>
                </div>
                <div class="detail-row">
                  <span>Locataire</span>
                  <strong>${renterName}</strong>
                </div>
                <div class="detail-row">
                  <span>Référence</span>
                  <strong>${reservationId.slice(0, 8).toUpperCase()}</strong>
                </div>
              </div>
              
              <p>La réservation est maintenant <strong>garantie</strong>. Vous pouvez suivre les détails dans votre tableau de bord.</p>
              
              <div class="footer">
                <p>Merci de faire confiance à GoMobie!</p>
                <p style="color: #9ca3af;">Cet email a été envoyé automatiquement suite à la confirmation du paiement.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log("Owner notification email sent:", emailResponse);
    return true;
  } catch (error) {
    console.error("Failed to send owner notification email:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!apiKey || !siteId) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { transaction_id }: CheckStatusRequest = await req.json();

    if (!transaction_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Transaction ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking CinetPay transaction status:", transaction_id);

    // Call CinetPay check status API
    const checkResponse = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transaction_id,
      }),
    });

    const checkResult = await checkResponse.json();
    console.log("CinetPay check result:", checkResult);

    // Get local transaction data using provider_reference (not transaction_id column)
    const { data: localTransaction } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("provider_reference", transaction_id)
      .single();

    let dbStatus = "pending";
    let cinetpayStatus = "UNKNOWN";
    let emailSent = false;
    
    // Handle both success responses and pending (662) responses
    if (checkResult.code === "00") {
      const paymentStatus = checkResult.data.status;
      cinetpayStatus = paymentStatus;
      
      if (paymentStatus === "ACCEPTED") {
        dbStatus = "completed";
      } else if (paymentStatus === "REFUSED" || paymentStatus === "CANCELLED") {
        dbStatus = "failed";
      }
    } else if (checkResult.code === "662") {
      // WAITING_CUSTOMER_PAYMENT - still pending
      dbStatus = "pending";
      cinetpayStatus = "PENDING";
      console.log("Payment still waiting for customer action");
    }

    // Update local status if we have a transaction and status changed
    if (localTransaction && localTransaction.status !== dbStatus) {
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          status: dbStatus,
          provider_response: checkResult,
        })
        .eq("id", localTransaction.id);

      if (updateError) {
        console.error("Failed to update transaction:", updateError);
      }

      // Process completed payment if status changed to completed
      if (dbStatus === "completed" && localTransaction.status !== "completed") {
        if (localTransaction.reservation_id) {
          // Update reservation
          await supabase
            .from("reservations")
            .update({
              status: "guaranteed",
              deposit_paid: true,
              payment_reference: transaction_id,
            })
            .eq("id", localTransaction.reservation_id);

          console.log("Reservation updated to guaranteed:", localTransaction.reservation_id);

          // Send email notification to owner
          if (resend) {
            // Get reservation details with owner and renter info
            const { data: reservation } = await supabase
              .from("reservations")
              .select(`
                id,
                total_price,
                vehicle_id,
                owner_id,
                renter_id
              `)
              .eq("id", localTransaction.reservation_id)
              .single();

            if (reservation) {
              // Get owner profile
              const { data: ownerProfile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("user_id", reservation.owner_id)
                .single();

              // Get renter profile
              const { data: renterProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", reservation.renter_id)
                .single();

              // Get vehicle info
              const { data: vehicle } = await supabase
                .from("vehicles")
                .select("brand, model")
                .eq("id", reservation.vehicle_id)
                .single();

              if (ownerProfile?.email) {
                emailSent = await sendOwnerPaymentNotification(
                  resend,
                  ownerProfile.email,
                  ownerProfile.full_name || "Propriétaire",
                  renterProfile?.full_name || "Locataire",
                  vehicle ? `${vehicle.brand} ${vehicle.model}` : "Véhicule",
                  checkResult.data?.amount || reservation.total_price,
                  checkResult.data?.currency || "XOF",
                  localTransaction.reservation_id
                );
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction_id,
        status: dbStatus,
        cinetpay_status: cinetpayStatus,
        amount: checkResult.data?.amount || null,
        currency: checkResult.data?.currency || null,
        payment_method: checkResult.data?.payment_method || null,
        local_data: localTransaction,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("CinetPay check status error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
