import { createClient } from "@supabase/supabase-js";
import { extractAuthToken } from "../../../lib/auth.js";
import { hasPermission, requirePermission, SPECIAL_PERMISSIONS } from "../../../lib/auth/permissions.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extract and verify token
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = JSON.parse(atob(token.split('.')[1]));
    console.log("DEBUG: Decoded token:", decoded);
    console.log("DEBUG: User role:", decoded.role);
    console.log("DEBUG: Requested role change:", req.body.role);
    
    // Company login tokens don't have role field - treat as owner
    const userRole = decoded.role || (decoded.companyId ? 'owner' : null);
    console.log("DEBUG: Effective user role:", userRole);
    
    // Check if user has permission to manage staff
    try {
      requirePermission(userRole, 'manage_staff');
      console.log("DEBUG: Permission check passed");
    } catch (permError) {
      console.log("DEBUG: Permission check failed:", permError.message);
      return res.status(403).json({ error: permError.message });
    }
    
    // Get request body
    const { role } = req.body;
    
    if (!role || !['owner', 'admin', 'editor', 'member'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Special permission: Only owner can assign owner role
    if (role === 'owner' && userRole !== 'owner') {
      return res.status(403).json({ error: "Only owner can assign owner role" });
    }

    console.log("DEBUG: Updating staff member:", id, "to role:", role);

    // Update staff member role
    const { data: staffMember, error: updateError } = await supabase
      .from("restaurant_staff")
      .update({ role })
      .eq("id", id)
      .eq("company_id", decoded.companyId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating staff role:", updateError);
      return res.status(500).json({ error: "Failed to update role", details: updateError.message });
    }

    if (!staffMember) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    console.log("DEBUG: Role update successful:", staffMember);

    return res.status(200).json({
      message: "Role updated successfully",
      staff: staffMember
    });

  } catch (error) {
    console.error("Staff role update error:", error);
    
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ error: "Internal server error" });
  }
}
