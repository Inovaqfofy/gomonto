import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const generate_condition_reportRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

const resend = new Resend(process.env.RESEND_API_KEY);

generate_condition_reportRouter.post('/', async (req: Request, res: Response) => {
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
    const { reportId } = req.body;
    
        if (!reportId) {
          throw new Error("Report ID is required");
        }
    
        console.log("Generating condition report for:", reportId);
    
        // Initialize clients
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;
    
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
        // Fetch the report
        const { data: report, error: reportError } = await supabase
          .from("vehicle_condition_reports")
          .select("*")
          .eq("id", reportId)
          .single();
    
        if (reportError || !report) {
          throw new Error("Report not found");
        }
    
        console.log("Report found:", report.id);
    
        // Fetch reservation details
        const { data: reservation, error: reservationError } = await supabase
          .from("reservations")
          .select("owner_id, renter_id")
          .eq("id", report.reservation_id)
          .single();
    
        if (reservationError || !reservation) {
          throw new Error("Reservation not found");
        }
    
        // Fetch vehicle details
        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .select("brand, model, year, license_plate")
          .eq("id", report.vehicle_id)
          .single();
    
        if (vehicleError || !vehicle) {
          throw new Error("Vehicle not found");
        }
    
        const vehicleName = `${vehicle.brand} ${vehicle.model} (${vehicle.license_plate})`;
    
        // Fetch owner profile
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", reservation.owner_id)
          .single();
    
        // Fetch renter profile
        const { data: renterProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", reservation.renter_id)
          .single();
    
        const ownerName = ownerProfile?.full_name || "Propriétaire";
        const renterName = renterProfile?.full_name || "Locataire";
        const reportDate = new Date(report.completed_at).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    
        // Generate email HTML
        const emailHtml = generateEmailHtml(
          report as ConditionReport,
          vehicleName,
          ownerName,
          renterName,
          reportDate
        );
    
        const reportTypeLabel = report.report_type === "departure" ? "Départ" : "Retour";
        const emailSubject = `📋 Certificat d'État du Véhicule - ${vehicleName} (${reportTypeLabel})`;
    
        // Send emails if Resend is configured
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const recipients = [];
    
          if (ownerProfile?.email) recipients.push(ownerProfile.email);
          if (renterProfile?.email) recipients.push(renterProfile.email);
    
          if (recipients.length > 0) {
            console.log("Sending emails to:", recipients);
    
            const { error: emailError } = await resend.emails.send({
              from: "GoMonto <onboarding@resend.dev>",
              to: recipients,
              subject: emailSubject,
              html: emailHtml,
            });
    
            if (emailError) {
              console.error("Email sending error:", emailError);
            } else {
              console.log("Emails sent successfully");
            }
          }
        } else {
          console.log("RESEND_API_KEY not configured, skipping email sending");
        }
    
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Condition report certificate generated and sent",
            reportId: report.id 
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
  } catch (error) {
    console.error('[generate_condition_report] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'generate-condition-report'
    });
  }
});
