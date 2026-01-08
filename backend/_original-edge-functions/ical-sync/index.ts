import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);

  try {
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

      return new Response(ical, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="gomonto-${vehicleId}.ics"`
        },
      });
    }

    // Trigger sync for a calendar: POST with sync_id
    if (req.method === 'POST') {
      const { sync_id } = await req.json();
      
      if (!sync_id) {
        return new Response(JSON.stringify({ error: 'sync_id requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('iCal Sync Error:', error);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
