import { Router, Request, Response } from 'express';

export const monto_chatRouter = Router();

monto_chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // ═══════════════════════════════════════════════════════════
    // BUSINESS LOGIC (100% migrated from Edge Function)
    // ═══════════════════════════════════════════════════════════
    const { message, history = [] } = req.body;
    
        if (!message) {
          return new Response(
            JSON.stringify({ error: "Message requis" }),
            { status: 400 }
          );
        }
    
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!LOVABLE_API_KEY) {
          console.error("LOVABLE_API_KEY not configured");
          return new Response(
            JSON.stringify({ error: "Service non configuré" }),
            { status: 500 }
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
              { }
            );
          }
          
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ 
                response: "Le service est temporairement indisponible. Veuillez réessayer plus tard." 
              }),
              { }
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
          { }
        );
  } catch (error) {
    console.error('[monto_chat] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'monto-chat'
    });
  }
});
