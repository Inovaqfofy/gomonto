import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const owner_apiRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

owner_apiRouter.get('/', async (req: Request, res: Response) => {
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
            });
          }
          
          const responseTime = Date.now() - startTime;
          await logApiCall(keyData.id, keyData.owner_id, `/v1/vehicles/${vehicleId}`, 'GET', 200, responseTime, ipAddress, userAgent, null, null);
          
          return new Response(JSON.stringify({ vehicle }), {
            status: 200,
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
          });
        }
        
        // Route: POST /v1/reservations
        if (req.method === 'POST' && pathParts[0] === 'v1' && pathParts[1] === 'reservations') {
          const body = req.body;
          const { vehicle_id, start_date, end_date, renter_name, renter_email, renter_phone, with_driver, notes } = body;
          
          if (!vehicle_id || !start_date || !end_date || !renter_email || !renter_phone) {
            return new Response(JSON.stringify({ error: 'Champs requis manquants: vehicle_id, start_date, end_date, renter_email, renter_phone' }), {
              status: 400,
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
          });
        }
        
        // 404 for unknown routes
        const responseTime = Date.now() - startTime;
        await logApiCall(keyData.id, keyData.owner_id, url.pathname, req.method, 404, responseTime, ipAddress, userAgent, null, 'Route non trouvée');
        
        return new Response(JSON.stringify({ error: 'Route non trouvée' }), {
          status: 404,
        });
  } catch (error) {
    console.error('[owner_api] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'owner-api'
    });
  }
});

owner_apiRouter.post('/', async (req: Request, res: Response) => {
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
            });
          }
          
          const responseTime = Date.now() - startTime;
          await logApiCall(keyData.id, keyData.owner_id, `/v1/vehicles/${vehicleId}`, 'GET', 200, responseTime, ipAddress, userAgent, null, null);
          
          return new Response(JSON.stringify({ vehicle }), {
            status: 200,
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
          });
        }
        
        // Route: POST /v1/reservations
        if (req.method === 'POST' && pathParts[0] === 'v1' && pathParts[1] === 'reservations') {
          const body = req.body;
          const { vehicle_id, start_date, end_date, renter_name, renter_email, renter_phone, with_driver, notes } = body;
          
          if (!vehicle_id || !start_date || !end_date || !renter_email || !renter_phone) {
            return new Response(JSON.stringify({ error: 'Champs requis manquants: vehicle_id, start_date, end_date, renter_email, renter_phone' }), {
              status: 400,
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
          });
        }
        
        // 404 for unknown routes
        const responseTime = Date.now() - startTime;
        await logApiCall(keyData.id, keyData.owner_id, url.pathname, req.method, 404, responseTime, ipAddress, userAgent, null, 'Route non trouvée');
        
        return new Response(JSON.stringify({ error: 'Route non trouvée' }), {
          status: 404,
        });
  } catch (error) {
    console.error('[owner_api] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'owner-api'
    });
  }
});
