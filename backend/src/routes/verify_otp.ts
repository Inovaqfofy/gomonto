import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const verify_otpRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

verify_otpRouter.post('/', async (req: Request, res: Response) => {
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
    const { email, otp }: VerifyOtpRequest = req.body;
    
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
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  } catch (error) {
    console.error('[verify_otp] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'verify-otp'
    });
  }
});
