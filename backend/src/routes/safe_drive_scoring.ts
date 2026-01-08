import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const safe_drive_scoringRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

safe_drive_scoringRouter.post('/', async (req: Request, res: Response) => {
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
    
        const { action, sessionId, reservationId, events } = req.body;
    
        console.log(`Safe Drive Scoring action: ${action}`, { sessionId, reservationId });
    
        switch (action) {
          case "start_session": {
            const { renterId, ownerId, vehicleId } = req.body;
    
            const { data: session, error } = await supabase
              .from("safe_drive_sessions")
              .insert({
                reservation_id: reservationId,
                renter_id: renterId,
                owner_id: ownerId,
                vehicle_id: vehicleId,
                is_active: true,
                session_start: new Date().toISOString(),
                overall_score: 100,
                current_behavior: 'safe',
              })
              .select()
              .single();
    
            if (error) throw error;
    
            console.log("Safe drive session started:", session.id);
    
            return new Response(JSON.stringify({ success: true, session }), {,
            });
          }
    
          case "update_telemetry": {
            if (!sessionId || !events || !Array.isArray(events)) {
              throw new Error("Missing sessionId or events");
            }
    
            // Get current session
            const { data: session, error: fetchError } = await supabase
              .from("safe_drive_sessions")
              .select("*")
              .eq("id", sessionId)
              .single();
    
            if (fetchError) throw fetchError;
    
            let scoreDeduction = 0;
            let harshBrakingCount = session.harsh_braking_count || 0;
            let harshAccelerationCount = session.harsh_acceleration_count || 0;
            let sharpTurnCount = session.sharp_turn_count || 0;
            let shockCount = session.shock_detected_count || 0;
            let maxSpeed = session.max_speed_recorded || 0;
            let currentSpeed = session.current_speed || 0;
            let lastLat = session.last_location_lat;
            let lastLng = session.last_location_lng;
    
            const eventsToInsert: any[] = [];
    
            for (const event of events as DrivingEvent[]) {
              switch (event.type) {
                case 'speed':
                  currentSpeed = event.value || 0;
                  maxSpeed = Math.max(maxSpeed, currentSpeed);
                  if (currentSpeed > 120) {
                    scoreDeduction += 5;
                    eventsToInsert.push({
                      session_id: sessionId,
                      event_type: 'overspeed',
                      severity: currentSpeed > 150 ? 'critical' : 'high',
                      speed_at_event: currentSpeed,
                      location_lat: event.lat,
                      location_lng: event.lng,
                      description: `Vitesse excessive: ${currentSpeed} km/h`,
                    });
                  }
                  break;
    
                case 'harsh_braking':
                  harshBrakingCount++;
                  scoreDeduction += 3;
                  eventsToInsert.push({
                    session_id: sessionId,
                    event_type: 'harsh_braking',
                    severity: 'medium',
                    speed_at_event: currentSpeed,
                    location_lat: event.lat,
                    location_lng: event.lng,
                  });
                  break;
    
                case 'harsh_acceleration':
                  harshAccelerationCount++;
                  scoreDeduction += 2;
                  eventsToInsert.push({
                    session_id: sessionId,
                    event_type: 'harsh_acceleration',
                    severity: 'low',
                    speed_at_event: currentSpeed,
                    location_lat: event.lat,
                    location_lng: event.lng,
                  });
                  break;
    
                case 'sharp_turn':
                  sharpTurnCount++;
                  scoreDeduction += 2;
                  eventsToInsert.push({
                    session_id: sessionId,
                    event_type: 'sharp_turn',
                    severity: 'medium',
                    speed_at_event: currentSpeed,
                    location_lat: event.lat,
                    location_lng: event.lng,
                  });
                  break;
    
                case 'shock':
                  shockCount++;
                  scoreDeduction += 15;
                  eventsToInsert.push({
                    session_id: sessionId,
                    event_type: 'shock',
                    severity: 'critical',
                    speed_at_event: currentSpeed,
                    location_lat: event.lat,
                    location_lng: event.lng,
                    description: 'Choc détecté',
                  });
                  break;
    
                case 'location':
                  lastLat = event.lat;
                  lastLng = event.lng;
                  break;
              }
            }
    
            // Calculate new score
            const newScore = Math.max(0, Math.min(100, 100 - scoreDeduction));
            
            // Determine behavior based on score
            let behavior: 'safe' | 'moderate' | 'risky' | 'dangerous';
            if (newScore >= 80) behavior = 'safe';
            else if (newScore >= 60) behavior = 'moderate';
            else if (newScore >= 40) behavior = 'risky';
            else behavior = 'dangerous';
    
            // Insert events
            if (eventsToInsert.length > 0) {
              await supabase.from("safe_drive_events").insert(eventsToInsert);
            }
    
            // Update session
            const { error: updateError } = await supabase
              .from("safe_drive_sessions")
              .update({
                current_speed: currentSpeed,
                max_speed_recorded: maxSpeed,
                harsh_braking_count: harshBrakingCount,
                harsh_acceleration_count: harshAccelerationCount,
                sharp_turn_count: sharpTurnCount,
                shock_detected_count: shockCount,
                overall_score: newScore,
                current_behavior: behavior,
                last_location_lat: lastLat,
                last_location_lng: lastLng,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sessionId);
    
            if (updateError) throw updateError;
    
            console.log(`Session ${sessionId} updated - Score: ${newScore}, Behavior: ${behavior}`);
    
            return new Response(JSON.stringify({ 
              success: true, 
              score: newScore,
              behavior,
              eventsProcessed: events.length 
            }), {,
            });
          }
    
          case "end_session": {
            const { data: session, error } = await supabase
              .from("safe_drive_sessions")
              .update({
                is_active: false,
                session_end: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", sessionId)
              .select()
              .single();
    
            if (error) throw error;
    
            console.log("Safe drive session ended:", sessionId);
    
            return new Response(JSON.stringify({ 
              success: true, 
              session,
              finalScore: session.overall_score 
            }), {,
            });
          }
    
          case "get_session_report": {
            const { data: session, error: sessionError } = await supabase
              .from("safe_drive_sessions")
              .select("*")
              .eq("id", sessionId)
              .single();
    
            if (sessionError) throw sessionError;
    
            const { data: events, error: eventsError } = await supabase
              .from("safe_drive_events")
              .select("*")
              .eq("session_id", sessionId)
              .order("created_at", { ascending: true });
    
            if (eventsError) throw eventsError;
    
            return new Response(JSON.stringify({ 
              success: true, 
              session,
              events,
              summary: {
                duration_minutes: session.session_end 
                  ? Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000)
                  : null,
                total_events: events.length,
                critical_events: events.filter((e: any) => e.severity === 'critical').length,
              }
            }), {,
            });
          }
    
          default:
            return new Response(JSON.stringify({ error: "Invalid action" }), {
              status: 400,
            });
        }
  } catch (error) {
    console.error('[safe_drive_scoring] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'safe-drive-scoring'
    });
  }
});
