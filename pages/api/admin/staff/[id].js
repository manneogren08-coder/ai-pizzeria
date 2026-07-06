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
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id: staffId } = req.query;
    const { role } = req.body;

    if (!staffId) {
      return res.status(400).json({ error: "Staff ID är obligatoriskt" });
    }

    if (!role || typeof role !== "string") {
      return res.status(400).json({ error: "Roll är obligatoriskt" });
    }

    // Validate that role is one of the predefined roles
    // Note: These must match the database constraint "restaurant_staff_role_check"
    const validRoles = [
      "owner",
      "admin", 
      "editor",
      "member"
    ];

    if (!validRoles.includes(role.trim())) {
      return res.status(400).json({ 
        error: "Ogiltig roll",
        details: `Giltiga roller är: ${validRoles.join(", ")}`
      });
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

    // Check permissions - only owner can update staff roles
    if (userRole !== 'owner') {
      return res.status(403).json({ error: "Endast owners kan uppdatera roller" });
    }

    // Check if staff exists and belongs to the same company
    const { data: staffToUpdate, error: fetchError } = await supabaseAdmin
      .from("restaurant_staff")
      .select("id, email, name, company_id, role")
      .eq("id", staffId)
      .single();

    if (fetchError) {
      console.error("Error fetching staff to update:", fetchError);
      return res.status(500).json({ error: "Kunde inte hitta personal", details: fetchError.message });
    }

    if (!staffToUpdate) {
      return res.status(404).json({ error: "Personal hittades inte" });
    }

    // Verify staff belongs to the same company as the requester
    if (staffToUpdate.company_id !== decoded.companyId) {
      return res.status(403).json({ error: "Du kan bara uppdatera personal från ditt eget företag" });
    }

    // Update staff member role
    console.log("DEBUG: Attempting to update staff role:", { staffId, role: role.trim(), originalRole: staffToUpdate.role });
    
    const { data: updatedStaff, error: updateError } = await supabaseAdmin
      .from("restaurant_staff")
      .update({ 
        role: role.trim()
      })
      .eq("id", staffId)
      .select()
      .single();

    console.log("DEBUG: Update result:", { updatedStaff, updateError });

    if (updateError) {
      console.error("Error updating staff role:", updateError);
      console.error("DEBUG: Update error details:", { 
        staffId, 
        role, 
        updateError: updateError.message,
        updateErrorCode: updateError.code,
        updateErrorDetails: updateError.details
      });
      return res.status(500).json({ 
        error: "Kunde inte uppdatera roll", 
        details: updateError.message 
      });
    }

    console.log(`Staff member ${updatedStaff.email} role updated to '${role}' by ${decoded.employeeEmail || 'company login'}`);

    res.status(200).json({ 
      message: "Roll uppdaterad",
      updatedStaff: {
        id: updatedStaff.id,
        email: updatedStaff.email,
        name: updatedStaff.name,
        role: updatedStaff.role
      }
    });

  } catch (error) {
    console.error("Update staff role error:", error);
    res.status(500).json({ 
      error: "Serverfel", 
      details: error.message 
    });
  }
}
