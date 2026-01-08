import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractRequest {
  reservation_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reservation_id }: ContractRequest = await req.json();
    console.log("Generating contract for reservation:", reservation_id);

    // Fetch complete reservation details
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select(`
        *,
        vehicle:vehicles(
          brand, model, year, license_plate, fuel_type, transmission, seats, daily_price,
          location_city, location_country
        )
      `)
      .eq("id", reservation_id)
      .single();

    if (error || !reservation) {
      console.error("Reservation not found:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Reservation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if reservation is confirmed/guaranteed
    if (!reservation.is_guaranteed && reservation.status !== "confirmed") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Contract only available for confirmed/guaranteed reservations" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch owner profile
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, country")
      .eq("user_id", reservation.owner_id)
      .single();

    // Fetch renter profile
    const { data: renterProfile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, country")
      .eq("user_id", reservation.renter_id)
      .single();

    // Fetch check-in photos if any
    const { data: checkinPhotos } = await supabase
      .from("checkin_photos")
      .select("*")
      .eq("reservation_id", reservation_id);

    const remainingAmount = reservation.total_price - reservation.deposit_amount;
    const contractDate = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Generate HTML contract (can be converted to PDF using a service like Puppeteer or similar)
    const contractHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat de Location - GoMonto</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
    .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .contract-title { font-size: 24px; color: #374151; margin-top: 10px; }
    .contract-number { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 600; color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .info-box { background: #f9fafb; border-radius: 8px; padding: 15px; }
    .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
    .info-value { font-size: 16px; font-weight: 500; }
    .vehicle-details { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; padding: 20px; }
    .amount-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount-paid { color: #10b981; font-size: 24px; font-weight: bold; }
    .amount-remaining { color: #f59e0b; font-size: 20px; font-weight: 600; margin-top: 10px; }
    .signature-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 60px; }
    .signature-box { border-top: 2px solid #374151; padding-top: 10px; text-align: center; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    .status-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .checkin-photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; }
    .photo-placeholder { background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; height: 120px; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">GoMonto</div>
    <div class="contract-title">CONTRAT DE LOCATION DE VÉHICULE</div>
    <div class="contract-number">N° ${reservation_id.slice(0, 8).toUpperCase()} - ${contractDate}</div>
    <span class="status-badge">RÉSERVATION GARANTIE ✓</span>
  </div>

  <div class="section">
    <div class="section-title">👤 Parties au contrat</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Loueur (Propriétaire)</div>
        <div class="info-value">${ownerProfile?.full_name || "N/A"}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
          ${ownerProfile?.email || ""}<br>
          ${ownerProfile?.phone || ""}
        </div>
      </div>
      <div class="info-box">
        <div class="info-label">Locataire (Client)</div>
        <div class="info-value">${renterProfile?.full_name || reservation.renter_phone || "N/A"}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
          ${renterProfile?.email || ""}<br>
          ${reservation.renter_phone || renterProfile?.phone || ""}
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🚗 Véhicule loué</div>
    <div class="vehicle-details">
      <div class="info-grid">
        <div>
          <div class="info-label">Véhicule</div>
          <div class="info-value">${reservation.vehicle?.brand} ${reservation.vehicle?.model} (${reservation.vehicle?.year})</div>
        </div>
        <div>
          <div class="info-label">Immatriculation</div>
          <div class="info-value">${reservation.vehicle?.license_plate}</div>
        </div>
        <div>
          <div class="info-label">Carburant / Transmission</div>
          <div class="info-value">${reservation.vehicle?.fuel_type} / ${reservation.vehicle?.transmission}</div>
        </div>
        <div>
          <div class="info-label">Nombre de places</div>
          <div class="info-value">${reservation.vehicle?.seats} places</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📅 Période de location</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Date de début</div>
        <div class="info-value">${new Date(reservation.start_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Date de fin</div>
        <div class="info-value">${new Date(reservation.end_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
    </div>
    <div class="info-box" style="margin-top: 15px;">
      <div class="info-label">Durée totale</div>
      <div class="info-value">${reservation.total_days} jour(s) × ${reservation.daily_price.toLocaleString()} FCFA/jour</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">💰 Détails financiers</div>
    <div class="amount-box">
      <div class="info-label">Montant total de la location</div>
      <div style="font-size: 28px; font-weight: bold; color: #1f2937;">${reservation.total_price.toLocaleString()} FCFA</div>
      <div style="margin-top: 15px; display: flex; justify-content: center; gap: 40px;">
        <div>
          <div class="amount-paid">✓ ${reservation.deposit_amount.toLocaleString()} FCFA</div>
          <div style="font-size: 12px; color: #6b7280;">Acompte payé via Mobile Money</div>
        </div>
        <div>
          <div class="amount-remaining">${remainingAmount.toLocaleString()} FCFA</div>
          <div style="font-size: 12px; color: #6b7280;">À payer à la remise des clés</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📸 État des lieux (Check-in)</div>
    <p style="color: #6b7280; margin-bottom: 15px;">Photos du véhicule prises avant la remise des clés :</p>
    <div class="checkin-photos">
      ${["Avant", "Arrière", "Côté gauche", "Côté droit"].map((side, i) => {
        const photo = checkinPhotos?.find(p => 
          (i === 0 && p.photo_type === "front") ||
          (i === 1 && p.photo_type === "back") ||
          (i === 2 && p.photo_type === "left") ||
          (i === 3 && p.photo_type === "right")
        );
        return `<div class="photo-placeholder">${photo ? `<img src="${photo.file_path}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : side}</div>`;
      }).join("")}
    </div>
  </div>

  <div class="section">
    <div class="section-title">📜 Conditions générales</div>
    <ul style="color: #4b5563; font-size: 14px; padding-left: 20px;">
      <li>Le locataire s'engage à restituer le véhicule dans l'état où il l'a reçu.</li>
      <li>Tout dommage constaté sera à la charge du locataire.</li>
      <li>Le carburant n'est pas inclus dans le prix de la location.</li>
      <li>Le véhicule doit être restitué avec le même niveau de carburant qu'à la prise en charge.</li>
      <li>En cas de retard, des frais supplémentaires de ${reservation.daily_price.toLocaleString()} FCFA/jour seront appliqués.</li>
    </ul>
  </div>

  <div class="signature-section">
    <div>
      <div class="signature-box">
        <div style="margin-bottom: 50px;"></div>
        <div>Signature du Loueur</div>
        <div style="font-size: 12px; color: #6b7280;">${ownerProfile?.full_name || ""}</div>
      </div>
    </div>
    <div>
      <div class="signature-box">
        <div style="margin-bottom: 50px;"></div>
        <div>Signature du Locataire</div>
        <div style="font-size: 12px; color: #6b7280;">${renterProfile?.full_name || ""}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>GoMonto</strong> - La plateforme de location de véhicules en Afrique de l'Ouest</p>
    <p>Contrat généré le ${contractDate} • Référence: ${reservation_id}</p>
  </div>
</body>
</html>
    `.trim();

    return new Response(
      JSON.stringify({
        success: true,
        contract_html: contractHtml,
        reservation,
        owner: ownerProfile,
        renter: renterProfile,
        checkin_photos: checkinPhotos,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Contract generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
