import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const kyc_document_accessRouter = Router();

// Supabase client factory
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.replace(/^postgresql:/, 'https:');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader?: string) {
  const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  return createClient(supabaseUrl!, supabaseKey!, options);
}

kyc_document_accessRouter.post('/', async (req: Request, res: Response) => {
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
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        
        // Create admin client for storage operations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        // Create user client to verify auth
        const authHeader = req.headers['Authorization'];
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "No authorization header" }),
            { status: 401 }
          );
        }
    
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });
    
        // Get current user
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
          console.error("Auth error:", userError);
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401 }
          );
        }
    
        const { renter_id, reservation_id } = req.body;
    
        if (!renter_id || !reservation_id) {
          return new Response(
            JSON.stringify({ error: "renter_id and reservation_id are required" }),
            { status: 400 }
          );
        }
    
        console.log(`KYC access request: user=${user.id}, renter=${renter_id}, reservation=${reservation_id}`);
    
        // Verify the requester is the owner of a valid reservation with this renter
        const { data: reservation, error: resError } = await supabaseAdmin
          .from("reservations")
          .select("id, owner_id, renter_id, start_date, end_date, status")
          .eq("id", reservation_id)
          .eq("owner_id", user.id)
          .eq("renter_id", renter_id)
          .single();
    
        if (resError || !reservation) {
          console.error("Reservation not found:", resError);
          return new Response(
            JSON.stringify({ error: "No active reservation found or access denied" }),
            { status: 403 }
          );
        }
    
        // Check reservation is in valid status
        const validStatuses = ["confirmed", "guaranteed"];
        if (!validStatuses.includes(reservation.status)) {
          return new Response(
            JSON.stringify({ error: "Reservation is not active" }),
            { status: 403 }
          );
        }
    
        // Calculate URL expiry: end_date + 24 hours from now, minimum 1 hour
        const endDate = new Date(reservation.end_date);
        endDate.setHours(23, 59, 59, 999); // End of day
        endDate.setDate(endDate.getDate() + 1); // Add 24 hours
        
        const now = new Date();
        let expirySeconds = Math.floor((endDate.getTime() - now.getTime()) / 1000);
        
        // Minimum 1 hour, maximum 30 days
        expirySeconds = Math.max(3600, Math.min(expirySeconds, 30 * 24 * 3600));
    
        console.log(`URL expiry calculated: ${expirySeconds} seconds (until ${endDate.toISOString()})`);
    
        // Get KYC documents for this renter
        const { data: documents, error: docError } = await supabaseAdmin
          .from("kyc_documents")
          .select("*")
          .eq("user_id", renter_id);
    
        if (docError) {
          console.error("Error fetching documents:", docError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch documents" }),
            { status: 500 }
          );
        }
    
        if (!documents || documents.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              documents: [],
              message: "No KYC documents found for this renter" 
            }),
            { status: 200 }
          );
        }
    
        // Generate signed URLs for each document
        const documentsWithUrls = await Promise.all(
          documents.map(async (doc) => {
            const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
              .from("kyc-documents")
              .createSignedUrl(doc.file_path, expirySeconds);
    
            if (signError) {
              console.error(`Error signing URL for ${doc.file_path}:`, signError);
              return { ...doc, signed_url: null, error: signError.message };
            }
    
            return { 
              ...doc, 
              signed_url: signedUrlData.signedUrl,
              expires_at: new Date(now.getTime() + expirySeconds * 1000).toISOString()
            };
          })
        );
    
        // Log access for audit
        for (const doc of documents) {
          await supabaseAdmin
            .from("kyc_access_logs")
            .insert({
              document_id: doc.id,
              accessed_by: user.id,
              reservation_id: reservation_id,
              access_type: "view",
            });
        }
    
        console.log(`KYC access granted: ${documents.length} documents, expires in ${expirySeconds}s`);
    
        return new Response(
          JSON.stringify({
            success: true,
            documents: documentsWithUrls,
            reservation: {
              id: reservation.id,
              start_date: reservation.start_date,
              end_date: reservation.end_date,
              status: reservation.status
            },
            access_expires_at: endDate.toISOString()
          }),
          { status: 200 }
        );
  } catch (error) {
    console.error('[kyc_document_access] Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      route: 'kyc-document-access'
    });
  }
});
