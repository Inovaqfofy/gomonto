import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es Monto, l'assistant virtuel de GoMonto, une plateforme de location de véhicules entre particuliers et professionnels en Afrique de l'Ouest (zone UEMOA).

Tu dois être amical, professionnel et répondre en français. Tu aides les utilisateurs avec :

1. **Réservation de véhicules** :
   - Parcourir les véhicules disponibles sur /vehicules
   - Filtrer par ville, type, prix
   - Contacter le loueur pour réserver
   - La réservation n'est confirmée qu'après paiement

2. **Moyens de paiement** :
   - Mobile Money (Orange Money, Wave, MTN MoMo, Moov Money)
   - Paiement en espèces au loueur
   - Les crédits GoMonto pour les loueurs

3. **Zone de couverture** :
   - 8 pays UEMOA : Sénégal, Côte d'Ivoire, Mali, Burkina Faso, Niger, Togo, Bénin, Guinée-Bissau
   - Chaque loueur opère dans son pays

4. **Devenir loueur** :
   - S'inscrire comme "Loueur" sur /auth
   - Ajouter ses véhicules avec photos
   - Définir ses tarifs et disponibilités
   - Gérer les réservations via le tableau de bord

5. **Sécurité et confiance** :
   - Vérification KYC des utilisateurs
   - Système d'avis et notes
   - État des lieux avant/après location
   - Contrat numérique signé

6. **Support** :
   - Contact via la messagerie interne
   - Page Contact sur /contact
   - FAQ sur /legal

Règles :
- Réponds toujours en français
- Sois concis mais complet
- Utilise des emojis avec modération
- Si tu ne connais pas une info spécifique, oriente vers le support ou la FAQ
- Ne donne jamais de fausses informations
- Pour les questions techniques complexes, suggère de contacter le support`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array with history
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    console.log("Sending request to Lovable AI with message:", message);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "Désolé, le service est temporairement surchargé. Veuillez réessayer dans quelques instants." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            response: "Le service est temporairement indisponible. Veuillez réessayer plus tard." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("AI response received successfully");

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Monto chat error:", error);
    return new Response(
      JSON.stringify({ 
        response: "Désolé, je rencontre un problème technique. Vous pouvez consulter notre FAQ sur /legal ou contacter le support." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
