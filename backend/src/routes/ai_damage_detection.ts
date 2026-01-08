import { Router, Request, Response } from 'express';

export const ai_damage_detectionRouter = Router();

ai_damage_detectionRouter.post('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // ═══════════════════════════════════════════════════════════
    // BUSINESS LOGIC (100% migrated from Edge Function)
    // ═══════════════════════════════════════════════════════════
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY is not configured");
        }
    
        const { reservationId, vehicleId, departurePhotos, returnPhotos } = req.body;
    
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
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Crédits insuffisants pour l'analyse IA." }), {
              status: 402,
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
  } catch (error) {
    console.error('[ai_damage_detection] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'ai-damage-detection'
    });
  }
});
