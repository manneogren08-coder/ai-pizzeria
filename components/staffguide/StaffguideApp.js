import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { canAccessPrep, canViewPrep, canEditPrep, canAccessAdminTab, getRoleDescription } from "../../lib/roles.js";
import ThemeToggle from "../../lib/theme/ThemeToggle";
import { clearSession } from "../../lib/staffguide/session";

// Statistik-fliken är tillfälligt dold i UI:t tills vyn innehåller mer
// användbar information. All backend-logik, API:er och data lever kvar -
// sätt STATS_TAB_ENABLED till true för att visa fliken igen.
const STATS_TAB_ENABLED = false;
const ADMIN_TABS = ["info", "menu", "recipes", "routines", "prep", "staff", "security", "stats"].filter(
  (tab) => STATS_TAB_ENABLED || tab !== "stats"
);

function getTodayDateString() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function getSingleQueryParam(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return typeof value === "string" ? value : "";
}

function isValidAdminTab(tab) {
  return ADMIN_TABS.includes(tab);
}

function getPriorityMeta(priority) {
  const normalized = String(priority || "medium").toLowerCase();
  if (normalized === "high") {
    return { key: "high", label: "Hög", style: styles.prepPriorityHigh };
  }
  if (normalized === "low") {
    return { key: "low", label: "Låg", style: styles.prepPriorityLow };
  }
  return { key: "medium", label: "Medel", style: styles.prepPriorityMedium };
}

function dueTimeSortValue(dueTime) {
  const value = String(dueTime || "").trim();
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return hours * 60 + minutes;
}

function normalizeTemplatePriority(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["high", "hög", "hög", "h"].includes(normalized)) return "high";
  if (["low", "låg", "låg", "l"].includes(normalized)) return "low";
  return "medium";
}

function normalizeTemplateDueTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return "";

  const hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function emptyPrepTemplateRow() {
  return {
    title: "",
    priority: "medium",
    station: "",
    due_time: "",
    assigned_to: ""
  };
}

function parsePrepTemplateText(templateText) {
  const lines = String(templateText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*⬢]\s*/, ""));

  const rows = lines
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        title: parts[0] || "",
        priority: normalizeTemplatePriority(parts[1]),
        station: String(parts[2] || "").trim(),
        due_time: normalizeTemplateDueTime(parts[3]),
        assigned_to: String(parts[4] || "").trim()
      };
    })
    .filter((row) => row.title);

  return rows.length > 0 ? rows : [emptyPrepTemplateRow()];
}

function serializePrepTemplateRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      title: String(row?.title || "").trim(),
      priority: normalizeTemplatePriority(row?.priority),
      station: String(row?.station || "").trim(),
      due_time: normalizeTemplateDueTime(row?.due_time),
      assigned_to: String(row?.assigned_to || "").trim()
    }))
    .filter((row) => row.title)
    .map((row) => [row.title, row.priority, row.station, row.due_time, row.assigned_to].join(" | "))
    .join("\n");
}

let recipeRowIdSeed = 1;

function nextRecipeRowId() {
  recipeRowIdSeed += 1;
  return `recipe-${recipeRowIdSeed}`;
}

function emptyRecipeRow(overrides = {}) {
  return {
    id: nextRecipeRowId(),
    dish_name: "",
    category: "",
    is_active: true,
    ingredients: "",
    yield: "",
    mise: "",
    cooking: "",
    plating: "",
    allergens: "",
    time: "",
    ...overrides
  };
}

function parseRecipeSection(block, label) {
  const labels = ["Kategori", "Aktiv", "Ingredienser", "Yield", "Mise en place", "Tillagning", "Plating", "Allergener", "Tid"];
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)${escaped}:\\s*([\\s\\S]*?)(?=\\n(?:${labels.join("|")}):|$)`, "i");
  const match = block.match(pattern);
  return match?.[1]?.trim() || "";
}

function parseRecipeActive(block) {
  const raw = parseRecipeSection(block, "Aktiv").toLowerCase();
  if (!raw) return true;
  if (["nej", "false", "0", "inaktiv", "no"].includes(raw)) return false;
  return true;
}

function parseRecipesText(recipesText) {
  const text = String(recipesText || "").trim();
  if (!text) {
    return [emptyRecipeRow()];
  }

  const hasStructuredHeadings = /(^|\n)###\s+/m.test(text);
  if (!hasStructuredHeadings) {
    return [emptyRecipeRow({ dish_name: "Rätt 1", cooking: text })];
  }

  const blocks = text
    .split(/\n(?=###\s+)/)
    .map((block) => block.trim())
    .filter(Boolean);

  const rows = blocks.map((block) => {
    const dishMatch = block.match(/^###\s*(.+)$/m);
    const dishName = dishMatch?.[1]?.trim() || "";
    return emptyRecipeRow({
      dish_name: dishName,
      category: parseRecipeSection(block, "Kategori"),
      is_active: parseRecipeActive(block),
      ingredients: parseRecipeSection(block, "Ingredienser"),
      yield: parseRecipeSection(block, "Yield"),
      mise: parseRecipeSection(block, "Mise en place"),
      cooking: parseRecipeSection(block, "Tillagning"),
      plating: parseRecipeSection(block, "Plating"),
      allergens: parseRecipeSection(block, "Allergener"),
      time: parseRecipeSection(block, "Tid")
    });
  }).filter((row) => row.dish_name || row.category || row.ingredients || row.yield || row.mise || row.cooking || row.plating || row.allergens || row.time);

  return rows.length > 0 ? rows : [emptyRecipeRow({ dish_name: "Rätt 1", cooking: text })];
}

function serializeRecipesRows(rows) {
  const safeRows = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      dish_name: String(row?.dish_name || "").trim(),
      category: String(row?.category || "").trim(),
      is_active: row?.is_active !== false,
      ingredients: String(row?.ingredients || "").trim(),
      yield: String(row?.yield || "").trim(),
      mise: String(row?.mise || "").trim(),
      cooking: String(row?.cooking || "").trim(),
      plating: String(row?.plating || "").trim(),
      allergens: String(row?.allergens || "").trim(),
      time: String(row?.time || "").trim()
    }))
    .filter((row) => row.dish_name || row.category || row.ingredients || row.yield || row.mise || row.cooking || row.plating || row.allergens || row.time);

  return safeRows
    .map((row) => {
      const dishName = row.dish_name || "Namnlös rätt";
      return [
        `### ${dishName}`,
        "Kategori:",
        row.category,
        "",
        "Aktiv:",
        row.is_active ? "ja" : "nej",
        "",
        "Ingredienser:",
        row.ingredients,
        "",
        "Yield:",
        row.yield,
        "",
        "Mise en place:",
        row.mise,
        "",
        "Tillagning:",
        row.cooking,
        "",
        "Plating:",
        row.plating,
        "",
        "Allergener:",
        row.allergens,
        "",
        "Tid:",
        row.time
      ].join("\n").trim();
    })
    .join("\n\n");
}

