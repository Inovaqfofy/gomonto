import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

interface PaymentWebhookPayload {
  event: string;
  provider: string;
  transaction_id: string;
  reservation_id?: string;
  credit_purchase_id?: string;
  amount: number;
  currency?: string;
  status: "success" | "failed" | "pending";
  customer?: {
    email?: string;
    phone?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

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

    const payload: PaymentWebhookPayload = JSON.parse(rawBody);
    console.log("Payment webhook received:", JSON.stringify(payload, null, 2));

    const { provider, transaction_id, reservation_id, credit_purchase_id, amount, status, customer } = payload;

    // Handle non-success statuses
    if (status !== "success") {
      console.log(`Payment status: ${status}`);
      
      if (status === "failed") {
        await supabase
          .from("payment_transactions")
          .update({ status: "failed", provider_response: payload })
          .eq("provider_reference", transaction_id);
      }
      
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment transaction to completed
    await supabase
      .from("payment_transactions")
      .update({ status: "completed", provider_response: payload })
      .eq("provider_reference", transaction_id);

    let notificationSent = false;

    // Process reservation payment
    if (reservation_id) {
      console.log(`Processing reservation payment: ${reservation_id}`);
      
      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .update({ 
          status: "guaranteed",
          is_guaranteed: true,
          deposit_paid: true,
          payment_date: new Date().toISOString(),
          payment_reference: transaction_id,
        })
        .eq("id", reservation_id)
        .select(`
          *,
          vehicle:vehicles(brand, model, owner_id),
          renter:profiles!reservations_renter_id_fkey(full_name, email, phone),
          owner:profiles!reservations_owner_id_fkey(full_name, email, phone)
        `)
        .single();

      if (resError) {
        console.error("Error updating reservation:", resError);
      } else if (reservation) {
        // Block dates in vehicle availability
        const startDate = new Date(reservation.start_date);
        const endDate = new Date(reservation.end_date);
        const blockedDates: { vehicle_id: string; blocked_date: string; reason: string }[] = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          blockedDates.push({
            vehicle_id: reservation.vehicle_id,
            blocked_date: d.toISOString().split("T")[0],
            reason: `Réservation garantie #${reservation_id.slice(0, 8)}`,
          });
        }
        await supabase.from("vehicle_availability").upsert(blockedDates, { onConflict: "vehicle_id,blocked_date" });

        // Send confirmation email to renter
        const renterEmail = reservation.renter?.email || customer?.email;
        if (resendApiKey && renterEmail) {
          try {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
              from: "GoMonto <noreply@gomonto.com>",
              to: [renterEmail],
              subject: "✅ Réservation confirmée - GoMonto",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
                  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <img src="https://gomonto.com/logo.png" alt="GoMonto" style="height: 40px; margin-bottom: 24px;">
                    <h1 style="color: #1fb2a6; margin: 0 0 16px;">Réservation Confirmée!</h1>
                    <p style="color: #374151;">Bonjour ${reservation.renter?.full_name || customer?.name || ""},</p>
                    <p style="color: #374151;">Votre paiement de <strong>${amount.toLocaleString()} FCFA</strong> a été reçu avec succès.</p>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                      <h3 style="margin: 0 0 12px; color: #111827;">Détails</h3>
                      <p style="margin: 4px 0; color: #4b5563;"><strong>Véhicule:</strong> ${reservation.vehicle?.brand} ${reservation.vehicle?.model}</p>
                      <p style="margin: 4px 0; color: #4b5563;"><strong>Du:</strong> ${new Date(reservation.start_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p style="margin: 4px 0; color: #4b5563;"><strong>Au:</strong> ${new Date(reservation.end_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p style="margin: 4px 0; color: #4b5563;"><strong>Référence:</strong> ${reservation_id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    
                    <p style="color: #374151;">Le loueur vous contactera bientôt pour les détails de remise du véhicule.</p>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">GoMonto - La location simplifiée<br>Ce message est automatique.</p>
                  </div>
                </div>
              `,
            });
            notificationSent = true;
            console.log("Confirmation email sent to renter");
          } catch (emailErr) {
            console.error("Email sending error:", emailErr);
          }
        }

        // Create notification for owner
        if (reservation.vehicle?.owner_id) {
          await supabase.from("notifications").insert({
            user_id: reservation.vehicle.owner_id,
            type: "payment_received",
            title: "💰 Paiement reçu!",
            message: `Acompte de ${amount.toLocaleString()} FCFA pour ${reservation.vehicle.brand} ${reservation.vehicle.model}`,
            data: { reservation_id, amount, provider },
          });
        }
      }
    }

    // Process credit purchase
    if (credit_purchase_id) {
      console.log(`Processing credit purchase: ${credit_purchase_id}`);
      
      const { data: purchase, error: purchaseErr } = await supabase
        .from("credit_purchases")
        .update({ status: "completed" })
        .eq("id", credit_purchase_id)
        .select("*, pack:credit_packs(name)")
        .single();

      if (purchaseErr) {
        console.error("Error updating credit purchase:", purchaseErr);
      } else if (purchase) {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", purchase.user_id)
          .single();

        const userEmail = profile?.email || customer?.email;
        if (resendApiKey && userEmail) {
          try {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
              from: "GoMonto <facturation@gomonto.com>",
              to: [userEmail],
              subject: "🧾 Facture - Achat de crédits GoMonto",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
                  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <img src="https://gomonto.com/logo.png" alt="GoMonto" style="height: 40px; margin-bottom: 24px;">
                    <h1 style="color: #1fb2a6; margin: 0 0 16px;">Facture</h1>
                    <p style="color: #374151;">Bonjour ${profile?.full_name || customer?.name || ""},</p>
                    <p style="color: #374151;">Merci pour votre achat de crédits.</p>
                    
                    <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 0; color: #6b7280;">Pack</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: 600;">${purchase.pack?.name || "Crédits"}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 0; color: #6b7280;">Crédits</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: 600;">${purchase.credits_purchased}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 0; color: #6b7280;">Montant</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: 600;">${amount.toLocaleString()} FCFA</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; color: #6b7280;">Date</td>
                        <td style="padding: 12px 0; text-align: right;">${new Date().toLocaleDateString('fr-FR')}</td>
                      </tr>
                    </table>
                    
                    <p style="color: #374151;">Vos crédits sont disponibles immédiatement.</p>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">Inopay Group SARL - Dakar, Sénégal<br>Ce document fait office de facture.</p>
                  </div>
                </div>
              `,
            });
            notificationSent = true;
            console.log("Invoice email sent");
          } catch (emailErr) {
            console.error("Invoice email error:", emailErr);
          }
        }
      }
    }

    console.log("Webhook processed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction_id,
        notification_sent: notificationSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown error");
    
    // Return generic error message - don't expose internal details
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
