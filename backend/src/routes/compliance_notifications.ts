import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const compliance_notificationsRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

const resend = new Resend(process.env.RESEND_API_KEY);

compliance_notificationsRouter.post('/', async (req: Request, res: Response) => {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        
        // Calculate dates for J-7 and J-0 alerts
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0];
    
        console.log(`Checking compliance for dates: today=${todayStr}, J-7=${sevenDaysStr}`);
    
        // Fetch vehicles with expiring documents
        const { data: vehicles, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("id, brand, model, license_plate, owner_id, insurance_expiry_date, technical_inspection_expiry_date")
          .or(`insurance_expiry_date.eq.${sevenDaysStr},insurance_expiry_date.eq.${todayStr},technical_inspection_expiry_date.eq.${sevenDaysStr},technical_inspection_expiry_date.eq.${todayStr}`);
    
        if (vehiclesError) {
          console.error("Error fetching vehicles:", vehiclesError);
          throw vehiclesError;
        }
    
        console.log(`Found ${vehicles?.length || 0} vehicles with expiring documents`);
    
        const emailsSent: string[] = [];
        const errors: string[] = [];
    
        for (const vehicle of (vehicles as Vehicle[]) || []) {
          // Get owner profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", vehicle.owner_id)
            .single();
    
          if (!profile?.email) {
            console.log(`No email found for owner ${vehicle.owner_id}`);
            continue;
          }
    
          const ownerName = (profile as Profile).full_name || "Cher loueur";
          const vehicleName = `${vehicle.brand} ${vehicle.model}`;
    
          // Check insurance expiry
          if (vehicle.insurance_expiry_date === sevenDaysStr) {
            await sendNotification(
              profile.email,
              ownerName,
              vehicleName,
              vehicle.license_plate,
              "assurance",
              7,
              vehicle.id,
              vehicle.owner_id,
              supabase
            );
            emailsSent.push(`Insurance J-7: ${vehicle.license_plate}`);
          } else if (vehicle.insurance_expiry_date === todayStr) {
            await sendNotification(
              profile.email,
              ownerName,
              vehicleName,
              vehicle.license_plate,
              "assurance",
              0,
              vehicle.id,
              vehicle.owner_id,
              supabase
            );
            emailsSent.push(`Insurance J-0: ${vehicle.license_plate}`);
          }
    
          // Check technical inspection expiry
          if (vehicle.technical_inspection_expiry_date === sevenDaysStr) {
            await sendNotification(
              profile.email,
              ownerName,
              vehicleName,
              vehicle.license_plate,
              "visite technique",
              7,
              vehicle.id,
              vehicle.owner_id,
              supabase
            );
            emailsSent.push(`Technical J-7: ${vehicle.license_plate}`);
          } else if (vehicle.technical_inspection_expiry_date === todayStr) {
            await sendNotification(
              profile.email,
              ownerName,
              vehicleName,
              vehicle.license_plate,
              "visite technique",
              0,
              vehicle.id,
              vehicle.owner_id,
              supabase
            );
            emailsSent.push(`Technical J-0: ${vehicle.license_plate}`);
          }
        }
    
        console.log(`Emails sent: ${emailsSent.length}`, emailsSent);
    
        return new Response(
          JSON.stringify({
            success: true,
            emailsSent: emailsSent.length,
            details: emailsSent,
            errors,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
  } catch (error) {
    console.error('[compliance_notifications] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'compliance-notifications'
    });
  }
});
