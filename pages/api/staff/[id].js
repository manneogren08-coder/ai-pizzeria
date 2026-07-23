import jwt from "jsonwebtoken";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";
import { requirePermission } from "../../../lib/auth/permissions.js";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
    }

    // Extract and verify token
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Resolve the acting user's real role. Company-login tokens carry a
    // companyId but no employeeEmail and are always the owner. Employee
    // tokens carry both companyId and employeeEmail - their role must be
    // looked up from restaurant_staff, never assumed from the token.
    let userRole = decoded.role;
    if (!userRole) {
      if (decoded.companyId && !decoded.employeeEmail) {
        userRole = 'owner';
      } else {
        const { data: staff } = await supabase
          .from("restaurant_staff")
          .select("role")
          .eq("email", decoded.employeeEmail)
          .eq("company_id", decoded.companyId)
          .maybeSingle();

        userRole = staff?.role || 'member';
      }
    }

    // Check if user has permission to manage staff
    try {
      requirePermission(userRole, 'manage_staff');
    } catch (permError) {
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

    return res.status(200).json({
      message: "Role updated successfully",
      staff: staffMember
    });

  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Ogiltig eller utgången session. Logga in igen." });
    }

    console.error("Staff role update error:", error);

    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}
