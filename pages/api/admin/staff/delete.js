import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { extractAuthToken } from "../../../../lib/auth.js";
import { hasPermission, requirePermission } from "../../../../lib/auth/permissions.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { staffId } = req.query;

    if (!staffId) {
      return res.status(400).json({ error: "Staff ID är obligatoriskt" });
    }

    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Ingen token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: "Ogiltig token" });
    }

    // Get user role
    let userRole = decoded.role;
    
    // Company login tokens don't have role field - treat as owner
    if (!userRole) {
      if (decoded.companyId && !decoded.employeeEmail) {
        userRole = 'owner';
      } else {
        // This is a staff login - get role from database
        const { data: staff } = await supabaseAdmin
          .from("restaurant_staff")
          .select("role")
          .eq("email", decoded.employeeEmail)
          .eq("company_id", decoded.companyId)
          .maybeSingle();
        
        userRole = staff?.role || 'member';
      }
    }

    // Check permissions - only owner can delete staff
    if (userRole !== 'owner') {
      return res.status(403).json({ error: "Endast owners kan ta bort personal" });
    }

    // Check if staff exists and belongs to the same company
    const { data: staffToDelete, error: fetchError } = await supabaseAdmin
      .from("restaurant_staff")
      .select("id, email, name, company_id")
      .eq("id", staffId)
      .single();

    if (fetchError) {
      console.error("Error fetching staff to delete:", fetchError);
      return res.status(500).json({ error: "Kunde inte hitta personal", details: fetchError.message });
    }

    if (!staffToDelete) {
      return res.status(404).json({ error: "Personal hittades inte" });
    }

    // Verify staff belongs to the same company as the requester
    if (staffToDelete.company_id !== decoded.companyId) {
      return res.status(403).json({ error: "Du kan bara ta bort personal från ditt eget företag" });
    }

    // Delete the staff member
    const { error: deleteError } = await supabaseAdmin
      .from("restaurant_staff")
      .delete()
      .eq("id", staffId);

    if (deleteError) {
      console.error("Error deleting staff:", deleteError);
      return res.status(500).json({ error: "Kunde inte ta bort personal", details: deleteError.message });
    }

    console.log(`Staff member ${staffToDelete.email} deleted by ${decoded.employeeEmail || 'company login'}`);

    res.status(200).json({ 
      message: "Personal borttagen",
      deletedStaff: {
        id: staffToDelete.id,
        email: staffToDelete.email,
        name: staffToDelete.name
      }
    });

  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({ 
      error: "Serverfel", 
      details: error.message 
    });
  }
}
