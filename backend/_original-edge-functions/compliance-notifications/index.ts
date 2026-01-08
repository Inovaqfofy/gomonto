import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  owner_id: string;
  insurance_expiry_date: string | null;
  technical_inspection_expiry_date: string | null;
}

interface Profile {
  email: string | null;
  full_name: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in compliance-notifications:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendNotification(
  email: string,
  ownerName: string,
  vehicleName: string,
  licensePlate: string,
  documentType: string,
  daysRemaining: number,
  vehicleId: string,
  ownerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const isExpired = daysRemaining === 0;
  const subject = isExpired
    ? `🚨 Alerte GoMonto : Votre ${documentType} expire aujourd'hui !`
    : `⚠️ Rappel GoMonto : Votre ${documentType} expire dans ${daysRemaining} jours`;

  const html = isExpired
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1fb2a6 0%, #f06543 100%); padding: 30px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Alerte Conformité</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px; color: #333;">Bonjour ${ownerName},</p>
          <p style="font-size: 16px; color: #333;">
            L'<strong>${documentType}</strong> de votre véhicule <strong>${vehicleName}</strong> 
            (immatriculation : <strong>${licensePlate}</strong>) <span style="color: #dc2626; font-weight: bold;">expire aujourd'hui</span>.
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #dc2626; font-weight: bold;">
              ⚠️ Votre véhicule est désormais hors-ligne et invisible pour les locataires.
            </p>
          </div>
          <p style="font-size: 16px; color: #333;">
            Pour réactiver la visibilité de votre véhicule, veuillez mettre à jour vos documents 
            dans votre espace propriétaire.
          </p>
          <a href="https://gomonto.com/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #1fb2a6 0%, #f06543 100%); 
                    color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                    font-weight: bold; margin-top: 15px;">
            Mettre à jour mes documents
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            L'équipe GoMonto
          </p>
        </div>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1fb2a6 0%, #f06543 100%); padding: 30px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Rappel Conformité</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px; color: #333;">Bonjour ${ownerName},</p>
          <p style="font-size: 16px; color: #333;">
            L'<strong>${documentType}</strong> de votre véhicule <strong>${vehicleName}</strong> 
            (immatriculation : <strong>${licensePlate}</strong>) expire dans 
            <span style="color: #f59e0b; font-weight: bold;">${daysRemaining} jours</span>.
          </p>
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              Pensez à renouveler votre ${documentType} pour éviter la suspension de votre véhicule.
            </p>
          </div>
          <a href="https://gomonto.com/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #1fb2a6 0%, #f06543 100%); 
                    color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                    font-weight: bold; margin-top: 15px;">
            Accéder à mon espace
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            L'équipe GoMonto
          </p>
        </div>
      </div>
    `;

  try {
    const emailResponse = await resend.emails.send({
      from: "GoMonto <notifications@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log(`Email sent to ${email}:`, emailResponse);

    // Store notification in database
    const notificationType = isExpired
      ? `${documentType === "assurance" ? "insurance" : "technical"}_expired`
      : `${documentType === "assurance" ? "insurance" : "technical"}_warning`;

    await supabase.from("compliance_notifications").insert({
      vehicle_id: vehicleId,
      owner_id: ownerId,
      notification_type: notificationType,
      message: subject,
    });

    return emailResponse;
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    throw error;
  }
}

serve(handler);