export default function StaffguideApp({ initialToken, initialCompany, initialUserRole }) {
  const router = useRouter();
  const emptyDetails = {
    support_email: "",
    opening_hours: "",
    closure_info: "",
    menu: "",
    recipes: "",
    allergens: "",
    routines: "",
    opening_routine: "",
    closing_routine: "",
    behavior_guidelines: "",
    staff_roles: "",
    staff_situations: ""
  };

  const tabFieldMap = {
    info: ["support_email", "opening_hours", "closure_info"],
    menu: ["menu", "allergens"],
    recipes: ["recipes"],
    routines: ["routines", "opening_routine", "closing_routine", "behavior_guidelines", "staff_roles", "staff_situations"]
  };

  const quickQuestions = [
    { key: "menu", label: "Visa hela menyn", prompt: "Visa hela menyn inklusive priser och eventuella tillval." },
    { key: "allergens", label: "Vilka allergener finns?", prompt: "Lista alla allergener i menyn och nämn vilka alternativ som finns." },
    { key: "opening_hours", label: "Vad är öppettiderna?", prompt: "Vad är öppettiderna idag och i veckan?" },
    { key: "opening_routine", label: "Vad är öppningsrutinen?", prompt: "Beskriv öppningsrutinen steg för steg." }
  ];

  // Never updated after mount - the token is set once from the
  // dashboard page's restoreSession() and this app doesn't refresh it
  // (matches original behavior: login flow that could set a new token
  // now lives entirely in StaffguideLogin.js, outside this component).
  const [token] = useState(initialToken);
  const [company, setCompany] = useState(initialCompany);
  const [userRole, setUserRole] = useState(initialUserRole);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [adminTab, setAdminTab] = useState("info");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [adminPasswordPrompt, setAdminPasswordPrompt] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminPanelCurrentPassword, setAdminPanelCurrentPassword] = useState("");
  const [adminPanelNewPassword, setAdminPanelNewPassword] = useState("");
  const [adminPanelConfirmPassword, setAdminPanelConfirmPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(emptyDetails);
  const [savedCompanyDetails, setSavedCompanyDetails] = useState(emptyDetails);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [toast, setToast] = useState({ text: "", type: "success", visible: false });
  const [prepDate, setPrepDate] = useState(getTodayDateString());
  const [prepTasks, setPrepTasks] = useState([]);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState("");
  const [prepTemplateRows, setPrepTemplateRows] = useState([emptyPrepTemplateRow()]);
  const [savedPrepTemplateRows, setSavedPrepTemplateRows] = useState([emptyPrepTemplateRow()]);
  const [prepTemplateLoading, setPrepTemplateLoading] = useState(false);
  const [prepBulkUpdating, setPrepBulkUpdating] = useState(false);
  const [prepOnlyOpen, setPrepOnlyOpen] = useState(false);
  const [prepStationFilter, setPrepStationFilter] = useState("all");
  const [showMyPrepTasks, setShowMyPrepTasks] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("member");
  const [recipeRows, setRecipeRows] = useState([emptyRecipeRow()]);
  const [savedRecipeRows, setSavedRecipeRows] = useState([emptyRecipeRow()]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const chatAreaRef = useRef(null);
  const toastTimerRef = useRef(null);
  const skipNextAdminRoutePromptRef = useRef(false);
  const tokenRef = useRef(initialToken || "");
  const activeAskAbortRef = useRef(null);

  const syncAdminRoute = useCallback((nextShowAdmin, nextTab = "info") => {
    if (!router.isReady) return;

    const nextQuery = { ...router.query };
    if (nextShowAdmin) {
      nextQuery.view = "admin";
      nextQuery.tab = isValidAdminTab(nextTab) ? nextTab : "info";
    } else {
      delete nextQuery.view;
      delete nextQuery.tab;
    }

    void router.replace(
      {
        pathname: router.pathname,
        query: nextQuery
      },
      undefined,
      { shallow: true }
    );
  }, [router]);

  const logout = useCallback(() => {
    // Clear all user data
    setCompany(null);
    setUserRole(null);
    setChat([]);

    // Clear all admin-related states to prevent access after logout
    setShowAdmin(false);
    setAdminPasswordPrompt(false);
    setAdminPassword("");
    setAdminTab("info");

    // Clear localStorage
    clearSession();

    // Clear the HttpOnly auth cookie server-side too, so this is a real
    // logout rather than just a local UI reset. Best-effort: local state
    // above is already cleared regardless of whether this succeeds.
    fetch("/api/logout", { method: "POST" }).catch(() => {});

    // No more marketing-page fallback to show once `company` is cleared
    // (that branch moved out of this file during the /staffguide route
    // split) - navigate away explicitly instead.
    router.replace("/staffguide/login");
  }, [router]);

  const showToast = (text, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ text, type, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2600);
  };

  const isTabDirty = (tab) => {
    const fields = tabFieldMap[tab] || [];
    return fields.some(field => (companyDetails[field] || "") !== (savedCompanyDetails[field] || ""));
  };

  const resetCurrentTab = () => {
    const fields = tabFieldMap[adminTab] || [];
    if (fields.length === 0) {
      return;
    }

    const nextDetails = { ...companyDetails };
    fields.forEach((field) => {
      nextDetails[field] = savedCompanyDetails[field] || "";
    });
    setCompanyDetails(nextDetails);
    if (adminTab === "recipes") {
      const restoredRows = savedRecipeRows.length > 0 ? savedRecipeRows : parseRecipesText(savedCompanyDetails.recipes || "");
      setRecipeRows(restoredRows);
      setSelectedRecipeId(restoredRows[0]?.id || "");
    }
    showToast("Ändringar återställda", "info");
  };

  const formatAiAnswer = (answer) => {
    if (typeof answer !== "string") return "";
    const trimmed = answer.trim();
    if (trimmed.length < 520 || trimmed.includes("\n\n") || trimmed.includes("**")) {
      return trimmed;
    }

    const lower = trimmed.toLowerCase();
    if (!/(meny|allergen|rutin|öppettid|kontakt)/i.test(lower)) {
      return trimmed;
    }

    const chunks = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    if (chunks.length < 6) {
      return trimmed;
    }

    const sectionSize = Math.ceil(chunks.length / 3);
    const sections = [
      { title: "Meny", body: chunks.slice(0, sectionSize) },
      { title: "Rutiner", body: chunks.slice(sectionSize, sectionSize * 2) },
      { title: "Kontakt", body: chunks.slice(sectionSize * 2) }
    ];

    return sections
      .filter(section => section.body.length)
      .map(section => `${section.title}:\n${section.body.join(" ").trim()}`)
      .join("\n\n");
  };

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const renderAiTextWithClickableMenuItems = (msg, msgIndex) => {
    const text = typeof msg?.text === "string" ? msg.text : "";
    const menuItems = Array.isArray(msg?.menuItems)
      ? [...new Set(msg.menuItems.map((item) => String(item || "").trim()).filter(Boolean))]
      : [];

    if (!text || menuItems.length === 0) {
      return text;
    }

    const sortedItems = [...menuItems].sort((a, b) => b.length - a.length);
    const itemRegex = new RegExp(`(${sortedItems.map(escapeRegExp).join("|")})`, "gi");
    const parts = text.split(itemRegex);

    return parts.map((part, partIndex) => {
      const matchingItem = sortedItems.find((item) => item.toLowerCase() === part.toLowerCase());

      if (!matchingItem) {
        return (
          <span key={`msg-${msgIndex}-text-${partIndex}`} style={styles.menuInlineText}>
            {part}
          </span>
        );
      }

      return (
        <button
          key={`msg-${msgIndex}-menu-${matchingItem}-${partIndex}`}
          type="button"
          style={styles.menuInlineItemButton}
          className="menuInlineItem"
          onClick={() => askAI(`Vad är receptet för ${matchingItem}?`)}
          disabled={loading}
        >
          {part}
        </button>
      );
    });
  };

  const fetchCompanyDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/get-details", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.details) {
        setCompanyDetails(data.details);
        setSavedCompanyDetails(data.details);
        const parsedRecipeRows = parseRecipesText(data.details.recipes || "");
        setRecipeRows(parsedRecipeRows);
        setSavedRecipeRows(parsedRecipeRows);
        setSelectedRecipeId(parsedRecipeRows[0]?.id || "");
      }
    } catch (err) {
      console.error("Failed to fetch details:", err);
    }
  }, [token]);

  const fetchPrepTemplate = useCallback(async () => {
    if (!token) return;

    setPrepTemplateLoading(true);
    try {
      const res = await fetch("/api/admin/prep-template", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data?.error || "Kunde inte hämta prep-mall", "error");
        return;
      }

      const templateText = typeof data?.template === "string" ? data.template : "";
      const parsedRows = parsePrepTemplateText(templateText);
      setPrepTemplateRows(parsedRows);
      setSavedPrepTemplateRows(parsedRows);
    } catch {
      showToast("Kunde inte hämta prep-mall", "error");
    } finally {
      setPrepTemplateLoading(false);
    }
  }, [token]);

  const fetchPrepTasks = useCallback(async (targetDate) => {
    // Use tokenRef so this callback never has a stale token closure
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    const requestedDate = typeof targetDate === "string" ? targetDate : getTodayDateString();

    setPrepLoading(true);
    setPrepError("");

    try {
      const res = await fetch(`/api/prep/day?date=${encodeURIComponent(requestedDate)}`, {
        headers: {
          "Authorization": `Bearer ${currentToken}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setPrepError(data?.error || "Kunde inte hämta dagens prep.");
        setPrepTasks([]);
        setPrepLoading(false);
        return;
      }

      setPrepDate(data?.prepDate || requestedDate);

      // Extract tasks correctly from API response
      const tasks = data.tasks || [];

      setPrepTasks(tasks);
    } catch (err) {
      setPrepError("Kunde inte hämta dagens prep.");
      setPrepTasks([]);
    } finally {
      setPrepLoading(false);
    }
  }, []); // stable – reads token via tokenRef, never goes stale

  const savePrepTemplate = async () => {
    if (!token || prepTemplateLoading) return;

    const serializedTemplate = serializePrepTemplateRows(prepTemplateRows);

    setPrepTemplateLoading(true);
    try {
      const res = await fetch("/api/admin/prep-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          template: serializedTemplate,
          publishToday: true,
          prepDate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.error || "Kunde inte spara prep-mall", "error");
        setPrepTemplateLoading(false);
        return;
      }

      const nextTemplate = typeof data?.template === "string" ? data.template : serializedTemplate;
      const parsedRows = parsePrepTemplateText(nextTemplate);
      setPrepTemplateRows(parsedRows);
      setSavedPrepTemplateRows(parsedRows);
      void fetchPrepTasks(prepDate);
      showToast("Prep-mall sparad", "success");
    } catch {
      showToast("Kunde inte spara prep-mall", "error");
    }

    setPrepTemplateLoading(false);
  };

  const assignPrepTask = async (taskId, assignedTo) => {
    if (!token) return;

    try {
      const res = await fetch("/api/prep/assign", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId, assignedTo })
      });

      if (res.ok) {
        // Update local state to reflect the change
        setPrepTasks(prev => prev.map(task =>
          task.id === taskId ? { ...task, assigned_to: assignedTo } : task
        ));
        showToast("Uppgift tilldelad", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Kunde inte uppdatera tilldelning", "error");
      }
    } catch (err) {
      showToast("Kunde inte uppdatera tilldelning", "error");
    }
  };

  const togglePrepTask = async (taskId, isDone) => {
    if (!token || prepLoading) return;

    setPrepTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, is_done: isDone } : task)));

    try {
      const res = await fetch("/api/prep/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ taskId, isDone })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Kunde inte uppdatera prep-uppgift");
      }
    } catch (err) {
      setPrepTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, is_done: !isDone } : task)));
      showToast(err?.message || "Kunde inte uppdatera prep-uppgift", "error");
    }
  };

  const setFilteredPrepTasksDone = async (isDone) => {
    if (!token || prepLoading || prepBulkUpdating) return;

    const targetTasks = prepTasks
      .filter((task) => {
        if (prepOnlyOpen && task.is_done) return false;
        if (prepStationFilter !== "all" && String(task.station || "").trim() !== prepStationFilter) return false;
        return true;
      })
      .filter((task) => Boolean(task.is_done) !== isDone);

    if (targetTasks.length === 0) {
      showToast(isDone ? "Alla synliga uppgifter är redan klara" : "Inga synliga uppgifter att återställa", "info");
      return;
    }

    const targetIds = new Set(targetTasks.map((task) => task.id));
    setPrepBulkUpdating(true);
    setPrepTasks((prev) => prev.map((task) => (targetIds.has(task.id) ? { ...task, is_done: isDone } : task)));

    const failedIds = [];

    const results = await Promise.allSettled(
      targetTasks.map(async (task) => {
        const res = await fetch("/api/prep/toggle", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ taskId: task.id, isDone })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Kunde inte uppdatera prep-uppgift");
        }
      })
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        failedIds.push(targetTasks[index].id);
      }
    });

    if (failedIds.length > 0) {
      const failedSet = new Set(failedIds);
      setPrepTasks((prev) => prev.map((task) => (failedSet.has(task.id) ? { ...task, is_done: !isDone } : task)));
      showToast("Vissa prep-uppgifter kunde inte uppdateras", "error");
    } else {
      showToast(isDone ? "Synliga uppgifter markerade som klara" : "Synliga uppgifter återställda", "success");
    }

    setPrepBulkUpdating(false);
  };

  // Keep tokenRef in sync so fetchPrepTasks never has a stale closure
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);


  // scroll when chat updates
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chat, loading]);

  useEffect(() => {
    if (showAdmin && (adminTab === "staff" || adminTab === "prep") && staffList.length === 0) {
      fetchStaffList();
    }
  }, [showAdmin, adminTab, staffList.length]);

  useEffect(() => {
    // Also fetch staff list when prep view is opened
    if (showPrep && token && staffList.length === 0) {
      fetchStaffList();
    }
  }, [showPrep, token, staffList.length]);

  // Role-based admin access control - prevents admin panel from showing for non-admin users.
  // Uses the acting user's own role (owner/admin), not the company-wide is_admin flag,
  // which is never set for newly created companies and would wrongly lock owners out.
  useEffect(() => {
    if (company && token) {
      try {
        // Check if current user should have admin access
        const shouldHaveAdminAccess = ['owner', 'admin'].includes(company.role);

        // If admin panel is showing but user shouldn't have access, hide it
        if (showAdmin && !shouldHaveAdminAccess) {
          setShowAdmin(false);
          setAdminPasswordPrompt(false);
          syncAdminRoute(false);
          showToast("Admin-åtkomst kräver administratörsrättigheter", "info");
        }
      } catch (err) {
        // If token is invalid, hide admin
        setShowAdmin(false);
        setAdminPasswordPrompt(false);
        syncAdminRoute(false);
      }
    }
  }, [company?.role, showAdmin, token]);

  useEffect(() => {
    // Load showMyPrepTasks from localStorage
    const saved = localStorage.getItem("showMyPrepTasks");
    if (saved !== null) {
      setShowMyPrepTasks(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save showMyPrepTasks to localStorage
    localStorage.setItem("showMyPrepTasks", JSON.stringify(showMyPrepTasks));
  }, [showMyPrepTasks]);

  useEffect(() => {
    if (!router.isReady || !['owner', 'admin'].includes(company?.role)) {
      return;
    }

    const routeView = getSingleQueryParam(router.query.view);
    const routeTab = getSingleQueryParam(router.query.tab);
    const nextTab = isValidAdminTab(routeTab) ? routeTab : "info";

    if (routeView === "admin") {
      setAdminTab((prevTab) => (prevTab === nextTab ? prevTab : nextTab));

      if (skipNextAdminRoutePromptRef.current) {
        skipNextAdminRoutePromptRef.current = false;
        return;
      }

      // Keep admin protected: route can request admin view, but password is still required.
      if (!showAdmin && !adminPasswordPrompt) {
        setAdminPasswordPrompt(true);
        setAdminPasswordError("");
        setAdminPassword("");
      }
      return;
    }

    if (showAdmin) {
      setShowAdmin(false);
    }
  }, [
    router.isReady,
    router.query.view,
    router.query.tab,
    company?.role,
    showAdmin,
    adminPasswordPrompt
  ]);

  useEffect(() => {
    if (!showPrep || !tokenRef.current) return;
    fetchPrepTasks(prepDate);
  }, [showPrep, token, prepDate, fetchPrepTasks]); // token kept in deps to re-run if token arrives after showPrep=true

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (activeAskAbortRef.current) {
        activeAskAbortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (recipeRows.length === 0) {
      setSelectedRecipeId("");
      return;
    }

    const hasSelected = recipeRows.some((row) => row.id === selectedRecipeId);
    if (!hasSelected) {
      setSelectedRecipeId(recipeRows[0].id);
    }
  }, [recipeRows, selectedRecipeId]);

  const askAI = async (presetQuestion, options = {}) => {
    const messageSource = typeof presetQuestion === "string" ? presetQuestion : question;
    const userMessage = messageSource.trim();
    if (!userMessage || loading) return;
    const activeToken = token || localStorage.getItem("token") || "";

    if (!activeToken) {
      showToast("Session saknas. Logga in igen.", "info");
      logout();
      return;
    }

    setChat(prev => [...prev, { from: "user", text: userMessage }]);
    setQuestion("");
    setLoading(true);

    // Placeholder AI message that is filled in live as stream chunks arrive.
    // It's the only AI message added for this exchange - later updates mutate
    // it in place rather than pushing new entries, so the chat history ends
    // up with exactly one AI message per question, streamed or not.
    setChat(prev => [...prev, { from: "ai", text: "", streaming: true }]);

    const updateStreamingMessage = (updater) => {
      setChat(prev => {
        const lastIndex = prev.length - 1;
        if (lastIndex < 0 || prev[lastIndex].from !== "ai" || !prev[lastIndex].streaming) {
          return prev;
        }
        const next = [...prev];
        next[lastIndex] = updater(next[lastIndex]);
        return next;
      });
    };

    const finishStreamingMessage = (finalText, menuItems = []) => {
      updateStreamingMessage(() => ({ from: "ai", text: finalText, menuItems }));
    };

    const dropStreamingMessage = () => {
      setChat(prev => {
        const lastIndex = prev.length - 1;
        if (lastIndex < 0 || prev[lastIndex].from !== "ai" || !prev[lastIndex].streaming) {
          return prev;
        }
        return prev.slice(0, -1);
      });
    };

    const abortController = new AbortController();
    activeAskAbortRef.current = abortController;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({ question: userMessage, quickActionKey: options.quickActionKey || null }),
        signal: abortController.signal
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("text/event-stream")) {
        // Quick actions, cache hits and pre-stream errors are already
        // complete strings - showing them instantly is correct here and
        // streaming them word-by-word would just be fake streaming.
        const data = await res.json();

        if (res.status === 401 && /ogiltig token|ingen token|session/i.test(data?.answer || "")) {
          dropStreamingMessage();
          logout();
          showToast("Sessionen har gått ut. Logga in igen.", "info");
          setLoading(false);
          return;
        }

        finishStreamingMessage(
          data?.answer || "Ett fel uppstod. Försök igen.",
          Array.isArray(data?.menuItems) ? data.menuItems : []
        );
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedText = "";
      let streamErrorMessage = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;

          let payload;
          try {
            payload = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          if (payload.delta) {
            streamedText += payload.delta;
            const chunkText = payload.delta;
            updateStreamingMessage((msg) => ({ ...msg, text: msg.text + chunkText }));
          } else if (payload.error) {
            streamErrorMessage = payload.error;
          }
        }
      }

      if (streamErrorMessage) {
        finishStreamingMessage(streamedText ? `${streamedText}\n\n${streamErrorMessage}` : streamErrorMessage);
      } else {
        finishStreamingMessage(formatAiAnswer(streamedText || "Jag kunde inte generera ett svar just nu."));
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        dropStreamingMessage();
      } else {
        finishStreamingMessage("Ett fel uppstod. Försök igen.");
      }
    }

    if (activeAskAbortRef.current === abortController) {
      activeAskAbortRef.current = null;
    }
    setLoading(false);
  };

  const updatePassword = async () => {
    if (!currentPassword.trim()) {
      showToast("Ange nuvarande lösenord", "error");
      return;
    }
    if (!newPassword.trim()) {
      showToast("Skriv in ett nytt lösenord", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setAdminMessage("❌ Lösenorden matchar inte.");
      showToast("Lösenorden matchar inte.", "error");
      return;
    }

    setAdminMessage("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
        setAdminMessage("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      setAdminMessage("✅ Lösenord uppdaterat!");
      showToast("Lösenord uppdaterat", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const updateAdminPanelPassword = async () => {
    if (!adminPanelCurrentPassword.trim()) {
      showToast("Ange nuvarande admin-lösenord", "error");
      return;
    }
    if (!adminPanelNewPassword.trim()) {
      showToast("Skriv in ett nytt admin-lösenord", "error");
      return;
    }
    if (adminPanelNewPassword !== adminPanelConfirmPassword) {
      setAdminMessage("❌ Lösenorden matchar inte.");
      showToast("Lösenorden matchar inte.", "error");
      return;
    }

    setAdminMessage("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/change-admin-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: adminPanelCurrentPassword,
          newPassword: adminPanelNewPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
        setAdminMessage("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      setAdminMessage("✅ Admin-panelens lösenord uppdaterat!");
      showToast("Admin-panelens lösenord uppdaterat", "success");
      setAdminPanelCurrentPassword("");
      setAdminPanelNewPassword("");
      setAdminPanelConfirmPassword("");
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const updateCompanyDetails = async () => {
    setAdminMessage("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/update-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ details: companyDetails })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
        setAdminMessage("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      setAdminMessage("✅ Uppgifter uppdaterade!");
      setSavedCompanyDetails(companyDetails);
      setSavedRecipeRows(recipeRows);
      setLastSavedAt(new Date());
      const skippedColumns = Array.isArray(data?.skippedColumns) ? data.skippedColumns : [];
      if (skippedColumns.length > 0) {
        showToast(`Sparat, men saknade DB-kolumner: ${skippedColumns.join(", ")}`, "info");
      } else {
        showToast("Ändringar sparade", "success");
      }
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const toggleCompanyStatus = async () => {
    if (!confirm(`Vill du ${company.active ? 'deaktivera' : 'aktivera'} företaget?`)) {
      return;
    }

    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/toggle-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setAdminMessage("❌ " + (data.error || "Fel vid statusändring"));
        showToast(data.error || "Fel vid statusändring", "error");
        setAdminLoading(false);
        return;
      }

      // Update local company state
      const updatedCompany = { ...company, active: !company.active };
      setCompany(updatedCompany);
      localStorage.setItem("company", JSON.stringify(updatedCompany));

      setAdminMessage(`✅ Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}`);
      showToast(`Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}`, "success");
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const verifyAdminPassword = async () => {
    if (!adminPassword.trim()) {
      setAdminPasswordError("Ange admin-lösenord");
      return;
    }

    setAdminPasswordError("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ adminPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid verifiering"} (${data.details})` : (data.error || "Fel vid verifiering");
        setAdminPasswordError("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      // Success! Open admin panel
      skipNextAdminRoutePromptRef.current = true;
      setAdminPasswordPrompt(false);
      setShowAdmin(true);
      setShowPrep(false);
      syncAdminRoute(true, adminTab);
      fetchCompanyDetails();
      fetchPrepTemplate();
      setAdminPassword("");
    } catch {
      setAdminPasswordError("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const handleAdminClick = () => {
    if (showAdmin) {
      // Close admin panel
      setShowAdmin(false);
      syncAdminRoute(false);
    } else {
      // Show password prompt
      setShowPrep(false);
      setAdminPasswordPrompt(true);
      setAdminPasswordError("");
      setAdminPassword("");
      syncAdminRoute(true, adminTab);
    }
  };

  const closeAdminPasswordPrompt = () => {
    setAdminPasswordPrompt(false);
    setAdminPasswordError("");
    setAdminPassword("");
    if (!showAdmin) {
      syncAdminRoute(false);
    }
  };

  const handleAdminTabChange = (nextTab) => {
    setAdminTab(nextTab);
    syncAdminRoute(true, nextTab);
  };

  const fetchStaffList = async () => {
    if (!token || !company) {
      return;
    }

    setStaffLoading(true);
    try {
      const res = await fetch("/api/admin/staff", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      } else {
        console.error("Failed to fetch staff list, status:", res.status);
        const errorText = await res.text();
        console.error("Error response body:", errorText);
      }
    } catch (err) {
      console.error("Staff list fetch error:", err);
    } finally {
      setStaffLoading(false);
    }
  };

  const addStaffMember = async () => {
    if (!token || !company) return;

    if (!newStaffEmail.trim()) {
      showToast("Ange e-postadress", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaffEmail.trim())) {
      showToast("Ange en giltig e-postadress", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newStaffEmail.trim().toLowerCase(),
          name: newStaffName.trim() || null,
          role: newStaffRole
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Personal tillagd", "success");
        setNewStaffEmail("");
        setNewStaffName("");
        setNewStaffRole("member");
        fetchStaffList();
      } else {
        showToast(data.error || "Kunde inte lägga till personal", "error");
      }
    } catch (err) {
      console.error("Add staff error:", err);
      showToast("Kunde inte lägga till personal", "error");
    }
  };

  const removeStaffMember = async (staffId) => {
    if (!token || !company) return;

    if (!confirm("Är du säker på att du vill ta bort denna person?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/staff/delete?staffId=${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Personal borttagen", "success");
        fetchStaffList();
      } else {
        showToast(data.error || "Kunde inte ta bort personal", "error");
      }
    } catch (err) {
      console.error("Remove staff error:", err);
      showToast("Kunde inte ta bort personal", "error");
    }
  };

  // Helper function to get staff name by email
  const getStaffNameByEmail = (email) => {
    const staff = staffList.find(s => s.email === email);
    return staff ? (staff.name || email) : email;
  };

  const updateStaffRole = async (staffId, newRole) => {
    if (!token || !company) return;
    
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: staffId, role: newRole })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showToast("Roll uppdaterad", "success");
        fetchStaffList();
      } else {
        showToast(data.error || "Kunde inte uppdatera roll", "error");
      }
    } catch (err) {
      console.error("Update staff role error:", err);
      showToast("Kunde inte uppdatera roll", "error");
    }
  };

  const handlePrepClick = () => {
    const nextShowPrep = !showPrep;
    
    // Check if user has permission to view prep
    if (nextShowPrep && !canViewPrep(userRole)) {
      showToast("Du har inte behörighet att se Mise en place", "error");
      return;
    }
    
    setShowPrep(nextShowPrep);
    setShowAdmin(false);
    setAdminPasswordPrompt(false);
    syncAdminRoute(false);

    // Fetch immediately on open – tokenRef guarantees we always have the latest token
    if (nextShowPrep) {
      fetchPrepTasks(prepDate);
    }
  };

  const updatePrepTemplateRow = (rowIndex, field, value) => {
    setPrepTemplateRows((prev) => prev.map((row, index) => {
      if (index !== rowIndex) return row;

      if (field === "priority") {
        return { ...row, [field]: normalizeTemplatePriority(value) };
      }

      if (field === "due_time") {
        return { ...row, [field]: normalizeTemplateDueTime(value) || String(value || "").trim() };
      }

      return { ...row, [field]: value };
    }));
  };

  const addPrepTemplateRow = () => {
    setPrepTemplateRows((prev) => [...prev, emptyPrepTemplateRow()]);
  };

  const removePrepTemplateRow = (rowIndex) => {
    setPrepTemplateRows((prev) => {
      if (prev.length <= 1) {
        return [emptyPrepTemplateRow()];
      }
      return prev.filter((_, index) => index !== rowIndex);
    });
  };

  const prepTemplateDirty = serializePrepTemplateRows(prepTemplateRows) !== serializePrepTemplateRows(savedPrepTemplateRows);

  const upsertRecipeRows = (nextRows) => {
    const normalizedRows = Array.isArray(nextRows) && nextRows.length > 0 ? nextRows : [emptyRecipeRow()];
    setRecipeRows(normalizedRows);
    const serialized = serializeRecipesRows(normalizedRows);
    setCompanyDetails((prev) => ({ ...prev, recipes: serialized }));
  };

  // Permission checking functions based on user role
  const hasPermission = (permission) => {
    if (!company) return false;

    const userRole = company.role || 'member';

    switch (permission) {
      case 'view_admin':
        return ['owner', 'admin'].includes(userRole);
      case 'manage_staff':
        return ['owner', 'admin'].includes(userRole);
      case 'manage_security':
        return ['owner'].includes(userRole);
      case 'view_prep':
        return ['owner', 'admin', 'member'].includes(userRole);
      case 'manage_prep':
        return ['owner', 'admin', 'member'].includes(userRole);
      case 'access_ai':
        return ['owner', 'admin', 'member'].includes(userRole);
      default:
        return false;
    }
  };

  const updateRecipeRow = (recipeId, field, value) => {
    if (!recipeId) return;
    const nextRows = recipeRows.map((row) => {
      if (row.id !== recipeId) return row;
      return { ...row, [field]: value };
    });
    upsertRecipeRows(nextRows);
  };

  const addRecipeRow = () => {
    const nextRow = emptyRecipeRow({ dish_name: `Rätt ${recipeRows.length + 1}` });
    const nextRows = [...recipeRows, nextRow];
    upsertRecipeRows(nextRows);
    setSelectedRecipeId(nextRow.id);
  };

  const duplicateRecipeRow = () => {
    const source = recipeRows.find((row) => row.id === selectedRecipeId);
    if (!source) return;

    const nextRow = emptyRecipeRow({
      dish_name: source.dish_name ? `${source.dish_name} kopia` : "Ny kopia",
      category: source.category,
      is_active: source.is_active,
      ingredients: source.ingredients,
      yield: source.yield,
      mise: source.mise,
      cooking: source.cooking,
      plating: source.plating,
      allergens: source.allergens,
      time: source.time
    });

    const nextRows = [...recipeRows, nextRow];
    upsertRecipeRows(nextRows);
    setSelectedRecipeId(nextRow.id);
  };

  const removeRecipeRow = (recipeId) => {
    if (recipeRows.length <= 1) {
      const onlyRow = emptyRecipeRow();
      upsertRecipeRows([onlyRow]);
      setSelectedRecipeId(onlyRow.id);
      return;
    }

    const filteredRows = recipeRows.filter((row) => row.id !== recipeId);
    upsertRecipeRows(filteredRows);
    setSelectedRecipeId(filteredRows[0]?.id || "");
  };

  const visibleRecipeRows = recipeRows.filter((row) => {
    const term = recipeSearch.trim().toLowerCase();
    if (!term) return true;
    const haystack = `${row.dish_name} ${row.category} ${row.ingredients} ${row.yield} ${row.cooking}`.toLowerCase();
    return haystack.includes(term);
  });

  const selectedRecipeRow = recipeRows.find((row) => row.id === selectedRecipeId) || recipeRows[0] || {
    id: "",
    dish_name: "",
    category: "",
    is_active: true,
    ingredients: "",
    yield: "",
    mise: "",
    cooking: "",
    plating: "",
    allergens: "",
    time: ""
  };

  const completedPrepCount = prepTasks.filter((task) => task.is_done).length;
  const prepStations = [...new Set(prepTasks.map((task) => String(task.station || "").trim()).filter(Boolean))];

  // Reuse the employee identity already stored on `company` (set at login and restored
  // from localStorage on refresh) instead of re-decoding the JWT, whose employee token
  // uses `employeeEmail`/`isEmployee`, not `email`/`type`.
  const currentUserEmail = company?.employee_email || null;
  const isCurrentUserEmployee = !!company?.is_employee;

  const filteredPrepTasks = prepTasks.filter((task) => {
    if (prepOnlyOpen && task.is_done) {
      return false;
    }
    if (prepStationFilter !== "all" && String(task.station || "").trim() !== prepStationFilter) {
      return false;
    }

    // When "Visa mina uppgifter" is enabled, show only tasks assigned to current user
    if (showMyPrepTasks && (!task.assigned_to || task.assigned_to !== currentUserEmail)) {
      return false;
    }
    return true;
  });

  const visiblePrepTasks = [...filteredPrepTasks].sort((a, b) => {
    // First, prioritize tasks assigned to current user
    const aIsAssignedToMe = a.assigned_to === currentUserEmail;
    const bIsAssignedToMe = b.assigned_to === currentUserEmail;

    if (aIsAssignedToMe !== bIsAssignedToMe) {
      return aIsAssignedToMe ? -1 : 1;
    }

    // Then sort by completion status
    if (a.is_done !== b.is_done) {
      return a.is_done ? 1 : -1;
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[String(a.priority || "medium").toLowerCase()] ?? 1;
    const bPriority = priorityOrder[String(b.priority || "medium").toLowerCase()] ?? 1;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aDueTime = String(a.due_time || "").trim();
    const bDueTime = String(b.due_time || "").trim();

    if (aDueTime && bDueTime) {
      return aDueTime.localeCompare(bDueTime);
    }

    if (aDueTime) return -1;
    if (bDueTime) return 1;

    return 0;
  });

  const filteredCompletedPrepCount = visiblePrepTasks.filter((task) => task.is_done).length;
  const prepProgressPercent = visiblePrepTasks.length > 0
    ? Math.round((filteredCompletedPrepCount / visiblePrepTasks.length) * 100)
    : 0;

  // "Dina uppgifter": tasks assigned to the logged-in user, closest deadline first,
  // then not-done before done. Reuses the existing dueTimeSortValue helper.
  const myPrepTasks = filteredPrepTasks
    .filter((task) => currentUserEmail && task.assigned_to === currentUserEmail)
    .slice()
    .sort((a, b) => {
      const aDue = dueTimeSortValue(a.due_time);
      const bDue = dueTimeSortValue(b.due_time);
      if (aDue !== bDue) return aDue - bDue;
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
      return 0;
    });

  // "Övriga uppgifter": everything else, keeping the existing sort order.
  const otherPrepTasks = visiblePrepTasks.filter(
    (task) => !(currentUserEmail && task.assigned_to === currentUserEmail)
  );

  const renderPrepTaskItem = (task) => {
    const priorityMeta = getPriorityMeta(task.priority);
    const stationText = String(task.station || "").trim();
    const dueTimeText = String(task.due_time || "").trim();
    const isAssignedToMe = isCurrentUserEmployee && task.assigned_to === currentUserEmail;

    return (
      <label
        key={task.id}
        style={{
          ...styles.prepItem,
          ...(task.is_done ? { opacity: 0.5, background: "var(--surface-secondary)" } : {}),
          ...(task.assigned_to && !task.is_done ? { borderLeft: "3px solid #2563EB" } : {})
        }}
        onMouseEnter={(e) => {
          if (!task.is_done) {
            e.currentTarget.style.background = "var(--prep-item-hover-bg)";
            e.currentTarget.style.borderColor = "var(--accent-soft-border)";
          }
        }}
        onMouseLeave={(e) => {
          if (!task.is_done) {
            e.currentTarget.style.background = "var(--prep-item-bg)";
            e.currentTarget.style.borderColor = "var(--border)";
          }
        }}
      >
        <input
          type="checkbox"
          checked={!!task.is_done}
          onChange={(e) => togglePrepTask(task.id, e.target.checked)}
          disabled={prepLoading || !canEditPrep(userRole)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <div style={styles.prepItemBody}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              ...styles.prepItemText,
              ...(task.is_done ? styles.prepItemDone : {})
            }}>
              {task.title}
            </span>
            {isAssignedToMe && !task.is_done && (
              <span style={styles.assignedToMeBadge}>
                Tilldelad till dig
              </span>
            )}
          </div>
          <div style={styles.prepMetaRow}>
            <span style={{ ...styles.prepMetaChip, ...priorityMeta.style }}>
              Prioritet: {priorityMeta.label}
            </span>
            {stationText && <span style={styles.prepMetaChip}>Station: {stationText}</span>}
            {dueTimeText && <span style={styles.prepMetaChip}>Klar före {dueTimeText}</span>}
            {task.assigned_to && (
              <span style={styles.prepMetaChip}>Tilldelad: {getStaffNameByEmail(task.assigned_to)}</span>
            )}
          </div>
        </div>
      </label>
    );
  };

  // Guard against rendering with no company/session. This is not just
  // defensive polish - it's load-bearing: logout() clears `company` via
  // setState synchronously, but router.replace("/staffguide/login") is
  // asynchronous, so React commits at least one more render of THIS
  // still-mounted component before the route actually swaps it out. Every
  // company.xxx access below (header name, admin panel, etc.) would
  // otherwise crash on that render. Placed after every hook/useCallback
  // above (Rules of Hooks - the guard itself must never change which
  // hooks run) but before the JSX return that reads company fields.
  // dashboard.js never mounts this component with a null company to
  // begin with (it waits for a validated session first), so in practice
  // this only ever triggers during the brief logout transition.
  if (!company) {
    return (
      <div style={styles.loggingOutScreen}>
        <p style={styles.loggingOutText}>Loggar ut...</p>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap');

        :global(body) {
          font-family: 'Manrope', 'Segoe UI', sans-serif;
          background: var(--background);
          color: var(--text);
        }

        .loginCard:hover { transform: translateY(-3px); }
        .primaryButton:hover { background: #1e40af; }
        .sendButton:hover { background: var(--accent-hover); }
        .loginModeButton:hover { border-color: #93c5fd; background: #f8fbff; }
        .logoutButton:hover { background: var(--accent-soft-bg); }
        .chatInput:focus { border-color: var(--accent); }
        input:focus, textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .adminSectionCard {
          background: var(--surface);
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .adminSectionCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
        }
        .quickActionButton:hover {
          background: var(--accent-soft-border);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.18);
        }
        .quickActionWrap {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
        }
        .quickActionWrap::-webkit-scrollbar {
          height: 5px;
        }
        .quickActionWrap::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 999px;
        }
        .menuInlineItem:hover {
          color: var(--accent-hover);
          text-decoration-thickness: 2px;
        }

        .typing { display: flex; gap: 4px; align-items: center; }
        .typing .dot {
          width: 8px; height: 8px;
          background: var(--accent);
          border-radius: 50%;
          animation: blink 1s infinite alternate;
        }
        .typing .dot:nth-child(2) { animation-delay: 0.2s; }
        .typing .dot:nth-child(3) { animation-delay: 0.4s; }

        @media (max-width: 768px) {
          .typing { display: flex; gap: 4px; }
          .adminTabsBar { padding: 12px 12px !important; gap: 6px !important; }
          .quickActionWrap { padding: 6px 12px !important; }
          .recipeBuilderGrid { grid-template-columns: 1fr !important; }
          .appHeader {
            padding: 12px 12px !important;
            align-items: stretch !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .appHeaderActions {
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
          }
          .appHeaderActions button:last-child {
            grid-column: 1 / -1;
          }
          .prepHeaderActionsMobile {
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px !important;
          }
          .prepHeaderActionsMobile .prepMyTasksToggle {
            grid-column: 1 / -1;
          }
          .prepHeaderActionsMobile .prepQuickActionBtn {
            padding: 8px 4px !important;
            font-size: 11px !important;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .prepHeaderActionsMobile .prepActionIcon {
            font-size: 15px;
            display: block;
            margin-bottom: 2px;
          }
          .prepHeaderActionsMobile .prepQuickActionBtn > div > div:first-child {
            line-height: 1.2;
          }
          .prepHeaderActionsMobile .prepActionCaption {
            display: none;
          }
          .prepFiltersMobile {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .prepFiltersMobile select {
            width: 100%;
            min-width: 0 !important;
          }
          .inputAreaWrap {
            flex-direction: column !important;
            gap: 8px;
            padding: 10px 12px 12px 12px !important;
          }
          .inputAreaWrap .chatInput {
            margin-right: 0 !important;
          }
          .inputAreaWrap .sendButton {
            width: 100%;
            min-height: 44px;
          }
          .chatAreaMobile {
            padding: 12px !important;
          }

          /* Personal-tabellen blir en lista av kort på mobil så att roll,
             datum och "Ta bort"-knappen aldrig hamnar utanför skärmen. */
          .staffTable thead {
            display: none;
          }
          .staffTable, .staffTable tbody, .staffTable tr, .staffTable td {
            display: block;
            width: 100%;
          }
          .staffTable tr {
            border: 1px solid var(--border);
            border-radius: 12px;
            margin: 0 0 12px;
            padding: 4px 12px;
          }
          .staffTable tr:last-child {
            margin-bottom: 0;
          }
          .staffTable td {
            padding: 10px 0 !important;
            text-align: left !important;
            border-bottom: 1px solid var(--surface-secondary) !important;
          }
          .staffTable tr td:last-child {
            border-bottom: none !important;
          }
          .staffTable td::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: var(--text-faint);
            margin-bottom: 4px;
          }
          .staffTable td select,
          .staffTable td button {
            width: 100% !important;
            max-width: none !important;
          }
        }

        @keyframes blink {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- Small UX polish --- */
        input:focus, textarea:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
          background: var(--surface) !important;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        button:active:not(:disabled) {
          transform: translateY(0px);
        }

        .adminTabButton:hover {
          background: var(--surface-hover);
        }

        .adminSectionCard {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(15,23,42,0.05);
          margin-bottom: 16px;
        }
      `}</style>
      {toast.visible && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === "error" ? styles.toastError : {}),
            ...(toast.type === "info" ? styles.toastInfo : {})
          }}
        >
          {toast.text}
        </div>
      )}
      <header style={styles.header} className="appHeader">
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{company.name}</h2>
          <span style={styles.headerSub}>STAFFGUIDE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="appHeaderActions">
          <button
            style={{
              ...styles.logoutButton,
              background: showPrep ? "var(--accent)" : "var(--surface)",
              color: showPrep ? "var(--accent-contrast)" : "var(--accent-hover)"
            }}
            onClick={handlePrepClick}
          >
            {showPrep ? "Tillbaka till chat" : "Dagens prep"}
          </button>
          {hasPermission('view_admin') && (
            <button
              style={{
                ...styles.logoutButton,
                background: showAdmin ? "var(--accent)" : "var(--surface)",
                color: showAdmin ? "var(--accent-contrast)" : "var(--accent-hover)"
              }}
              onClick={handleAdminClick}
            >
              {showAdmin ? "Tillbaka" : "Admin"}
            </button>
          )}
          <ThemeToggle />
          <button
            style={styles.logoutButton}
            onClick={logout}
          >
            Logga ut
          </button>
        </div>
      </header>

      {adminPasswordPrompt && (
        <div style={styles.modalOverlay} onClick={closeAdminPasswordPrompt}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: "var(--text)" }}>Admin-lösenord krävs</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Ange admin-lösenord för att komma åt admin-panelen</p>

            <input
              style={styles.input}
              type="password"
              placeholder="Admin-lösenord"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !adminLoading && verifyAdminPassword()}
              disabled={adminLoading}
              autoFocus
            />

            {adminPasswordError && (
              <p style={{ color: "var(--danger-text)", fontSize: 14, marginBottom: 12 }}>
                {adminPasswordError}
              </p>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{ ...styles.primaryButton, flex: 1 }}
                onClick={verifyAdminPassword}
                disabled={adminLoading}
              >
                {adminLoading ? "Verifierar..." : "Öppna admin"}
              </button>
              <button
                style={{ ...styles.secondaryButton, flex: 1 }}
                onClick={closeAdminPasswordPrompt}
                disabled={adminLoading}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdmin ? (
        <>
          <div style={styles.adminPanel}>
            {/* Admin Tabs */}
            <div style={styles.adminTabs} className="adminTabsBar">
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "info" ? styles.adminTabActive : {})
                }}
                className="adminTabButton"
                onClick={() => handleAdminTabChange("info")}
              >
                Företagsinfo
                {isTabDirty("info") && <span style={styles.tabDirtyDot}>●</span>}
              </button>
              {canAccessAdminTab(userRole, "menu") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "menu" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("menu")}
                >
                  Meny & Allergener
                  {isTabDirty("menu") && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "recipes") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "recipes" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("recipes")}
                >
                  Receptbyggare
                  {isTabDirty("recipes") && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "routines") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "routines" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("routines")}
                >
                  Rutiner & Regler
                  {isTabDirty("routines") && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "prep") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "prep" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("prep")}
                >
                  Prep-mall
                  {prepTemplateDirty && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "staff") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "staff" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("staff")}
                >
                  Personal
                </button>
              )}
              {canAccessAdminTab(userRole, "security") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "security" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("security")}
                >
                  Säkerhet
                </button>
              )}
              {STATS_TAB_ENABLED && canAccessAdminTab(userRole, "stats") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "stats" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("stats")}
                >
                  Statistik
                </button>
              )}
            </div>

            {/* Admin Content */}
            <div style={styles.adminContent}>
              {lastSavedAt && (
                <p style={styles.lastSavedText}>
                  Senast uppdaterad: {lastSavedAt.toLocaleString("sv-SE")}
                </p>
              )}
              {adminTab === "info" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Företagsinformation</h3>
                  <p style={styles.helperText}>Exempel: supportmail, öppettider och eventuell stängningsinfo.</p>

                  <label style={styles.label}>Support E-post</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="t.ex. support@restaurang.se"
                    value={companyDetails.support_email || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, support_email: e.target.value })}
                  />

                  <label style={styles.label}>Öppettider</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Mån-Fre 10-22"
                    value={companyDetails.opening_hours || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, opening_hours: e.target.value })}
                  />

                  <label style={styles.label}>Stängningsinformation</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 60 }}
                    placeholder="t.ex. Stängt röda dagar"
                    value={companyDetails.closure_info || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, closure_info: e.target.value })}
                  />

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("info") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("info") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "menu" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Meny & Allergener</h3>
                  <p style={styles.helperText}>Exempel: kategori + rätt + pris + kort beskrivning.</p>

                  <label style={styles.label}>Meny</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 120 }}
                    placeholder="t.ex. Förrätt: Toast Skagen - 145 kr"
                    value={companyDetails.menu || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, menu: e.target.value })}
                  />

                  <label style={styles.label}>Allergener</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 100 }}
                    placeholder="t.ex. Innehåller gluten, mjölk, nötter"
                    value={companyDetails.allergens || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, allergens: e.target.value })}
                  />

                  <div style={styles.prepEmptyState}>
                    Recept hanteras nu i fliken <strong>Receptbyggare</strong> för tydligare redigering.
                  </div>

                  <button
                    type="button"
                    style={{ ...styles.secondaryButton, width: "100%", marginBottom: 10 }}
                    onClick={() => handleAdminTabChange("recipes")}
                  >
                    Öppna Receptbyggare
                  </button>

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("menu") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("menu") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "recipes" && (
                <div className="adminSectionCard">
                  <div style={styles.recipeTabHeader}>
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>Receptbyggare</h3>
                    <span style={styles.recipeCountBadge}>{recipeRows.length} recept</span>
                  </div>
                  <p style={styles.helperText}>Sök rätt, välj i listan och fyll i strukturerade fält istället för en lång text.</p>

                  <div style={styles.recipeBuilderLayout} className="recipeBuilderGrid">
                    <div style={styles.recipeSidebar}>
                      <input
                        style={{ ...styles.input, marginBottom: 10 }}
                        placeholder="Sök rätt..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                      />

                      <div style={styles.recipeList}>
                        {visibleRecipeRows.map((row) => {
                          const dishLabel = String(row.dish_name || "").trim() || "Namnlös rätt";
                          const categoryLabel = String(row.category || "").trim();
                          const isActive = selectedRecipeRow.id === row.id;
                          return (
                            <button
                              key={row.id}
                              type="button"
                              style={{
                                ...styles.recipeListButton,
                                ...(isActive ? styles.recipeListButtonActive : {})
                              }}
                              onClick={() => setSelectedRecipeId(row.id)}
                            >
                              {dishLabel}
                              {categoryLabel && <span style={styles.recipeListMeta}> · {categoryLabel}</span>}
                              {row.is_active === false && <span style={styles.recipeInactiveTag}> (inaktiv)</span>}
                            </button>
                          );
                        })}

                        {visibleRecipeRows.length === 0 && (
                          <div style={styles.prepEmptyState}>Ingen rätt matchar sökningen.</div>
                        )}
                      </div>

                      <button
                        type="button"
                        style={{ ...styles.secondaryButton, width: "100%", padding: "10px 12px", fontSize: 14 }}
                        onClick={addRecipeRow}
                        disabled={adminLoading}
                      >
                        + Ny rätt
                      </button>
                    </div>

                    <div style={styles.recipeEditor}>
                      <label style={{ ...styles.label, marginTop: 0 }}>Rättnamn</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.dish_name || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "dish_name", e.target.value)}
                        placeholder="t.ex. Margherita"
                      />

                      <label style={styles.label}>Kategori</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.category || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "category", e.target.value)}
                        placeholder="t.ex. Förrätt, Pizza, Dessert"
                      />

                      <label style={styles.label}>Status</label>
                      <select
                        style={styles.prepTemplateSelect}
                        value={selectedRecipeRow.is_active === false ? "inactive" : "active"}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "is_active", e.target.value === "active")}
                      >
                        <option value="active">Aktiv (synlig i drift)</option>
                        <option value="inactive">Inaktiv (utkast/pausad)</option>
                      </select>

                      <div style={styles.recipeEditorActions}>
                        <button
                          type="button"
                          style={{ ...styles.secondaryButton, padding: "10px 12px", fontSize: 14 }}
                          onClick={duplicateRecipeRow}
                          disabled={adminLoading}
                        >
                          Duplicera rätt
                        </button>
                        <button
                          type="button"
                          style={styles.prepDeleteRowButton}
                          onClick={() => removeRecipeRow(selectedRecipeRow.id)}
                          disabled={adminLoading}
                        >
                          Ta bort rätt
                        </button>
                      </div>

                      <label style={styles.label}>Ingredienser (basrecept)</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 90 }}
                        value={selectedRecipeRow.ingredients || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "ingredients", e.target.value)}
                        placeholder="Exempel klassisk toast (basrecept):\n40 skivor toastbrod\n300 g smor\n40 skivor ost\n20 skivor skinka"
                      />

                      <label style={styles.label}>Yield (t.ex. 20 port)</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.yield || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "yield", e.target.value)}
                        placeholder="t.ex. 20 port"
                      />

                      <label style={styles.label}>Mise en place</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 80 }}
                        value={selectedRecipeRow.mise || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "mise", e.target.value)}
                        placeholder="t.ex. Ta fram deg 30 min innan, riv ost"
                      />

                      <label style={styles.label}>Tillagning</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 90 }}
                        value={selectedRecipeRow.cooking || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "cooking", e.target.value)}
                        placeholder="t.ex. Baka i 3-4 min på 320 grader"
                      />

                      <label style={styles.label}>Plating</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 80 }}
                        value={selectedRecipeRow.plating || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "plating", e.target.value)}
                        placeholder="t.ex. Ringla olivolja, toppa med basilika"
                      />

                      <label style={styles.label}>Allergener</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.allergens || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "allergens", e.target.value)}
                        placeholder="t.ex. Gluten, mjölk"
                      />

                      <label style={styles.label}>Tidsåtgång</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.time || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "time", e.target.value)}
                        placeholder="t.ex. 6 min"
                      />
                    </div>
                  </div>

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("recipes") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("recipes") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "routines" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Rutiner & Regler</h3>
                  <p style={styles.helperText}>Exempel: korta punktlistor för öppning, stängning och personalsituationer.</p>

                  <label style={styles.label}>Arbetsrutiner</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Starta kassan, fyll på stationer"
                    value={companyDetails.routines || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, routines: e.target.value })}
                  />

                  <label style={styles.label}>Öppningsrutiner</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Ugn 250°, deg ut 30 min innan"
                    value={companyDetails.opening_routine || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, opening_routine: e.target.value })}
                  />

                  <label style={styles.label}>Stängningsrutiner</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Stäng kassan, rengör alla ytor"
                    value={companyDetails.closing_routine || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, closing_routine: e.target.value })}
                  />

                  <label style={styles.label}>Beteenderegler</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Mobil endast på rast"
                    value={companyDetails.behavior_guidelines || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, behavior_guidelines: e.target.value })}
                  />

                  <label style={styles.label}>Personalroller</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Kassa, kök, servering"
                    value={companyDetails.staff_roles || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, staff_roles: e.target.value })}
                  />

                  <label style={styles.label}>Personalsituationer</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Sen kollega, allergifråga, stress"
                    value={companyDetails.staff_situations || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, staff_situations: e.target.value })}
                  />

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("routines") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("routines") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "prep" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Prep-mall (chef)</h3>
                  <p style={styles.helperText}>
                    Fyll i en rad per prep-uppgift med separat fält för uppgift, stress, station och klar-tid.
                  </p>

                  <div style={styles.prepTemplateTableWrap}>
                    <table style={styles.prepTemplateTable}>
                      <thead>
                        <tr>
                          <th style={styles.prepTemplateTh}>Uppgift</th>
                          <th style={styles.prepTemplateTh}>Stress</th>
                          <th style={styles.prepTemplateTh}>Station</th>
                          <th style={styles.prepTemplateTh}>Klar tid</th>
                          <th style={styles.prepTemplateTh}>Tilldelad till</th>
                          <th style={styles.prepTemplateTh}>Ta bort</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prepTemplateRows.map((row, index) => (
                          <tr key={`prep-row-${index}`}>
                            <td style={styles.prepTemplateTd}>
                              <input
                                style={styles.prepTemplateInput}
                                value={row.title}
                                onChange={(e) => updatePrepTemplateRow(index, "title", e.target.value)}
                                placeholder="t.ex. Hacka lok"
                                disabled={prepTemplateLoading}
                              />
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <select
                                style={styles.prepTemplateSelect}
                                value={row.priority}
                                onChange={(e) => updatePrepTemplateRow(index, "priority", e.target.value)}
                                disabled={prepTemplateLoading}
                              >
                                <option value="high">Hög</option>
                                <option value="medium">Medel</option>
                                <option value="low">Låg</option>
                              </select>
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <input
                                style={styles.prepTemplateInput}
                                value={row.station}
                                onChange={(e) => updatePrepTemplateRow(index, "station", e.target.value)}
                                placeholder="t.ex. kok"
                                disabled={prepTemplateLoading}
                              />
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <input
                                type="time"
                                style={styles.prepTemplateInput}
                                value={row.due_time}
                                onChange={(e) => updatePrepTemplateRow(index, "due_time", e.target.value)}
                                disabled={prepTemplateLoading}
                              />
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <select
                                style={styles.prepTemplateSelect}
                                value={row.assigned_to || ""}
                                onChange={(e) => updatePrepTemplateRow(index, "assigned_to", e.target.value)}
                                disabled={prepTemplateLoading}
                              >
                                <option value="">Ej tilldelad</option>
                                {staffList.map((staff) => (
                                  <option key={staff.id} value={staff.email}>
                                    {staff.name || staff.email}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <button
                                type="button"
                                style={styles.prepDeleteRowButton}
                                onClick={() => removePrepTemplateRow(index)}
                                disabled={prepTemplateLoading}
                              >
                                Ta bort
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    style={{ ...styles.secondaryButton, width: "100%", marginTop: 12 }}
                    onClick={addPrepTemplateRow}
                    disabled={prepTemplateLoading}
                  >
                    + Ny rad
                  </button>

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.secondaryButton, flex: 1 }}
                      onClick={() => setPrepTemplateRows(savedPrepTemplateRows)}
                      disabled={!prepTemplateDirty || prepTemplateLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={savePrepTemplate}
                      disabled={!prepTemplateDirty || prepTemplateLoading}
                    >
                      {prepTemplateLoading ? "Sparar..." : "Spara prep-mall"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "staff" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Personalhantering</h3>
                  <p style={styles.helperText}>
                    Hantera anställda som kan logga in med e-post och engångskod.
                  </p>

                  {/* Add new staff */}
                  <div style={{ background: "var(--background)", padding: 20, borderRadius: 12, marginBottom: 24 }}>
                    <h4 style={{ margin: "0 0 16px", fontSize: 16, color: "var(--text-secondary)" }}>Lägg till ny personal</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <input
                        style={styles.input}
                        type="email"
                        placeholder="E-postadress *"
                        value={newStaffEmail}
                        onChange={e => setNewStaffEmail(e.target.value)}
                        disabled={staffLoading}
                      />
                      <input
                        style={styles.input}
                        type="text"
                        placeholder="Namn (valfritt)"
                        value={newStaffName}
                        onChange={e => setNewStaffName(e.target.value)}
                        disabled={staffLoading}
                      />
                      <select
                        style={styles.input}
                        value={newStaffRole}
                        onChange={e => setNewStaffRole(e.target.value)}
                        disabled={staffLoading}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    </div>
                    <button
                      style={styles.primaryButton}
                      onClick={addStaffMember}
                      disabled={staffLoading}
                    >
                      {staffLoading ? "Lägger till..." : "Lägg till personal"}
                    </button>
                  </div>

                  {/* Staff list */}
                  <div>
                    <h4 style={{ margin: "0 0 16px", fontSize: 16, color: "var(--text-secondary)" }}>Registrerad personal ({staffList.length})</h4>
                    {staffLoading ? (
                      <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>Laddar...</p>
                    ) : staffList.length === 0 ? (
                      <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>Ingen personal registrerad</p>
                    ) : (
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }} className="staffTable">
                          <thead>
                            <tr style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--border)" }}>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Namn</th>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>E-post</th>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Roll</th>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Tillagd datum</th>
                              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Åtgärd</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffList.map((staff) => (
                              <tr key={staff.id} style={{ borderBottom: "1px solid var(--surface-secondary)" }}>
                                <td data-label="Namn" style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                                  {staff.name || <span style={{ color: "var(--text-faint)", fontStyle: "italic" }}>Ej namngiven</span>}
                                </td>
                                <td data-label="E-post" style={{ padding: "12px 16px", color: "var(--accent)", fontSize: 14 }}>{staff.email}</td>
                                <td data-label="Roll" style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 14 }}>
                                  <select
                                    value={staff.role || 'member'}
                                    onChange={(e) => updateStaffRole(staff.id, e.target.value)}
                                    style={{
                                      padding: "6px 10px",
                                      border: "1px solid var(--border-input)",
                                      borderRadius: 6,
                                      fontSize: 13,
                                      width: "100%",
                                      maxWidth: 200,
                                      backgroundColor: "var(--surface)",
                                      color: "var(--text)",
                                      cursor: "pointer"
                                    }}
                                    disabled={staffLoading}
                                  >
                                    <option value="owner">Owner</option>
                                    <option value="admin">Admin</option>
                                    <option value="member">Member</option>
                                  </select>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.3 }}>
                                    {getRoleDescription(staff.role || 'member')}
                                  </div>
                                </td>
                                <td data-label="Tillagd datum" style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 14 }}>
                                  {new Date(staff.created_at).toLocaleDateString("sv-SE")}
                                </td>
                                <td data-label="Åtgärd" style={{ padding: "12px 16px", textAlign: "right" }}>
                                  <button
                                    style={{
                                      background: "var(--danger-bg)",
                                      color: "var(--danger-text)",
                                      border: "1px solid var(--danger-border)",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      transition: "background 0.15s"
                                    }}
                                    onClick={() => removeStaffMember(staff.id)}
                                    disabled={staffLoading}
                                    onMouseOver={(e) => e.target.style.background = "var(--danger-border)"}
                                    onMouseOut={(e) => e.target.style.background = "var(--danger-bg)"}
                                  >
                                    Ta bort
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {adminTab === "security" && hasPermission('manage_security') && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Säkerhet & Åtkomst</h3>
                  <p style={styles.helperText}>Hantera åtkomst och byt lösenord vid behov.</p>

                  <div style={{ background: "var(--surface-secondary)", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>
                      <strong>Status:</strong> Företaget är {company.active ? "aktiverat" : "deaktiverat"}
                    </p>
                  </div>

                  <button
                    style={{
                      ...styles.primaryButton,
                      background: company.active ? "var(--danger-text)" : "var(--success-text)",
                      marginBottom: 24
                    }}
                    onClick={toggleCompanyStatus}
                    disabled={adminLoading}
                  >
                    {company.active ? "Deaktivera företag" : "Aktivera företag"}
                  </button>

                  <h4>Byt lösenord (StaffGuide-inloggning)</h4>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nuvarande lösenord"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nytt lösenord"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Bekräfta nytt lösenord"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ color: "var(--danger-text)", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
                      Lösenorden matchar inte.
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updatePassword}
                    disabled={adminLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  >
                    {adminLoading ? "Uppdaterar..." : "Uppdatera lösenord"}
                  </button>

                  <h4 style={{ marginTop: 24 }}>Byt Admin-panelens lösenord</h4>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nuvarande lösenord"
                    value={adminPanelCurrentPassword}
                    onChange={e => setAdminPanelCurrentPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nytt lösenord"
                    value={adminPanelNewPassword}
                    onChange={e => setAdminPanelNewPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Bekräfta nytt lösenord"
                    value={adminPanelConfirmPassword}
                    onChange={e => setAdminPanelConfirmPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  {adminPanelConfirmPassword && adminPanelNewPassword !== adminPanelConfirmPassword && (
                    <p style={{ color: "var(--danger-text)", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
                      Lösenorden matchar inte.
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updateAdminPanelPassword}
                    disabled={adminLoading || !adminPanelCurrentPassword || !adminPanelNewPassword || !adminPanelConfirmPassword || adminPanelNewPassword !== adminPanelConfirmPassword}
                  >
                    {adminLoading ? "Uppdaterar..." : "Uppdatera admin-lösenord"}
                  </button>

                  {adminMessage && (
                    <p style={{
                      ...styles.adminMessage,
                      color: adminMessage.includes("✅") ? "var(--success-text)" : "var(--danger-text)"
                    }}>
                      {adminMessage}
                    </p>
                  )}
                </div>
              )}

              {STATS_TAB_ENABLED && adminTab === "stats" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Statistik</h3>

                  <button
                    style={{ ...styles.primaryButton, marginBottom: 24, fontSize: 13 }}
                    onClick={fetchCompanyDetails}
                    disabled={adminLoading}
                  >
                    Uppdatera statistik
                  </button>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{companyDetails.query_count || 0}</div>
                    <div style={styles.statLabel}>Totalt antal frågor</div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{['owner', 'admin'].includes(company.role) ? "Ja" : "Nej"}</div>
                    <div style={styles.statLabel}>Admin-behörighet</div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{company.active ? "Aktiv" : "Inaktiv"}</div>
                    <div style={styles.statLabel}>Företagsstatus</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : showPrep ? (
        <div style={styles.prepPanel}>
          <div style={styles.prepCard}>
            <div style={styles.prepHeaderRow}>
              <div>
                <h3 style={{ margin: "0 0 4px 0" }}>Dagens prep</h3>
                <p style={{ ...styles.helperText, margin: 0 }}>
                  {prepDate} · {completedPrepCount}/{prepTasks.length} klara
                </p>
              </div>
              <div style={styles.prepHeaderActions} className="prepHeaderActionsMobile">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} className="prepMyTasksToggle">
                  <input
                    type="checkbox"
                    checked={showMyPrepTasks}
                    onChange={(e) => setShowMyPrepTasks(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: 14 }}>Visa mina uppgifter</span>
                </label>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  className="prepQuickActionBtn"
                  onClick={() => setFilteredPrepTasksDone(true)}
                  disabled={prepLoading || prepBulkUpdating}
                  title="Bockar av alla uppgifter i nuvarande vy"
                >
                  <div>
                    <div><span className="prepActionIcon">✅</span> Markera synliga klara</div>
                    <div className="prepActionCaption" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Bockar av alla uppgifter i nuvarande vy</div>
                  </div>
                </button>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  className="prepQuickActionBtn"
                  onClick={() => setFilteredPrepTasksDone(false)}
                  disabled={prepLoading || prepBulkUpdating}
                  title="Avmarkerar alla klarmarkeringar"
                >
                  <div>
                    <div><span className="prepActionIcon">↺</span> Återställ synliga</div>
                    <div className="prepActionCaption" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Avmarkerar alla klarmarkeringar</div>
                  </div>
                </button>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  className="prepQuickActionBtn"
                  onClick={() => fetchPrepTasks(prepDate)}
                  disabled={prepLoading || prepBulkUpdating}
                  title="Hämtar senaste uppgifter från servern"
                >
                  <div>
                    <div><span className="prepActionIcon">🔄</span> {prepLoading ? "Laddar..." : "Uppdatera"}</div>
                    <div className="prepActionCaption" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Hämtar senaste uppgifter från servern</div>
                  </div>
                </button>
              </div>
            </div>

            <div style={styles.prepProgressWrap}>
              <div style={styles.prepProgressText}>
                Synliga uppgifter: {filteredCompletedPrepCount}/{visiblePrepTasks.length} klara ({prepProgressPercent}%)
              </div>
              <div style={styles.prepProgressTrack}>
                <div style={{ ...styles.prepProgressFill, width: `${prepProgressPercent}%` }} />
              </div>
            </div>

            <div style={styles.prepFiltersRow} className="prepFiltersMobile">
              <label style={styles.prepFilterToggle}>
                <input
                  type="checkbox"
                  checked={prepOnlyOpen}
                  onChange={(e) => setPrepOnlyOpen(e.target.checked)}
                />
                Visa bara ej klara
              </label>

              <select
                value={prepStationFilter}
                onChange={(e) => setPrepStationFilter(e.target.value)}
                style={styles.prepSelect}
              >
                <option value="all">Alla stationer</option>
                {prepStations.map((station) => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>

            {prepError && <p style={{ ...styles.error, color: "var(--danger-text)" }}>{prepError}</p>}

            {!prepError && !prepLoading && prepTasks.length === 0 && (
              <div style={styles.prepEmptyState}>
                Inga prep-uppgifter för idag. Be chefen lägga in en prep-mall i admin.
              </div>
            )}

            {!prepError && prepTasks.length > 0 && (
              <>
                <h4 style={styles.prepSectionTitle}>
                  Dina uppgifter <span style={styles.prepSectionCount}>({myPrepTasks.length})</span>
                </h4>
                <div style={styles.prepList}>
                  {myPrepTasks.length > 0 ? (
                    myPrepTasks.map((task) => renderPrepTaskItem(task))
                  ) : (
                    <div style={styles.prepEmptyState}>Inga uppgifter tilldelade just nu.</div>
                  )}
                </div>

                <h4 style={{ ...styles.prepSectionTitle, marginTop: 24 }}>Övriga uppgifter</h4>
                <div style={styles.prepList}>
                  {otherPrepTasks.length > 0 ? (
                    otherPrepTasks.map((task) => renderPrepTaskItem(task))
                  ) : (
                    <div style={styles.prepEmptyState}>Inga övriga uppgifter.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.chatArea} ref={chatAreaRef} className="chatAreaMobile">
            {chat.length === 0 && !loading && (
              <div style={styles.emptyStateCard}>
                <div style={styles.emptyStateTitle}>Hej</div>
                <div style={styles.emptyStateText}>Välj en snabbfråga nedan eller skriv en egen fråga till personalguiden.</div>
              </div>
            )}

            {chat.map((msg, i) => (
              <div
                key={i}
                style={
                  msg.from === "user"
                    ? styles.userBubble
                    : styles.aiBubble
                }
                className={msg.from === "ai" && msg.streaming && !msg.text ? "typing" : undefined}
              >
                {msg.from === "ai" && msg.streaming && !msg.text ? (
                  <>
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </>
                ) : msg.from === "ai" ? (
                  renderAiTextWithClickableMenuItems(msg, i)
                ) : (
                  msg.text
                )}
                {msg.from === "ai" && Array.isArray(msg.menuItems) && msg.menuItems.length > 0 && (
                  <div style={styles.menuItemsWrap}>
                    <div style={styles.menuItemsTitle}>Tryck på en rätt för recept</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={styles.quickActions} className="quickActionWrap">
            {quickQuestions.map((quickQuestion) => (
              <button
                key={quickQuestion.key}
                style={styles.quickActionButton}
                className="quickActionButton"
                onClick={() => askAI(quickQuestion.prompt, { quickActionKey: quickQuestion.key })}
                disabled={loading}
              >
                {quickQuestion.label}
              </button>
            ))}
          </div>

          <div style={styles.inputArea} className="inputAreaWrap">
            <input
              style={styles.chatInput}
              className="chatInput"
              placeholder="Ställ en fråga till personalguiden..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && askAI()}
              disabled={loading}
              autoComplete="off"
            />

            <button
              style={styles.sendButton}
              className="sendButton"
              onClick={() => askAI()}
              disabled={loading}
            >
              Skicka
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    minHeight: "100vh",
    background: "var(--background)"
  },

  loggingOutScreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100dvh",
    minHeight: "100vh",
    background: "var(--background)"
  },

  loggingOutText: {
    color: "var(--text-muted)",
    fontSize: 14,
    fontWeight: 600
  },

  header: {
    padding: "18px 28px",
    background: "var(--surface)",
    color: "var(--text)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    boxShadow: "0 2px 12px rgba(15,23,42,0.04)"
  },

  headerSub: {
    fontSize: 13,
    color: "var(--text-muted)",
    fontWeight: 600,
    letterSpacing: 0.3
  },

  logoutButton: {
    background: "var(--surface)",
    border: "1px solid var(--accent-soft-border)",
    color: "var(--accent-hover)",
    padding: "10px 18px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
  },

  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "var(--background)"
  },

  emptyStateCard: {
    alignSelf: "center",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "14px 16px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 3px 10px rgba(0,0,0,0.04)"
  },

  emptyStateTitle: {
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 4
  },

  emptyStateText: {
    color: "var(--text-secondary)",
    fontSize: 14,
    lineHeight: 1.5
  },

  userBubble: {
    alignSelf: "flex-end",
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    padding: 14,
    borderRadius: "16px 16px 6px 16px",
    maxWidth: "76%",
    boxShadow: "0 10px 22px rgba(37,99,235,0.24)",
    animation: "fadeIn 0.2s"
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "var(--surface)",
    color: "var(--text)",
    padding: 14,
    borderRadius: "16px 16px 16px 6px",
    maxWidth: "76%",
    whiteSpace: "pre-wrap",
    boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
    border: "1px solid var(--border)",
    animation: "fadeIn 0.2s"
  },

  menuItemsWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed var(--border-input)"
  },

  menuItemsTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 8
  },

  menuInlineText: {
    color: "var(--accent-hover)"
  },

  menuInlineItemButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: "var(--accent-hover)",
    font: "inherit",
    fontWeight: 700,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    cursor: "pointer"
  },

  menuItemsGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },

  menuItemButton: {
    border: "1px solid var(--accent-soft-border)",
    background: "var(--accent-soft-bg)",
    color: "var(--accent-hover)",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
    transition: "transform 0.15s, box-shadow 0.2s, background 0.2s"
  },

  quickActions: {
    display: "flex",
    flexWrap: "nowrap",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    gap: 8,
    padding: "8px 18px",
    background: "var(--surface)",
    borderTop: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)"
  },

  quickActionButton: {
    flexShrink: 0,
    whiteSpace: "nowrap",
    border: "1px solid var(--accent-soft-border)",
    background: "var(--accent-soft-bg)",
    color: "var(--accent-hover)",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform 0.15s, box-shadow 0.2s, background 0.2s",
    boxShadow: "0 1px 3px rgba(37,99,235,0.08)"
  },

  inputArea: {
    display: "flex",
    padding: "12px 18px 18px 18px",
    background: "var(--surface)",
    boxShadow: "0 -2px 10px rgba(15,23,42,0.04)",
    borderTop: "1px solid var(--border)"
  },

  chatInput: {
    flex: 1,
    padding: "14px 16px",
    fontSize: 16,
    borderRadius: 12,
    border: "1.5px solid var(--border-input)",
    marginRight: 12,
    boxSizing: "border-box",
    outline: "none",
    background: "var(--background)",
    color: "var(--text)",
    transition: "border-color 0.2s, box-shadow 0.2s"
  },

  sendButton: {
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    border: "none",
    padding: "0 24px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    minHeight: 48,
    boxShadow: "0 2px 8px rgba(37,99,235,0.18)",
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s"
  },

  prepPanel: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: 24,
    background: "var(--background)"
  },

  prepCard: {
    maxWidth: 760,
    margin: "0 auto",
    background: "var(--surface)",
    borderRadius: 14,
    border: "1px solid var(--border)",
    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    padding: 18
  },

  prepHeaderActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },

  prepProgressWrap: {
    marginBottom: 12
  },

  prepProgressText: {
    fontSize: 13,
    color: "var(--text-secondary)",
    marginBottom: 6,
    fontWeight: 600
  },

  prepProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "var(--border)",
    overflow: "hidden"
  },

  prepProgressFill: {
    height: "100%",
    background: "var(--accent)",
    borderRadius: 999,
    transition: "width 0.25s ease"
  },

  prepHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap"
  },

  prepFiltersRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap"
  },

  prepFilterToggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "var(--text-secondary)"
  },

  prepSelect: {
    border: "1px solid var(--border-input)",
    borderRadius: 10,
    padding: "8px 10px",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 14,
    minWidth: 170
  },

  prepEmptyState: {
    background: "var(--background)",
    border: "1px dashed var(--border-input)",
    borderRadius: 10,
    padding: 12,
    color: "var(--text-secondary)",
    marginBottom: 12
  },

  prepList: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  prepSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    margin: "0 0 10px",
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text)"
  },

  prepSectionCount: {
    fontWeight: 600,
    color: "var(--text-muted)"
  },

  prepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "14px 14px",
    background: "var(--surface)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
    cursor: "pointer"
  },

  prepItemBody: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flex: 1,
    minWidth: 0
  },

  prepItemText: {
    color: "var(--text)",
    lineHeight: 1.45,
    fontSize: 15
  },

  prepMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },

  prepMetaChip: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    background: "var(--purple-bg)",
    color: "var(--purple-text)",
    border: "1px solid var(--purple-border)"
  },

  assignedToMeBadge: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    padding: "3px 9px",
    borderRadius: 999,
    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
    color: "var(--accent-contrast)",
    boxShadow: "0 1px 4px rgba(37, 99, 235, 0.35)",
    whiteSpace: "nowrap"
  },

  prepPriorityHigh: {
    background: "var(--danger-bg)",
    color: "var(--danger-text)",
    border: "1px solid var(--danger-border)"
  },

  prepPriorityMedium: {
    background: "var(--warning-bg)",
    color: "var(--warning-text)",
    border: "1px solid var(--warning-border)"
  },

  prepPriorityLow: {
    background: "var(--success-bg)",
    color: "var(--success-text)",
    border: "1px solid var(--success-border)"
  },

  prepItemDone: {
    textDecoration: "line-through",
    color: "var(--text-muted)"
  },

  prepTemplateTableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface)"
  },

  prepTemplateTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 620
  },

  prepTemplateTh: {
    textAlign: "left",
    fontSize: 12,
    color: "var(--text-secondary)",
    padding: "10px 8px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-secondary)"
  },

  prepTemplateTd: {
    padding: 8,
    borderBottom: "1px solid var(--surface-secondary)",
    verticalAlign: "top"
  },

  prepTemplateInput: {
    width: "100%",
    border: "1px solid var(--border-input)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box",
    background: "var(--surface)",
    color: "var(--text)"
  },

  prepTemplateSelect: {
    width: "100%",
    border: "1px solid var(--border-input)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box",
    background: "var(--surface)",
    color: "var(--text)"
  },

  prepDeleteRowButton: {
    border: "1px solid var(--danger-border)",
    background: "var(--danger-bg)",
    color: "var(--danger-text)",
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap"
  },

  recipeBuilderLayout: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 12,
    alignItems: "start"
  },

  recipeTabHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    flexWrap: "wrap"
  },

  recipeCountBadge: {
    border: "1px solid var(--accent-soft-border)",
    color: "var(--accent-hover)",
    background: "var(--accent-soft-bg)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700
  },

  recipeSidebar: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--background)",
    padding: 10
  },

  recipeList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxHeight: 360,
    overflowY: "auto",
    marginBottom: 10
  },

  recipeListButton: {
    border: "1px solid var(--border-input)",
    background: "var(--surface)",
    color: "var(--text)",
    borderRadius: 8,
    padding: "8px 10px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600
  },

  recipeListButtonActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-soft-bg)",
    color: "var(--accent-hover)"
  },

  recipeListMeta: {
    color: "var(--text-muted)",
    fontWeight: 500
  },

  recipeInactiveTag: {
    color: "var(--danger-text)",
    fontWeight: 700
  },

  recipeEditor: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface)",
    padding: 12
  },

  recipeEditorActions: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap"
  },

  adminPanel: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "var(--background)",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden"
  },

  adminTabs: {
    display: "flex",
    gap: 8,
    padding: "16px 24px",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    overflowX: "auto",
    flexShrink: 0
  },

  adminTab: {
    padding: "12px 16px",
    minHeight: 44,
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: 8,
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  },

  tabDirtyDot: {
    marginLeft: 8,
    fontSize: 10,
    verticalAlign: "middle"
  },

  adminTabActive: {
    background: "var(--accent)",
    color: "var(--accent-contrast)"
  },

  adminContent: {
    flex: 1,
    minHeight: 0,
    padding: "24px 32px",
    maxWidth: 960,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 40
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 8,
    marginTop: 16
  },

  helperText: {
    color: "var(--text-muted)",
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12
  },

  lastSavedText: {
    margin: "0 0 12px 2px",
    color: "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 500
  },

  adminActionBar: {
    position: "sticky",
    bottom: 0,
    zIndex: 3,
    display: "flex",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 6,
    background: "linear-gradient(180deg, rgba(15,23,42,0), var(--background) 28%)"
  },

  secondaryButton: {
    width: "auto",
    padding: 12,
    fontSize: 15,
    background: "var(--accent-soft-bg)",
    color: "var(--accent-hover)",
    border: "1px solid var(--accent-soft-border)",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.15s, transform 0.1s"
  },

  destructiveButton: {
    width: "auto",
    padding: 12,
    fontSize: 15,
    background: "var(--background)",
    color: "var(--text-muted)",
    border: "2px solid var(--border)",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    minHeight: 48,
    transition: "background 0.15s, transform 0.1s, border-color 0.15s"
  },

  adminMessage: {
    paddingBottom: 12,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16
  },

  statCard: {
    background: "var(--surface)",
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: "var(--shadow-card)",
    textAlign: "center"
  },

  statNumber: {
    fontSize: 36,
    fontWeight: 700,
    color: "var(--accent)",
    marginBottom: 8
  },

  statLabel: {
    fontSize: 14,
    color: "var(--text-muted)",
    fontWeight: 500
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "var(--overlay-bg)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },

  modalContent: {
    background: "var(--surface)",
    padding: 32,
    borderRadius: 16,
    maxWidth: 400,
    width: "90%",
    boxShadow: "var(--shadow-modal)"
  },

  toast: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 2000,
    background: "#059669",
    color: "#fff",
    padding: "11px 14px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    maxWidth: 360
  },

  toastError: {
    background: "#dc2626"
  },

  toastInfo: {
    background: "#1d4ed8"
  }
};
