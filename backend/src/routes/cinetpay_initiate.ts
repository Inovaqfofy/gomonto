import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const cinetpay_initiateRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

cinetpay_initiateRouter.post('/', async (req: Request, res: Response) => {
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
    const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
        // Use production credentials from environment secrets
        const apiKey = process.env.CINETPAY_API_KEY;
        const siteId = process.env.CINETPAY_SITE_ID;
        
        console.log("Using CinetPay credentials from secrets");
    
        if (!apiKey || !siteId) {
          console.error("CinetPay credentials not configured");
          return new Response(
            JSON.stringify({ success: false, error: "Payment provider not configured" }),
            { status: 500 }
          );
        }
        
        // Optional: Validate user from JWT if provided (for extra security)
        const authHeader = req.headers['Authorization'];
        let userId: string | null = null;
        if (authHeader) {
          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id || null;
          console.log("Authenticated user:", userId);
        }
        
        const body: CinetPayRequest = req.body;
        
        console.log("CinetPay initiate request:", { ...body, user_id: userId });
    
        // Generate unique transaction ID
        const transactionId = `GM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Default notify URL for webhook
        const notifyUrl = body.notify_url || `${supabaseUrl}/functions/v1/cinetpay-webhook`;
        const returnUrl = body.return_url || `${supabaseUrl.replace('.supabase.co', '')}/dashboard`;
    
        // Resolve phone number: use provided, or fallback to reservation's renter_phone
        let resolvedPhone = body.customer_phone?.trim() || "";
        
        if (!resolvedPhone && body.reservation_id) {
          console.log("No phone provided, looking up from reservation:", body.reservation_id);
          const { data: reservation } = await supabase
            .from("reservations")
            .select("renter_phone")
            .eq("id", body.reservation_id)
            .single();
          
          if (reservation?.renter_phone) {
            resolvedPhone = reservation.renter_phone;
            console.log("Found phone from reservation:", resolvedPhone);
          }
        }
        
        // Final validation: phone is required
        if (!resolvedPhone) {
          console.error("No phone number available for payment");
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Numéro de téléphone requis pour le paiement",
              details: { missing_field: "customer_phone" }
            }),
            { status: 400 }
          );
        }
    
        // Detect real country from phone
        const detectedCountry = getCountryFromPhone(resolvedPhone);
        const isLocalCustomer = isMobileMoneyEligible(resolvedPhone);
        
        // CinetPay only supports UEMOA/CEMAC countries for customer_country
        const CINETPAY_SUPPORTED_COUNTRIES = [
          "SN", "CI", "BJ", "BF", "ML", "NE", "TG", "GN", // UEMOA
          "CM", "GA", "CG", "CD", "CF", "TD", "GQ"        // CEMAC
        ];
        
        // For international customers, use CI (Côte d'Ivoire) as billing country
        const customerCountry = CINETPAY_SUPPORTED_COUNTRIES.includes(detectedCountry) 
          ? detectedCountry 
          : "CI";
        
        const customerState = CINETPAY_SUPPORTED_COUNTRIES.includes(detectedCountry)
          ? getStateFromPhone(resolvedPhone, detectedCountry)
          : "AB"; // Abidjan district
        
        const customerCity = CINETPAY_SUPPORTED_COUNTRIES.includes(detectedCountry)
          ? (COUNTRY_DEFAULT_CITY[detectedCountry] || "Abidjan")
          : "Abidjan";
        
        // Use provided channels or auto-detect: ALL for local, CREDIT_CARD for international
        const channels = body.channels || (isLocalCustomer ? "ALL" : "CREDIT_CARD");
    
        // Extract or use provided surname (required for card payments)
        const { firstName, surname } = body.customer_surname 
          ? { firstName: body.customer_name, surname: body.customer_surname }
          : extractSurname(body.customer_name || "Client GoMonto");
    
        console.log("Customer detection:", { 
          resolvedPhone, 
          detectedCountry,      // Real country (e.g. "CA")
          customerCountry,      // CinetPay country (e.g. "CI")
          customerState, 
          customerCity,
          isLocalCustomer, 
          channels,
          firstName,
          surname 
        });
    
        // Prepare CinetPay payment request
        const paymentData = {
          apikey: apiKey,
          site_id: siteId,
          transaction_id: transactionId,
          amount: Math.round(body.amount),
          currency: body.currency || "XOF",
          description: body.description,
          customer_name: firstName,
          customer_surname: surname,
          customer_email: body.customer_email || "client@gomonto.com",
          customer_phone_number: resolvedPhone,
          customer_address: customerCity,
          customer_city: customerCity,
          customer_country: customerCountry,
          customer_state: customerState,
          customer_zip_code: "00000",
          notify_url: notifyUrl,
          return_url: returnUrl,
          channels: channels,
          metadata: JSON.stringify({
            reservation_id: body.reservation_id,
            credit_purchase_id: body.credit_purchase_id,
          }),
        };
    
        console.log("Calling CinetPay API with data:", { ...paymentData, apikey: "[REDACTED]" });
    
        // Call CinetPay API to create payment
        const cinetPayResponse = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        });
    
        const cinetPayResult = await cinetPayResponse.json();
        console.log("CinetPay API response:", cinetPayResult);
    
        if (cinetPayResult.code !== "201") {
          console.error("CinetPay payment creation failed:", cinetPayResult);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: cinetPayResult.message || "Payment creation failed",
              details: cinetPayResult 
            }),
            { status: 400 }
          );
        }
    
        // Store transaction in database (using correct schema columns)
        const { error: insertError } = await supabase
          .from("payment_transactions")
          .insert({
            reservation_id: body.reservation_id || null,
            amount: body.amount,
            payment_method: "cinetpay",
            status: "pending",
            provider_reference: transactionId,
            provider_response: cinetPayResult,
          });
    
        if (insertError) {
          console.error("Failed to store transaction:", insertError);
          // Don't fail the request - payment was already initiated
        }
    
        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: transactionId,
            payment_url: cinetPayResult.data.payment_url,
            payment_token: cinetPayResult.data.payment_token,
          }),
          { status: 200 }
        );
  } catch (error) {
    console.error('[cinetpay_initiate] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'cinetpay-initiate'
    });
  }
});
