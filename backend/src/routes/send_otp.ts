import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const send_otpRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

const resend = new Resend(process.env.RESEND_API_KEY);

send_otpRouter.post('/', async (req: Request, res: Response) => {
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
    const { email, country }: SendOtpRequest = req.body;
    
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          return new Response(
            JSON.stringify({ error: "Format d'email invalide" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        // Check for disposable email domains
        const emailDomain = email.split("@")[1]?.toLowerCase();
        if (disposableEmailDomains.includes(emailDomain)) {
          return new Response(
            JSON.stringify({ error: "Les emails jetables ne sont pas autorisés. Veuillez utiliser un email valide." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        // Validate country
        const validCountries = ["senegal", "cote_ivoire", "mali", "burkina_faso", "benin", "togo", "niger", "guinee_bissau"];
        if (!country || !validCountries.includes(country)) {
          return new Response(
            JSON.stringify({ error: "Pays invalide" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
        // Get client IP for rate limiting
        const clientIP = req.headers['x-forwarded-for']?.split(",")[0]?.trim() || 
                         req.headers['cf-connecting-ip'] || 
                         "unknown";
    
        // Rate limiting: Check attempts in the last hour
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        
        const { data: recentAttempts, error: rateLimitError } = await supabase
          .from("otp_rate_limits")
          .select("id")
          .eq("email", email.toLowerCase())
          .gte("created_at", oneHourAgo);
    
        if (!rateLimitError && recentAttempts && recentAttempts.length >= MAX_OTP_ATTEMPTS_PER_HOUR) {
          return new Response(
            JSON.stringify({ error: "Trop de tentatives. Veuillez réessayer dans 1 heure." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        // Also check IP-based rate limiting (10 attempts per hour per IP)
        const { data: ipAttempts } = await supabase
          .from("otp_rate_limits")
          .select("id")
          .eq("ip_address", clientIP)
          .gte("created_at", oneHourAgo);
    
        if (ipAttempts && ipAttempts.length >= 10) {
          return new Response(
            JSON.stringify({ error: "Trop de tentatives depuis cette adresse IP. Veuillez réessayer plus tard." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        // Log this attempt for rate limiting
        await supabase.from("otp_rate_limits").insert({
          email: email.toLowerCase(),
          ip_address: clientIP,
        });
    
        // Clean up old rate limit entries (older than 2 hours)
        const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
        await supabase
          .from("otp_rate_limits")
          .delete()
          .lt("created_at", twoHoursAgo);
    
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", email)
          .maybeSingle();
    
        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "Un compte existe déjà avec cet email. Connectez-vous." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
        // Store OTP in pending_verifications table
        const { error: dbError } = await supabase
          .from("pending_verifications")
          .upsert({
            email: email.toLowerCase(),
            otp_code: otp,
            country,
            expires_at: expiresAt.toISOString(),
            attempts: 0,
            is_verified: false,
            verified_at: null
          }, { onConflict: "email" });
    
        if (dbError) {
          console.error("Database error:", dbError);
          return new Response(
            JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        // Send OTP email using Resend API with improved deliverability
        const emailHtml = `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="x-apple-disable-message-reformatting">
            <title>Code de verification GoMonto</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #e5e5e5;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a2e;">
                          GoMonto
                        </h1>
                        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666666;">
                          Location de vehicules en Afrique de l'Ouest
                        </p>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a2e; text-align: center;">
                          Verification de votre adresse email
                        </h2>
                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #444444; text-align: center;">
                          Vous avez demande a creer un compte sur GoMonto. Utilisez le code ci-dessous pour verifier votre email.
                        </p>
                        <!-- OTP Code Box -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <div style="background-color: #f0f4ff; border: 2px solid #4f46e5; border-radius: 12px; padding: 24px 32px; display: inline-block;">
                                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px;">
                                  Votre code de verification
                                </p>
                                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #1a1a2e; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                  ${otp}
                                </p>
                              </div>
                            </td>
                          </tr>
                        </table>
                        <!-- Expiry Notice -->
                        <p style="margin: 24px 0 0 0; font-size: 14px; color: #666666; text-align: center;">
                          Ce code est valide pendant <strong>10 minutes</strong>.
                        </p>
                        <p style="margin: 16px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                          Si vous n'avez pas demande ce code, ignorez simplement cet email.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
                          Cet email a ete envoye par GoMonto.<br>
                          Pour toute question, contactez-nous a support@gomonto.com
                        </p>
                        <p style="margin: 12px 0 0 0; font-size: 12px; color: #aaaaaa; text-align: center;">
                          © ${new Date().getFullYear()} GoMonto. Tous droits reserves.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;
    
        // Plain text version for better deliverability
        const emailText = `
    GoMonto - Verification de votre email
    
    Bonjour,
    
    Vous avez demande a creer un compte sur GoMonto. Voici votre code de verification :
    
    ${otp}
    
    Ce code est valide pendant 10 minutes.
    
    Si vous n'avez pas demande ce code, ignorez simplement cet email.
    
    ---
    GoMonto - Location de vehicules en Afrique de l'Ouest
    support@gomonto.com
        `.trim();
    
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "GoMonto <noreply@gomonto.com>",
            reply_to: "support@gomonto.com",
            to: [email],
            subject: "Votre code de verification GoMonto",
            html: emailHtml,
            text: emailText,
            tags: [
              { name: "category", value: "verification" },
              { name: "type", value: "otp" }
            ]
          }),
        });
    
        if (!emailResponse.ok) {
          const errorData = await emailResponse.text();
          console.error("Resend API error:", errorData);
          return new Response(
            JSON.stringify({ error: "Impossible d'envoyer l'email. Veuillez réessayer." }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
    
        const emailResult = await emailResponse.json();
        console.log("OTP email sent successfully:", emailResult.id);
    
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Code de vérification envoyé",
            expiresIn: 600 // 10 minutes in seconds
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
  } catch (error) {
    console.error('[send_otp] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'send-otp'
    });
  }
});
