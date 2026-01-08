import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CinetPayRequest {
  amount: number;
  currency?: string;
  description: string;
  customer_name: string;
  customer_surname?: string;
  customer_email: string;
  customer_phone: string;
  reservation_id?: string;
  credit_purchase_id?: string;
  return_url?: string;
  notify_url?: string;
  channels?: string;
}

// Phone prefixes for Mobile Money eligible countries (UEMOA/CEMAC region)
const MOBILE_MONEY_PREFIXES = [
  "+221", "+225", "+229", "+226", "+223", "+227", "+228", "+224", "+237", "+241", "+242", "+243"
];

// Canadian area codes (to distinguish from US +1)
const CANADA_AREA_CODES = [
  "204", "226", "236", "249", "250", "289", "306", "343", "365", "387",
  "403", "416", "418", "431", "437", "438", "450", "506", "514", "519",
  "548", "579", "581", "587", "604", "613", "639", "647", "672", "705",
  "709", "778", "780", "782", "807", "819", "825", "867", "873", "902", "905"
];

// Map phone prefixes to country codes (sorted by prefix length for matching)
const PHONE_TO_COUNTRY: Record<string, string> = {
  // Europe
  "+33": "FR", "+32": "BE", "+41": "CH", "+44": "GB", "+49": "DE",
  "+34": "ES", "+39": "IT", "+351": "PT", "+31": "NL", "+43": "AT",
  "+352": "LU", "+353": "IE", "+45": "DK", "+46": "SE", "+47": "NO",
  "+48": "PL", "+420": "CZ", "+36": "HU", "+40": "RO", "+30": "GR",
  // Africa UEMOA/CEMAC
  "+221": "SN", "+225": "CI", "+229": "BJ", "+226": "BF", "+223": "ML",
  "+227": "NE", "+228": "TG", "+224": "GN", "+237": "CM", "+241": "GA",
  "+242": "CG", "+243": "CD",
  // North Africa
  "+212": "MA", "+216": "TN", "+213": "DZ", "+20": "EG",
  // Other
  "+7": "RU", "+81": "JP", "+86": "CN", "+91": "IN", "+55": "BR",
  "+52": "MX", "+61": "AU", "+64": "NZ", "+27": "ZA",
};

// Default state/region by country (for CinetPay card payments)
const COUNTRY_DEFAULT_STATE: Record<string, string> = {
  // North America
  "CA": "QC", "US": "NY", "MX": "CMX",
  // Europe
  "FR": "IDF", "BE": "BRU", "CH": "GE", "GB": "ENG", "DE": "BE",
  "ES": "MD", "IT": "RM", "PT": "LI", "NL": "NH", "AT": "VIE",
  "LU": "LU", "IE": "D", "DK": "84", "SE": "AB", "NO": "03",
  "PL": "MZ", "CZ": "PR", "HU": "BU", "RO": "B", "GR": "A1",
  // Africa UEMOA/CEMAC
  "SN": "DK", "CI": "AB", "BJ": "LI", "BF": "KAD", "ML": "BKO",
  "NE": "NIA", "TG": "MA", "GN": "CO", "CM": "CE", "GA": "ES",
  "CG": "BZV", "CD": "KN",
  // North Africa
  "MA": "CAS", "TN": "TUN", "DZ": "ALG", "EG": "CAI",
  // Other
  "RU": "MOW", "JP": "TK", "CN": "BJ", "IN": "DL", "BR": "SP",
  "AU": "NSW", "NZ": "AUK", "ZA": "GT",
};

