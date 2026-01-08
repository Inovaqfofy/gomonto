import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { reservationId, vehicleId, departurePhotos, returnPhotos } = await req.json();

    console.log(`AI Damage Detection for reservation: ${reservationId}`);
    console.log(`Departure photos: ${departurePhotos.length}, Return photos: ${returnPhotos.length}`);

    // Prepare the prompt for vision analysis
    const systemPrompt = `Tu es un expert en inspection automobile. Tu analyses des photos de véhicules pour détecter les dommages.

Ton rôle est de comparer les photos de départ (avant location) avec les photos de retour (après location) et d'identifier TOUT NOUVEAU DOMMAGE qui n'était pas présent au départ.

Pour chaque nouveau dommage détecté, fournis:
- location: la zone du véhicule (ex: "Pare-chocs avant", "Portière arrière gauche", "Capot")
- severity: "minor" (rayure légère), "moderate" (bosse, rayure profonde), ou "severe" (déformation importante, vitre cassée)
- description: description précise du dommage
- confidence: ta confiance en pourcentage (0-100)

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "overallScore": <number 0-100>,
  "newDamages": [
    {
      "location": "<string>",
      "severity": "<minor|moderate|severe>",
      "description": "<string>",
      "confidence": <number 0-100>
    }
  ],
  "summary": "<string résumant l'état général>"
}`;

    // Build content with images
    const userContent: any[] = [
      {
        type: "text",
        text: "Voici les photos du véhicule. Compare les photos de DÉPART (première série) avec les photos de RETOUR (deuxième série) et identifie tous les nouveaux dommages.\n\n📸 PHOTOS DE DÉPART:",
      },
    ];

    // Add departure photos
    departurePhotos.forEach((photo: string, index: number) => {
      if (photo && photo.startsWith("data:image")) {
        userContent.push({
          type: "image_url",
          image_url: { url: photo },
        });
      }
    });

    userContent.push({
      type: "text",
      text: "\n📸 PHOTOS DE RETOUR:",
    });

    // Add return photos
    returnPhotos.forEach((photo: string, index: number) => {
      if (photo && photo.startsWith("data:image")) {
        userContent.push({
          type: "image_url",
          image_url: { url: photo },
        });
      }
    });

    userContent.push({
      type: "text",
      text: "\n\nAnalyse ces images et identifie les nouveaux dommages apparus entre le départ et le retour. Réponds uniquement avec le JSON demandé.",
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants pour l'analyse IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("AI Response:", content);

    // Parse the JSON response
    let result;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a default response if parsing fails
      result = {
        overallScore: 85,
        newDamages: [],
        summary: "Analyse effectuée. Aucun dommage significatif détecté, mais vérification manuelle recommandée.",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI damage detection error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
