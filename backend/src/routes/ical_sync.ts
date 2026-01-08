import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const ical_syncRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

ical_syncRouter.get('/', async (req: Request, res: Response) => {
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
    // Export iCal for a vehicle: GET /ical-sync/export/:vehicleId
        if (req.method === 'GET' && pathParts[0] === 'export' && pathParts[1]) {
          const vehicleId = pathParts[1];
    
          const { data: reservations, error } = await supabase
            .from('reservations')
            .select('id, start_date, end_date, status, vehicles(brand, model)')
            .eq('vehicle_id', vehicleId)
            .in('status', ['confirmed', 'guaranteed', 'in_progress', 'completed']);
    
          if (error) throw error;
    
          // Generate iCal format
          let ical = `BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//GoMonto//Vehicle Calendar//FR
    CALSCALE:GREGORIAN
    METHOD:PUBLISH
    `;
    
          reservations?.forEach((res: any) => {
            const startDate = res.start_date.replace(/-/g, '');
            const endDate = res.end_date.replace(/-/g, '');
            const vehicleName = res.vehicles ? `${res.vehicles.brand} ${res.vehicles.model}` : 'Véhicule';
            
            ical += `BEGIN:VEVENT
    UID:${res.id}@gomonto.com
    DTSTART;VALUE=DATE:${startDate}
    DTEND;VALUE=DATE:${endDate}
    SUMMARY:Réservation - ${vehicleName}
    STATUS:CONFIRMED
    END:VEVENT
    `;
          });
    
          ical += 'END:VCALENDAR';
    
          return new Response(ical, {.ics"`
            },
          });
        }
    
        // Trigger sync for a calendar: POST with sync_id
        if (req.method === 'POST') {
          const { sync_id } = req.body;
          
          if (!sync_id) {
            return new Response(JSON.stringify({ error: 'sync_id requis' }), {
              status: 400,
            });
          }
    
          const { data: sync, error: syncError } = await supabase
            .from('external_calendar_syncs')
            .select('*')
            .eq('id', sync_id)
            .single();
    
          if (syncError || !sync) {
            return new Response(JSON.stringify({ error: 'Synchronisation non trouvée' }), {
              status: 404,
            });
          }
    
          // Fetch iCal from external URL
          const icalResponse = await fetch(sync.ical_url);
          if (!icalResponse.ok) {
            await supabase
              .from('external_calendar_syncs')
              .update({ error_message: 'Impossible de récupérer le calendrier' })
              .eq('id', sync_id);
            throw new Error('Failed to fetch iCal');
          }
    
          const icalData = await icalResponse.text();
          
          // Parse iCal events (simplified parsing)
          const events: { start: string; end: string; summary: string }[] = [];
          const eventBlocks = icalData.split('BEGIN:VEVENT');
          
          for (const block of eventBlocks.slice(1)) {
            const dtstart = block.match(/DTSTART[^:]*:(\d{8})/)?.[1];
            const dtend = block.match(/DTEND[^:]*:(\d{8})/)?.[1];
            const summary = block.match(/SUMMARY:(.*)/)?.[1]?.trim() || 'Blocked';
            
            if (dtstart && dtend) {
              const start = `${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`;
              const end = `${dtend.slice(0,4)}-${dtend.slice(4,6)}-${dtend.slice(6,8)}`;
              events.push({ start, end, summary });
            }
          }
    
          // Update sync record
          await supabase
            .from('external_calendar_syncs')
            .update({ 
              last_synced_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', sync_id);
    
          console.log(`Synced ${events.length} events for sync ${sync_id}`);
    
          return new Response(JSON.stringify({ 
            success: true, 
            events_count: events.length,
            events 
          }), {,
          });
        }
    
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
        });
  } catch (error) {
    console.error('[ical_sync] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'ical-sync'
    });
  }
});

ical_syncRouter.post('/', async (req: Request, res: Response) => {
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
    // Export iCal for a vehicle: GET /ical-sync/export/:vehicleId
        if (req.method === 'GET' && pathParts[0] === 'export' && pathParts[1]) {
          const vehicleId = pathParts[1];
    
          const { data: reservations, error } = await supabase
            .from('reservations')
            .select('id, start_date, end_date, status, vehicles(brand, model)')
            .eq('vehicle_id', vehicleId)
            .in('status', ['confirmed', 'guaranteed', 'in_progress', 'completed']);
    
          if (error) throw error;
    
          // Generate iCal format
          let ical = `BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//GoMonto//Vehicle Calendar//FR
    CALSCALE:GREGORIAN
    METHOD:PUBLISH
    `;
    
          reservations?.forEach((res: any) => {
            const startDate = res.start_date.replace(/-/g, '');
            const endDate = res.end_date.replace(/-/g, '');
            const vehicleName = res.vehicles ? `${res.vehicles.brand} ${res.vehicles.model}` : 'Véhicule';
            
            ical += `BEGIN:VEVENT
    UID:${res.id}@gomonto.com
    DTSTART;VALUE=DATE:${startDate}
    DTEND;VALUE=DATE:${endDate}
    SUMMARY:Réservation - ${vehicleName}
    STATUS:CONFIRMED
    END:VEVENT
    `;
          });
    
          ical += 'END:VCALENDAR';
    
          return new Response(ical, {.ics"`
            },
          });
        }
    
        // Trigger sync for a calendar: POST with sync_id
        if (req.method === 'POST') {
          const { sync_id } = req.body;
          
          if (!sync_id) {
            return new Response(JSON.stringify({ error: 'sync_id requis' }), {
              status: 400,
            });
          }
    
          const { data: sync, error: syncError } = await supabase
            .from('external_calendar_syncs')
            .select('*')
            .eq('id', sync_id)
            .single();
    
          if (syncError || !sync) {
            return new Response(JSON.stringify({ error: 'Synchronisation non trouvée' }), {
              status: 404,
            });
          }
    
          // Fetch iCal from external URL
          const icalResponse = await fetch(sync.ical_url);
          if (!icalResponse.ok) {
            await supabase
              .from('external_calendar_syncs')
              .update({ error_message: 'Impossible de récupérer le calendrier' })
              .eq('id', sync_id);
            throw new Error('Failed to fetch iCal');
          }
    
          const icalData = await icalResponse.text();
          
          // Parse iCal events (simplified parsing)
          const events: { start: string; end: string; summary: string }[] = [];
          const eventBlocks = icalData.split('BEGIN:VEVENT');
          
          for (const block of eventBlocks.slice(1)) {
            const dtstart = block.match(/DTSTART[^:]*:(\d{8})/)?.[1];
            const dtend = block.match(/DTEND[^:]*:(\d{8})/)?.[1];
            const summary = block.match(/SUMMARY:(.*)/)?.[1]?.trim() || 'Blocked';
            
            if (dtstart && dtend) {
              const start = `${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`;
              const end = `${dtend.slice(0,4)}-${dtend.slice(4,6)}-${dtend.slice(6,8)}`;
              events.push({ start, end, summary });
            }
          }
    
          // Update sync record
          await supabase
            .from('external_calendar_syncs')
            .update({ 
              last_synced_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', sync_id);
    
          console.log(`Synced ${events.length} events for sync ${sync_id}`);
    
          return new Response(JSON.stringify({ 
            success: true, 
            events_count: events.length,
            events 
          }), {,
          });
        }
    
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
        });
  } catch (error) {
    console.error('[ical_sync] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'ical-sync'
    });
  }
});
