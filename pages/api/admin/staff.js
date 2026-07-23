import jwt from 'jsonwebtoken';
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
    }

    const token = extractAuthToken(req);
    
    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Check user role and permissions
    let userRole = decoded.role;
    
    // Company login tokens don't have role field - treat as owner
    if (!userRole) {
      if (decoded.type === "company") {
        userRole = 'owner';
      } else {
        // This is a staff login - get role from database
        const { data: staff } = await supabase
          .from("restaurant_staff")
          .select("role")
          .eq("email", decoded.employeeEmail)
          .eq("company_id", companyId)
          .maybeSingle();
        
        userRole = staff?.role || 'member';
      }
    }

    // Check permissions - only owner and admin can view staff list
    if (!['owner', 'Admin', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: "Du har inte behörighet att se personal" });
    }

  if (req.method === "GET") {
      try {
        const { data: staff, error: staffError } = await supabase
          .from("restaurant_staff")
          .select("id, name, email, role, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (staffError) {
          console.error("Staff fetch error:", staffError);
          return res.status(500).json({ error: "Kunde inte hämta personal" });
        }

        res.status(200).json({ staff: staff || [] });
      } catch (err) {
        console.error("Staff GET error:", err);
        res.status(500).json({ error: "Serverfel" });
      }
    } else if (req.method === "POST") {
      try {
        const { email, name, role = 'member' } = req.body;

        if (!email || !email.includes("@")) {
          return res.status(400).json({ error: "Ange en giltig e-postadress" });
        }

        // Validate role
        const validRoles = ['owner', 'admin', 'editor', 'member'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ error: "Ogiltig roll" });
        }

        // Only an existing owner can grant the owner role to someone new
        if (role === 'owner' && userRole !== 'owner') {
          return res.status(403).json({ error: "Endast owners kan tilldela owner-rollen" });
        }

        // Check if staff member already exists
        const { data: existingStaff, error: checkError } = await supabase
          .from("restaurant_staff")
          .select("id")
          .eq("company_id", companyId)
          .eq("email", email.toLowerCase())
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Staff check error:", checkError);
          return res.status(500).json({ error: "Kunde inte kontrollera personal" });
        }

        if (existingStaff) {
          return res.status(409).json({ error: "Denna e-postadress är redan registrerad" });
        }

        // Add new staff member
        const { data: newStaff, error: insertError } = await supabase
          .from("restaurant_staff")
          .insert({
            company_id: companyId,
            email: email.toLowerCase(),
            name: name || null,
            role: role
          })
          .select()
          .single();

        if (insertError) {
          console.error("Staff insert error:", insertError);
          return res.status(500).json({ error: "Kunde inte lägga till personal" });
        }

        res.status(201).json({ staff: newStaff });
      } catch (err) {
        console.error("Staff POST error:", err);
        res.status(500).json({ error: "Serverfel" });
      }
    } else if (req.method === "DELETE") {
      try {
        // Only owners can remove staff
        if (userRole !== 'owner') {
          return res.status(403).json({ error: "Endast owners kan ta bort personal" });
        }

        const staffId = req.query.id;

        if (!staffId) {
          return res.status(400).json({ error: "Missing staff ID" });
        }

        // Verify staff belongs to this company
        const { data: staff, error: staffError } = await supabase
          .from("restaurant_staff")
          .select("id")
          .eq("id", staffId)
          .eq("company_id", companyId)
          .single();

        if (staffError || !staff) {
          return res.status(404).json({ error: "Personal hittades inte" });
        }

        // Delete staff member
        const { error: deleteError } = await supabase
          .from("restaurant_staff")
          .delete()
          .eq("id", staffId);

        if (deleteError) {
          console.error("Staff delete error:", deleteError);
          return res.status(500).json({ error: "Kunde inte ta bort personal" });
        }

        res.status(200).json({ success: true });
      } catch (err) {
        console.error("Staff DELETE error:", err);
        res.status(500).json({ error: "Serverfel" });
      }
    } else if (req.method === "PUT") {
      try {
        const { id: staffId, role } = req.body;

        if (!staffId) {
          return res.status(400).json({ error: "Missing staff ID" });
        }

        if (!role) {
          return res.status(400).json({ error: "Missing role" });
        }

        // Validate role
        const validRoles = ['owner', 'admin', 'editor', 'member'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ error: "Ogiltig roll" });
        }

        // Only an existing owner can promote someone else to owner
        if (role === 'owner' && userRole !== 'owner') {
          return res.status(403).json({ error: "Endast owners kan tilldela owner-rollen" });
        }

        // Verify staff belongs to this company
        const { data: staff, error: staffError } = await supabase
          .from("restaurant_staff")
          .select("id, role")
          .eq("id", staffId)
          .eq("company_id", companyId)
          .single();

        if (staffError || !staff) {
          return res.status(404).json({ error: "Personal hittades inte" });
        }

        // Prevent removing the last owner
        if (staff.role === 'owner' && role !== 'owner') {
          const { data: ownerCount } = await supabase
            .from("restaurant_staff")
            .select("id", { count: 'exact' })
            .eq("company_id", companyId)
            .eq("role", "owner");

          if (ownerCount && ownerCount.length <= 1) {
            return res.status(400).json({ error: "Kan inte ta bort den sista owner-rollen" });
          }
        }

        // Update staff role
        const { data: updatedStaff, error: updateError } = await supabase
          .from("restaurant_staff")
          .update({ role })
          .eq("id", staffId)
          .select()
          .single();

        if (updateError) {
          console.error("Staff update error:", updateError);
          return res.status(500).json({ error: "Kunde inte uppdatera roll" });
        }

        res.status(200).json({ staff: updatedStaff });
      } catch (err) {
        console.error("Staff PUT error:", err);
        res.status(500).json({ error: "Serverfel" });
      }
    }
  } catch (err) {
    console.error("Staff API error:", err);
    res.status(500).json({ error: "Serverfel" });
  }
}
