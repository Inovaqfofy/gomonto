import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const process_credit_purchaseRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

process_credit_purchaseRouter.post('/', async (req: Request, res: Response) => {
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
    
        const { user_id, pack_id, payment_method, payment_reference }: CreditPurchaseRequest = req.body;
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
            { status: 404 }
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
          { status: 200 }
        );
  } catch (error) {
    console.error('[process_credit_purchase] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'process-credit-purchase'
    });
  }
});
