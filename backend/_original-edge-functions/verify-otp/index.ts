import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: VerifyOtpRequest = await req.json();

    // Validate inputs
    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email et code requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Le code doit contenir 6 chiffres" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending verification
    const { data: verification, error: fetchError } = await supabase
      .from("pending_verifications")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error("Erreur lors de la vérification");
    }

    if (!verification) {
      return new Response(
        JSON.stringify({ error: "Aucune vérification en cours pour cet email. Veuillez recommencer." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      // Delete expired verification
      await supabase
        .from("pending_verifications")
        .delete()
        .eq("email", email.toLowerCase());

      return new Response(
        JSON.stringify({ error: "Le code a expiré. Veuillez demander un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempts (max 5)
    if (verification.attempts >= 5) {
      // Delete verification after too many attempts
      await supabase
        .from("pending_verifications")
        .delete()
        .eq("email", email.toLowerCase());

      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Veuillez demander un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP
    if (verification.otp_code !== otp) {
      // Increment attempts
      await supabase
        .from("pending_verifications")
        .update({ attempts: verification.attempts + 1 })
        .eq("email", email.toLowerCase());

      const remainingAttempts = 5 - (verification.attempts + 1);
      return new Response(
        JSON.stringify({ 
          error: `Code incorrect. ${remainingAttempts} tentative(s) restante(s).`,
          remainingAttempts 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // OTP is valid - mark as verified
    const { error: updateError } = await supabase
      .from("pending_verifications")
      .update({ 
        verified_at: new Date().toISOString(),
        is_verified: true 
      })
      .eq("email", email.toLowerCase());

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Erreur lors de la validation");
    }

    console.log("OTP verified successfully for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email vérifié avec succès",
        country: verification.country
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
