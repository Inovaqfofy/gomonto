import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConditionReport {
  id: string;
  reservation_id: string;
  vehicle_id: string;
  report_type: string;
  photo_front: string;
  photo_back: string;
  photo_left_side: string;
  photo_right_side: string;
  photo_dashboard: string;
  photo_fuel_gauge: string;
  fuel_level: number;
  mileage: number;
  exterior_condition: string;
  interior_condition: string;
  notes: string;
  owner_signature: string;
  renter_signature: string;
  owner_signed_at: string;
  renter_signed_at: string;
  completed_at: string;
}

const getConditionLabel = (condition: string): string => {
  const labels: Record<string, string> = {
    excellent: "Excellent",
    good: "Bon",
    fair: "Acceptable",
    poor: "Mauvais",
  };
  return labels[condition] || condition;
};

const generateEmailHtml = (
  report: ConditionReport,
  vehicleName: string,
  ownerName: string,
  renterName: string,
  reportDate: string
): string => {
  const reportTypeLabel = report.report_type === "departure" ? "Départ" : "Retour";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificat d'État du Véhicule - GoMonto</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2DD4BF 0%, #6366F1 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
        🚗 Certificat d'État du Véhicule
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
        État des lieux - ${reportTypeLabel}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <!-- Vehicle Info -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">📋 Informations</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Véhicule</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${vehicleName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${reportDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Propriétaire</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${ownerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Locataire</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${renterName}</td>
          </tr>
        </table>
      </div>

      <!-- Condition Details -->
      <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
        <h2 style="margin: 0 0 16px 0; color: #166534; font-size: 18px;">✅ État du véhicule</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Kilométrage</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${report.mileage.toLocaleString()} km</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Niveau de carburant</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${report.fuel_level}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">État extérieur</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${getConditionLabel(report.exterior_condition)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">État intérieur</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${getConditionLabel(report.interior_condition)}</td>
          </tr>
        </table>
        ${report.notes ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #bbf7d0;">
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Remarques :</p>
          <p style="margin: 0; color: #1e293b; font-size: 14px;">${report.notes}</p>
        </div>
        ` : ''}
      </div>

      <!-- Signatures -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">✍️ Signatures</h2>
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">Propriétaire</p>
            <img src="${report.owner_signature}" alt="Signature propriétaire" style="max-width: 150px; height: 60px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;" />
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 10px;">Signé le ${new Date(report.owner_signed_at).toLocaleDateString('fr-FR')}</p>
          </div>
          <div style="flex: 1; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">Locataire</p>
            <img src="${report.renter_signature}" alt="Signature locataire" style="max-width: 150px; height: 60px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;" />
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 10px;">Signé le ${new Date(report.renter_signed_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      <!-- Legal Notice -->
      <div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; border: 1px solid #fcd34d;">
        <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.5;">
          <strong>📜 Mention légale :</strong> Ce document constitue une preuve de l'état du véhicule au moment de la remise/restitution des clés. 
          Il a été signé électroniquement par les deux parties et fait foi en cas de litige. 
          Les photos associées sont conservées de manière sécurisée. Référence: ${report.id}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #1e293b; padding: 24px; text-align: center;">
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} GoMonto - Location de véhicules en Afrique de l'Ouest
      </p>
      <p style="color: #64748b; margin: 8px 0 0 0; font-size: 10px;">
        Ce certificat a été généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();

    if (!reportId) {
      throw new Error("Report ID is required");
    }

    console.log("Generating condition report for:", reportId);

    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

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
  } catch (error: any) {
    console.error("Error in generate-condition-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
