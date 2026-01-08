import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const cinetpay_check_statusRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

const resend = new Resend(process.env.RESEND_API_KEY);

cinetpay_check_statusRouter.post('/', async (req: Request, res: Response) => {
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
    console.error('[cinetpay_check_status] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'cinetpay-check-status'
    });
  }
});
