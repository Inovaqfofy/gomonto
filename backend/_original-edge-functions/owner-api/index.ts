import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface APIKeyData {
  id: string;
  owner_id: string;
  is_active: boolean;
  rate_limit_per_hour: number;
  allowed_origins: string[] | null;
  usage_count: number;
}

async function validateApiKey(apiKey: string, origin: string | null): Promise<{ valid: boolean; keyData?: APIKeyData; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from('owner_api_keys')
    .select('*')
    .eq('api_key', apiKey)
    .single();
  
  if (error || !data) {
    return { valid: false, error: 'Clé API invalide' };
  }
  
  if (!data.is_active) {
    return { valid: false, error: 'Clé API désactivée' };
  }
  
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'Clé API expirée' };
  }
  
  // Check origin if restrictions are set
  if (data.allowed_origins && data.allowed_origins.length > 0 && origin) {
    const isAllowed = data.allowed_origins.some((o: string) => origin.includes(o));
    if (!isAllowed) {
      return { valid: false, error: 'Origine non autorisée' };
    }
  }
  
  // Update usage count and last used
  await supabase
    .from('owner_api_keys')
    .update({ 
      usage_count: data.usage_count + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', data.id);
  
  return { valid: true, keyData: data };
}

async function logApiCall(
  apiKeyId: string,
  ownerId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress: string | null,
  userAgent: string | null,
  requestBody: any | null,
  errorMessage: string | null
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  await supabase.from('api_logs').insert({
    api_key_id: apiKeyId,
    owner_id: ownerId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    ip_address: ipAddress,
    user_agent: userAgent,
    request_body: requestBody,
    error_message: errorMessage,
  });
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  const origin = req.headers.get('origin');
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip');
  const userAgent = req.headers.get('user-agent');
  
  // Extract API key from header
  const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');
  let apiKey = '';
  
  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (authHeader?.startsWith('gm_')) {
    apiKey = authHeader;
  }
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Clé API requise' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Validate API key
  const { valid, keyData, error: keyError } = await validateApiKey(apiKey, origin);
  
  if (!valid || !keyData) {
    return new Response(JSON.stringify({ error: keyError }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Route: GET /v1/vehicles
    if (req.method === 'GET' && pathParts[0] === 'v1' && pathParts[1] === 'vehicles' && !pathParts[2]) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          brand,
          model,
          year,
          daily_price,
          location_city,
          location_country,
          fuel_type,
          transmission,
          seats,
          description,
          features,
          self_drive_allowed,
          status,
          vehicle_photos (file_path, is_primary)
        `)
        .eq('owner_id', keyData.owner_id)
        .eq('status', 'active');
      
      if (error) throw error;
      
      const responseTime = Date.now() - startTime;
      await logApiCall(keyData.id, keyData.owner_id, '/v1/vehicles', 'GET', 200, responseTime, ipAddress, userAgent, null, null);
      
      return new Response(JSON.stringify({ vehicles, count: vehicles?.length || 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: GET /v1/vehicles/:id
    if (req.method === 'GET' && pathParts[0] === 'v1' && pathParts[1] === 'vehicles' && pathParts[2]) {
      const vehicleId = pathParts[2];
      
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          brand,
          model,
          year,
          daily_price,
          weekly_price,
          monthly_price,
          location_city,
          location_country,
          fuel_type,
          transmission,
          seats,
          description,
          features,
          self_drive_allowed,
          status,
          deposit_amount,
          vehicle_photos (file_path, is_primary)
        `)
        .eq('id', vehicleId)
        .eq('owner_id', keyData.owner_id)
        .single();
      
      if (error || !vehicle) {
        const responseTime = Date.now() - startTime;
        await logApiCall(keyData.id, keyData.owner_id, `/v1/vehicles/${vehicleId}`, 'GET', 404, responseTime, ipAddress, userAgent, null, 'Véhicule non trouvé');
        
        return new Response(JSON.stringify({ error: 'Véhicule non trouvé' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const responseTime = Date.now() - startTime;
      await logApiCall(keyData.id, keyData.owner_id, `/v1/vehicles/${vehicleId}`, 'GET', 200, responseTime, ipAddress, userAgent, null, null);
      
      return new Response(JSON.stringify({ vehicle }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: GET /v1/availability/:id
    if (req.method === 'GET' && pathParts[0] === 'v1' && pathParts[1] === 'availability' && pathParts[2]) {
      const vehicleId = pathParts[2];
      const startDate = url.searchParams.get('start_date') || new Date().toISOString().split('T')[0];
      const endDate = url.searchParams.get('end_date') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Check vehicle belongs to owner
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('id', vehicleId)
        .eq('owner_id', keyData.owner_id)
        .single();
      
      if (vehicleError || !vehicle) {
        const responseTime = Date.now() - startTime;
        await logApiCall(keyData.id, keyData.owner_id, `/v1/availability/${vehicleId}`, 'GET', 404, responseTime, ipAddress, userAgent, null, 'Véhicule non trouvé');
        
        return new Response(JSON.stringify({ error: 'Véhicule non trouvé' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Get reservations for this vehicle
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('start_date, end_date, status')
        .eq('vehicle_id', vehicleId)
        .gte('end_date', startDate)
        .lte('start_date', endDate)
        .in('status', ['confirmed', 'guaranteed', 'in_progress']);
      
      if (resError) throw resError;
      
      // Get blocked dates from external calendar syncs
      const { data: externalBlocks } = await supabase
        .from('external_calendar_syncs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true);
      
      const blockedDates = reservations?.map(r => ({
        start: r.start_date,
        end: r.end_date,
        reason: 'reservation'
      })) || [];
      
      const responseTime = Date.now() - startTime;
      await logApiCall(keyData.id, keyData.owner_id, `/v1/availability/${vehicleId}`, 'GET', 200, responseTime, ipAddress, userAgent, null, null);
      
      return new Response(JSON.stringify({ 
        vehicle_id: vehicleId,
        period: { start: startDate, end: endDate },
        blocked_dates: blockedDates,
        external_syncs: externalBlocks?.length || 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: POST /v1/reservations
    if (req.method === 'POST' && pathParts[0] === 'v1' && pathParts[1] === 'reservations') {
      const body = await req.json();
      const { vehicle_id, start_date, end_date, renter_name, renter_email, renter_phone, with_driver, notes } = body;
      
      if (!vehicle_id || !start_date || !end_date || !renter_email || !renter_phone) {
        return new Response(JSON.stringify({ error: 'Champs requis manquants: vehicle_id, start_date, end_date, renter_email, renter_phone' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Verify vehicle belongs to owner
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, daily_price, owner_id')
        .eq('id', vehicle_id)
        .eq('owner_id', keyData.owner_id)
        .single();
      
      if (vehicleError || !vehicle) {
        const responseTime = Date.now() - startTime;
        await logApiCall(keyData.id, keyData.owner_id, '/v1/reservations', 'POST', 404, responseTime, ipAddress, userAgent, body, 'Véhicule non trouvé');
        
        return new Response(JSON.stringify({ error: 'Véhicule non trouvé' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Check availability
      const { data: existingRes } = await supabase
        .from('reservations')
        .select('id')
        .eq('vehicle_id', vehicle_id)
        .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`)
        .in('status', ['confirmed', 'guaranteed', 'in_progress'])
        .limit(1);
      
      if (existingRes && existingRes.length > 0) {
        const responseTime = Date.now() - startTime;
        await logApiCall(keyData.id, keyData.owner_id, '/v1/reservations', 'POST', 409, responseTime, ipAddress, userAgent, body, 'Véhicule non disponible');
        
        return new Response(JSON.stringify({ error: 'Véhicule non disponible pour ces dates' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Calculate total
      const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = vehicle.daily_price * days;
      
      // Create reservation (pending confirmation)
      const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .insert({
          vehicle_id,
          owner_id: keyData.owner_id,
          renter_id: keyData.owner_id, // Placeholder, will be linked when renter confirms
          start_date,
          end_date,
          total_price: totalPrice,
          with_driver: with_driver || false,
          status: 'pending',
          source: 'api',
          renter_message: notes || null,
        })
        .select()
        .single();
      
      if (resError) throw resError;
      
      const responseTime = Date.now() - startTime;
      await logApiCall(keyData.id, keyData.owner_id, '/v1/reservations', 'POST', 201, responseTime, ipAddress, userAgent, body, null);
      
      return new Response(JSON.stringify({ 
        reservation: {
          id: reservation.id,
          vehicle_id: reservation.vehicle_id,
          start_date: reservation.start_date,
          end_date: reservation.end_date,
          total_price: reservation.total_price,
          status: reservation.status,
        },
        message: 'Réservation créée avec succès'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: GET /v1/stats
    if (req.method === 'GET' && pathParts[0] === 'v1' && pathParts[1] === 'stats') {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('owner_id', keyData.owner_id);
      
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, status, total_price')
        .eq('owner_id', keyData.owner_id);
      
      const stats = {
        total_vehicles: vehicles?.length || 0,
        total_reservations: reservations?.length || 0,
        completed_reservations: reservations?.filter(r => r.status === 'completed').length || 0,
        pending_reservations: reservations?.filter(r => r.status === 'pending').length || 0,
        total_revenue: reservations?.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.total_price || 0), 0) || 0,
      };
      
      const responseTime = Date.now() - startTime;
      await logApiCall(keyData.id, keyData.owner_id, '/v1/stats', 'GET', 200, responseTime, ipAddress, userAgent, null, null);
      
      return new Response(JSON.stringify({ stats }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 404 for unknown routes
    const responseTime = Date.now() - startTime;
    await logApiCall(keyData.id, keyData.owner_id, url.pathname, req.method, 404, responseTime, ipAddress, userAgent, null, 'Route non trouvée');
    
    return new Response(JSON.stringify({ error: 'Route non trouvée' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('API Error:', error);
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logApiCall(keyData.id, keyData.owner_id, url.pathname, req.method, 500, responseTime, ipAddress, userAgent, null, errorMessage);
    
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