// Default city by country (for CinetPay card payments - required field)
const COUNTRY_DEFAULT_CITY: Record<string, string> = {
  // North America
  "CA": "Montreal", "US": "New York", "MX": "Mexico City",
  // Europe
  "FR": "Paris", "BE": "Bruxelles", "CH": "Geneve", "GB": "London", "DE": "Berlin",
  "ES": "Madrid", "IT": "Roma", "PT": "Lisboa", "NL": "Amsterdam", "AT": "Vienna",
  "LU": "Luxembourg", "IE": "Dublin", "DK": "Copenhagen", "SE": "Stockholm", "NO": "Oslo",
  "PL": "Warsaw", "CZ": "Prague", "HU": "Budapest", "RO": "Bucharest", "GR": "Athens",
  // Africa UEMOA/CEMAC
  "SN": "Dakar", "CI": "Abidjan", "BJ": "Cotonou", "BF": "Ouagadougou", "ML": "Bamako",
  "NE": "Niamey", "TG": "Lome", "GN": "Conakry", "CM": "Yaounde", "GA": "Libreville",
  "CG": "Brazzaville", "CD": "Kinshasa",
  // North Africa
  "MA": "Casablanca", "TN": "Tunis", "DZ": "Alger", "EG": "Cairo",
  // Other
  "RU": "Moscow", "JP": "Tokyo", "CN": "Beijing", "IN": "Delhi", "BR": "Sao Paulo",
  "AU": "Sydney", "NZ": "Auckland", "ZA": "Johannesburg",
};

// Area code to Canadian province mapping
const AREA_CODE_TO_PROVINCE: Record<string, string> = {
  "204": "MB", "431": "MB",
  "226": "ON", "249": "ON", "289": "ON", "343": "ON", "365": "ON", 
  "416": "ON", "437": "ON", "519": "ON", "548": "ON", "613": "ON", 
  "647": "ON", "705": "ON", "807": "ON", "905": "ON",
  "236": "BC", "250": "BC", "604": "BC", "672": "BC", "778": "BC",
  "306": "SK", "639": "SK",
  "403": "AB", "587": "AB", "780": "AB", "825": "AB",
  "418": "QC", "438": "QC", "450": "QC", "514": "QC", "579": "QC", "581": "QC", "819": "QC", "873": "QC",
  "506": "NB",
  "709": "NL",
  "782": "NS", "902": "NS",
  "867": "YT", // Also NT and NU
  "387": "AB",
};

const getCountryFromPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\s/g, "");
  
  // Check for +1 prefix (North America)
  if (cleanPhone.startsWith("+1") && cleanPhone.length >= 5) {
    const areaCode = cleanPhone.substring(2, 5);
    if (CANADA_AREA_CODES.includes(areaCode)) {
      return "CA";
    }
    return "US";
  }
  
  // Check other country prefixes
  for (const prefix of Object.keys(PHONE_TO_COUNTRY).sort((a, b) => b.length - a.length)) {
    if (cleanPhone.startsWith(prefix)) {
      return PHONE_TO_COUNTRY[prefix];
    }
  }
  return "SN";
};

const getStateFromPhone = (phone: string, country: string): string => {
  // Specific logic for Canada (by area code)
  if (country === "CA") {
    const cleanPhone = phone.replace(/\s/g, "");
    if (cleanPhone.startsWith("+1") && cleanPhone.length >= 5) {
      const areaCode = cleanPhone.substring(2, 5);
      return AREA_CODE_TO_PROVINCE[areaCode] || "QC";
    }
    return "QC";
  }
  
  // For all other countries, use the default state mapping
  return COUNTRY_DEFAULT_STATE[country] || "";
};

const isMobileMoneyEligible = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\s/g, "");
  return MOBILE_MONEY_PREFIXES.some((prefix) => cleanPhone.startsWith(prefix));
};

// Extract surname from full name (last word) or use default
const extractSurname = (fullName: string): { firstName: string; surname: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    const surname = parts.pop() || "Client";
    const firstName = parts.join(" ");
    return { firstName, surname };
  }
  return { firstName: fullName || "Client", surname: "GoMonto" };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use production credentials from environment secrets
    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    
    console.log("Using CinetPay credentials from secrets");

    if (!apiKey || !siteId) {
      console.error("CinetPay credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Payment provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Optional: Validate user from JWT if provided (for extra security)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      console.log("Authenticated user:", userId);
    }
    
    const body: CinetPayRequest = await req.json();
    
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("CinetPay initiate error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
