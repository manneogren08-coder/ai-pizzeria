import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";

const ADMIN_TABS = ["info", "menu", "recipes", "routines", "prep", "security", "stats"];

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
  if (["high", "hog", "hög", "h"].includes(normalized)) return "high";
  if (["low", "lag", "låg", "l"].includes(normalized)) return "low";
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
    due_time: ""
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
        due_time: normalizeTemplateDueTime(parts[3])
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
      due_time: normalizeTemplateDueTime(row?.due_time)
    }))
    .filter((row) => row.title)
    .map((row) => [row.title, row.priority, row.station, row.due_time].join(" | "))
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

export default function Home() {
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

  const landingFaqs = [
    {
      question: "Hur snabbt kommer en ny medarbetare igång?",
      answer: "Ofta samma dag. Lägg in rutiner, recept och allergener i admin så kan personalen fråga AI-guiden direkt i mobilen."
    },
    {
      question: "Fungerar det för både kök och servering?",
      answer: "Ja. Ni kan använda samma konto men olika innehåll: köksrutiner, service-scripts, allergenstöd och öppning/stängning."
    },
    {
      question: "Kan vi styra vad personalen ser?",
      answer: "Ja. Innehållet hämtas från er adminpanel. Uppdaterar ni text där slår det igenom i svaren direkt efter sparning."
    },
    {
      question: "Är sidan bra på iPad och telefon?",
      answer: "Ja. Gränssnittet är byggt mobile-first med tydliga kort, stora klickytor och enkel navigering under service."
    }
  ];

  const [token, setToken] = useState("");
  const [loginMode, setLoginMode] = useState("company");
  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [company, setCompany] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [adminTab, setAdminTab] = useState("info");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [adminPasswordPrompt, setAdminPasswordPrompt] = useState(false);
  const [newPassword, setNewPassword] = useState("");
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
  const [recipeRows, setRecipeRows] = useState([emptyRecipeRow()]);
  const [savedRecipeRows, setSavedRecipeRows] = useState([emptyRecipeRow()]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const chatAreaRef = useRef(null);
  const toastTimerRef = useRef(null);
  const skipNextAdminRoutePromptRef = useRef(false);

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
    setCompany(null);
    setToken("");
    setChat([]);
    localStorage.removeItem("token");
    localStorage.removeItem("company");
    syncAdminRoute(false);
  }, [syncAdminRoute]);

  const isJwtExpired = (jwtToken) => {
    if (!jwtToken || typeof jwtToken !== "string") {
      return true;
    }

    try {
      const parts = jwtToken.split(".");
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      if (!payload?.exp) return true;
      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  };

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
    if (!token) return;

    const requestedDate = typeof targetDate === "string" ? targetDate : getTodayDateString();
    setPrepLoading(true);
    setPrepError("");

    try {
      const res = await fetch(`/api/prep/day?date=${encodeURIComponent(requestedDate)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
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
      setPrepTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch {
      setPrepError("Kunde inte hämta dagens prep.");
      setPrepTasks([]);
    }

    setPrepLoading(false);
  }, [token]);

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

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedCompany = localStorage.getItem("company");

    if (!savedToken || !savedCompany || isJwtExpired(savedToken)) {
      localStorage.removeItem("token");
      localStorage.removeItem("company");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRestoringSession(false);
      return;
    }

    try {
      setToken(savedToken);
      setCompany(JSON.parse(savedCompany));
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("company");
    }

    setIsRestoringSession(false);
  }, []);

  // scroll when chat updates
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chat, loading]);

  useEffect(() => {
    if (!router.isReady || !company?.is_admin) {
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
    company?.is_admin,
    showAdmin,
    adminPasswordPrompt
  ]);

  useEffect(() => {
    if (!showPrep || !token) return;
    fetchPrepTasks(prepDate);
  }, [showPrep, token, prepDate, fetchPrepTasks]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
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

  const login = async () => {
    if (!companyIdentifier.trim()) {
      setError("Skriv in företags-id eller företagsnamn");
      return;
    }

    if (!password.trim()) {
      setError("Skriv in lösenord");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, companyIdentifier })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Fel företagskod eller lösenord");
        setLoading(false);
        return;
      }

      setToken(data.token);
      setCompany(data.company);
      localStorage.setItem("token", data.token);
      localStorage.setItem("company", JSON.stringify(data.company));
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const requestEmployeeCode = async () => {
    if (!companyIdentifier.trim()) {
      setError("Skriv in företags-id eller företagsnamn");
      return;
    }

    if (!password.trim()) {
      setError("Skriv in restaurangens lösenord");
      return;
    }

    if (!employeeEmail.trim()) {
      setError("Skriv in e-post");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyIdentifier,
          password,
          email: employeeEmail,
          name: employeeName
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Kunde inte skicka kod");
        setLoading(false);
        return;
      }

      const debugHint = data?.debugCode ? ` Testkod: ${data.debugCode}` : "";
      showToast(`Kod skickad till ${employeeEmail}.${debugHint}`, "info");
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const loginWithEmployeeCode = async () => {
    if (!companyIdentifier.trim()) {
      setError("Skriv in företags-id eller företagsnamn");
      return;
    }

    if (!password.trim()) {
      setError("Skriv in restaurangens lösenord");
      return;
    }

    if (!employeeEmail.trim()) {
      setError("Skriv in e-post");
      return;
    }

    if (!employeeCode.trim()) {
      setError("Skriv in engångskod eller demo");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyIdentifier,
          password,
          email: employeeEmail,
          code: employeeCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Kunde inte logga in med kod");
        setLoading(false);
        return;
      }

      setToken(data.token);
      setCompany(data.company);
      localStorage.setItem("token", data.token);
      localStorage.setItem("company", JSON.stringify(data.company));
      setEmployeeCode("");
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

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

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({ question: userMessage, quickActionKey: options.quickActionKey || null })
      });

      const data = await res.json();

      if (res.status === 401 && /ogiltig token|ingen token|session/i.test(data?.answer || "")) {
        logout();
        showToast("Sessionen har gått ut. Logga in igen.", "info");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setChat(prev => [...prev, { from: "ai", text: data?.answer || "Ett fel uppstod. Försök igen." }]);
        setLoading(false);
        return;
      }

      setChat(prev => [
        ...prev,
        {
          from: "ai",
          text: formatAiAnswer(data.answer),
          menuItems: Array.isArray(data?.menuItems) ? data.menuItems : []
        }
      ]);
    } catch {
      setChat(prev => [
        ...prev,
        { from: "ai", text: "Ett fel uppstod. Försök igen." }
      ]);
    }

    setLoading(false);
  };

  const updatePassword = async () => {
    if (!newPassword.trim()) {
      showToast("Skriv in ett nytt lösenord", "error");
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
        body: JSON.stringify({ newPassword })
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
      setNewPassword("");
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

  const handlePrepClick = () => {
    const nextShowPrep = !showPrep;
    setShowPrep(nextShowPrep);
    setShowAdmin(false);
    setAdminPasswordPrompt(false);
    syncAdminRoute(false);

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

  const filteredPrepTasks = prepTasks.filter((task) => {
    if (prepOnlyOpen && task.is_done) {
      return false;
    }
    if (prepStationFilter !== "all" && String(task.station || "").trim() !== prepStationFilter) {
      return false;
    }
    return true;
  });

  const visiblePrepTasks = [...filteredPrepTasks].sort((a, b) => {
    if (a.is_done !== b.is_done) {
      return a.is_done ? 1 : -1;
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[String(a.priority || "medium").toLowerCase()] ?? 1;
    const bPriority = priorityOrder[String(b.priority || "medium").toLowerCase()] ?? 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aTime = dueTimeSortValue(a.due_time);
    const bTime = dueTimeSortValue(b.due_time);
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  const filteredCompletedPrepCount = visiblePrepTasks.filter((task) => task.is_done).length;
  const prepProgressPercent = visiblePrepTasks.length > 0
    ? Math.round((filteredCompletedPrepCount / visiblePrepTasks.length) * 100)
    : 0;

  if (isRestoringSession) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h2 style={{ marginBottom: 8 }}>Laddar session...</h2>
          <p style={styles.subtitle}>Ett ögonblick, vi hämtar din inloggning.</p>
        </div>
      </div>
    );
  }

  // LOGIN PAGE
  if (!company) {
    return (
      <div style={styles.landingPage} className="landingPage">
        <style jsx>{`
          .landingOrb {
            position: absolute;
            border-radius: 9999px;
            filter: blur(2px);
            opacity: 0.55;
            animation: drift 12s ease-in-out infinite;
          }

          .orbA {
            width: 280px;
            height: 280px;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, rgba(37, 99, 235, 0) 72%);
            top: 5%;
            left: -70px;
          }

          .orbB {
            width: 360px;
            height: 360px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.24) 0%, rgba(59, 130, 246, 0) 74%);
            bottom: -100px;
            right: -100px;
            animation-duration: 15s;
          }

          .orbC {
            width: 180px;
            height: 180px;
            background: radial-gradient(circle, rgba(191, 219, 254, 0.8) 0%, rgba(191, 219, 254, 0) 72%);
            top: 44%;
            right: 20%;
            animation-duration: 10s;
          }

          .heroPulse {
            animation: pulse 6s ease-in-out infinite;
          }

          @keyframes drift {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(0, -12px, 0) scale(1.04); }
            100% { transform: translate3d(0, 0, 0) scale(1); }
          }

          @keyframes pulse {
            0% { box-shadow: 0 10px 28px rgba(37, 99, 235, 0.14); }
            50% { box-shadow: 0 14px 34px rgba(37, 99, 235, 0.2); }
            100% { box-shadow: 0 10px 28px rgba(37, 99, 235, 0.14); }
          }

          @media (max-width: 1040px) {
            .landingGrid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }

            .faqGrid {
              grid-template-columns: 1fr !important;
            }

            .landingGrid > section {
              min-width: 0;
            }
          }

          @media (max-width: 700px) {
            .landingPage {
              overflow-x: hidden;
            }

            .landingGrid {
              gap: 12px !important;
            }

            .landingContentWrap {
              padding: 12px !important;
            }

            .heroPanel {
              padding: 16px !important;
              border-radius: 14px !important;
            }

            .heroTitle {
              font-size: 1.55rem !important;
            }

            .heroLead {
              font-size: 0.95rem !important;
            }

            .heroCtaRow {
              flex-direction: column;
            }

            .heroCtaBtn {
              width: 100%;
            }

            .loginCard {
              padding: 18px !important;
              border-radius: 14px !important;
            }
          }
        `}</style>

        <div style={styles.landingBackground}>
          <div className="landingOrb orbA" />
          <div className="landingOrb orbB" />
          <div className="landingOrb orbC" />
        </div>

        <div style={styles.landingContentWrap} className="landingContentWrap">
          <div className="landingGrid" style={styles.landingGrid}>
            <section style={styles.heroPanel} className="heroPanel">
              <span style={styles.heroBadge}>STAFFGUIDE</span>
              <h1 className="heroTitle" style={styles.heroTitle}>
                Ge personalen rätt svar direkt under service
              </h1>
              <p className="heroLead" style={styles.heroLead}>
                Samla rutiner, recept och allergener i en enkel AI-guide. Mindre frågor i köket, snabbare onboarding och tryggare allergensvar.
              </p>

              <div style={styles.heroCtaRow} className="heroCtaRow">
                <button
                  type="button"
                  style={styles.heroCtaPrimary}
                  className="heroCtaBtn"
                  onClick={() => {
                    setLoginMode("company");
                    setError("");
                    requestAnimationFrame(() => {
                      const field = document.querySelector('input[placeholder="Företags-id eller företagsnamn"]');
                      if (field && typeof field.focus === "function") {
                        field.focus();
                      }
                    });
                  }}
                >
                  Kom igång nu
                </button>
                <button
                  type="button"
                  style={styles.heroCtaSecondary}
                  className="heroCtaBtn"
                  onClick={() => {
                    setLoginMode("employee");
                    setError("");
                  }}
                >
                  Personal-login
                </button>
              </div>

              <div style={styles.heroMetaRow}>
                <span style={styles.heroMetaChip}>Meny + recept i realtid</span>
                <span style={styles.heroMetaChip}>Säkrare svar om allergener</span>
                <span style={styles.heroMetaChip}>Byggt för iPad och mobil</span>
              </div>

              <div className="heroPulse" style={styles.heroVisualCard}>
                <p style={styles.heroVisualTitle}>Dagens prep</p>
                <ul style={styles.heroVisualList}>
                  <li>Degjäsning kontrollerad 09:00</li>
                  <li>Allergenlista verifierad inför lunch</li>
                  <li>Specialsås uppdaterad i receptbanken</li>
                </ul>
              </div>
            </section>

            <section style={styles.loginCard} className="loginCard">
              <h2 style={{ marginBottom: 6, color: "#0f172a" }}>Intern personalguide</h2>
              <p style={styles.subtitle}>Välj inloggningssätt</p>

              <div style={styles.loginModeRow}>
                <button
                  type="button"
                  style={{
                    ...styles.loginModeButton,
                    ...(loginMode === "company" ? styles.loginModeButtonActive : {})
                  }}
                  onClick={() => {
                    setLoginMode("company");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Företag
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.loginModeButton,
                    ...(loginMode === "employee" ? styles.loginModeButtonActive : {})
                  }}
                  onClick={() => {
                    setLoginMode("employee");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Anställd
                </button>
              </div>

              {loginMode === "company" && (
                <input
                  style={styles.input}
                  className="chatInput"
                  type="text"
                  placeholder="Företags-id eller företagsnamn"
                  value={companyIdentifier}
                  onChange={e => setCompanyIdentifier(e.target.value)}
                  disabled={loading}
                />
              )}

              <input
                style={styles.input}
                className="chatInput"
                type="password"
                placeholder="Restaurangens lösenord"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== "Enter" || loading) return;
                  if (loginMode === "company") {
                    login();
                  } else {
                    loginWithEmployeeCode();
                  }
                }}
                disabled={loading}
              />

              {loginMode === "employee" && (
                <>
                  <input
                    style={styles.input}
                    className="chatInput"
                    type="text"
                    placeholder="Din e-post"
                    value={employeeEmail}
                    onChange={e => setEmployeeEmail(e.target.value)}
                    disabled={loading}
                  />

                  <input
                    style={styles.input}
                    className="chatInput"
                    type="text"
                    placeholder="Namn (valfritt vid första kodbegäran)"
                    value={employeeName}
                    onChange={e => setEmployeeName(e.target.value)}
                    disabled={loading}
                  />

                  <input
                    style={styles.input}
                    className="chatInput"
                    type="text"
                    placeholder="Engångskod eller demo"
                    value={employeeCode}
                    onChange={e => setEmployeeCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !loading && loginWithEmployeeCode()}
                    disabled={loading}
                  />

                  <p style={styles.employeeLoginHint}>
                    Obs: <code>demo</code> fungerar endast lokalt i development.
                  </p>

                  <button
                    style={{ ...styles.secondaryButton, width: "100%", marginBottom: 10 }}
                    onClick={requestEmployeeCode}
                    disabled={loading}
                  >
                    {loading ? "Skickar kod..." : "Skicka engångskod"}
                  </button>
                </>
              )}

              {error && <p style={styles.error}>{error}</p>}

              <button
                style={styles.primaryButton}
                className="primaryButton"
                onClick={loginMode === "company" ? login : loginWithEmployeeCode}
                disabled={loading}
              >
                {loading ? "Loggar in..." : loginMode === "company" ? "Logga in" : "Logga in med kod"}
              </button>
            </section>
          </div>

          <section style={styles.faqSection}>
            <h3 style={styles.faqTitle}>Vanliga frågor</h3>
            <div className="faqGrid" style={styles.faqGrid}>
              {landingFaqs.map((item) => (
                <details key={item.question} style={styles.faqItem}>
                  <summary style={styles.faqSummary}>{item.question}</summary>
                  <p style={styles.faqAnswer}>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // APP
  return (
    <div style={styles.appContainer}>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap');

        :global(body) {
          font-family: 'Manrope', 'Segoe UI', sans-serif;
          background: #f8fafc;
          color: #0f172a;
        }

        .loginCard:hover { transform: translateY(-3px); }
        .primaryButton:hover { background: #1e40af; }
        .sendButton:hover { background: #1e40af; }
        .loginModeButton:hover { border-color: #93c5fd; background: #f8fbff; }
        .logoutButton:hover { background: #eff6ff; }
        .chatInput:focus { border-color: #2563eb; }
        input:focus, textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .adminSectionCard {
          background: #fff;
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
          background: #e0ebff;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.18);
        }
        .menuInlineItem:hover {
          color: #1e3a8a;
          text-decoration-thickness: 2px;
        }

        .typing { display: flex; gap: 4px; align-items: center; }
        .typing .dot {
          width: 8px; height: 8px;
          background: #2563eb;
          border-radius: 50%;
          animation: blink 1s infinite alternate;
        }
        .typing .dot:nth-child(2) { animation-delay: 0.2s; }
        .typing .dot:nth-child(3) { animation-delay: 0.4s; }

        @media (max-width: 768px) {
          .typing { display: flex; gap: 4px; }
          .adminTabsBar { padding: 12px 12px !important; gap: 6px !important; }
          .quickActionWrap { padding: 10px 12px 14px 12px !important; }
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
            grid-template-columns: 1fr;
            gap: 8px !important;
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
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
          background: #fff !important;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        button:active:not(:disabled) {
          transform: translateY(0px);
        }

        .adminTabButton:hover {
          background: #f1f5f9;
        }

        .adminSectionCard {
          background: #fff;
          border: 1px solid #e2e8f0;
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
          <h2 style={{ margin: 0 }}>{company.name}</h2>
          <span style={styles.headerSub}>STAFFGUIDE</span>
        </div>

        <div style={{ display: "flex", gap: 12 }} className="appHeaderActions">
          <button
            style={{
              ...styles.logoutButton,
              background: showPrep ? "#2563eb" : "#ffffff",
              color: showPrep ? "#ffffff" : "#1d4ed8"
            }}
            onClick={handlePrepClick}
          >
            {showPrep ? "Tillbaka till chat" : "Dagens prep"}
          </button>
          {company.is_admin && (
            <button
              style={{
                ...styles.logoutButton,
                background: showAdmin ? "#2563eb" : "#ffffff",
                color: showAdmin ? "#ffffff" : "#1d4ed8"
              }}
              onClick={handleAdminClick}
            >
              {showAdmin ? "Tillbaka" : "Admin"}
            </button>
          )}
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
            <h3 style={{ marginTop: 0 }}>Admin-lösenord krävs</h3>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Ange admin-lösenord för att komma åt admin-panelen</p>

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
              <p style={{ color: "#dc2626", fontSize: 14, marginBottom: 12 }}>
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
                style={{ ...styles.secondaryButton, flex: 1, background: "#e5edff", color: "#1e40af" }}
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
                      style={{ ...styles.secondaryButton, flex: 1 }}
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
                      style={{ ...styles.secondaryButton, flex: 1 }}
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
                      style={{ ...styles.secondaryButton, flex: 1 }}
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
                      style={{ ...styles.secondaryButton, flex: 1 }}
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

              {adminTab === "security" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Säkerhet & Åtkomst</h3>
                  <p style={styles.helperText}>Hantera åtkomst och byt lösenord vid behov.</p>

                  <div style={{ background: "#f3f4f6", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: 14 }}>
                      <strong>Status:</strong> Företaget är {company.active ? "aktiverat" : "deaktiverat"}
                    </p>
                  </div>

                  <button
                    style={{
                      ...styles.primaryButton,
                      background: company.active ? "#dc2626" : "#059669",
                      marginBottom: 24
                    }}
                    onClick={toggleCompanyStatus}
                    disabled={adminLoading}
                  >
                    {company.active ? "Deaktivera företag" : "Aktivera företag"}
                  </button>

                  <h4>Byt lösenord</h4>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nytt lösenord"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={adminLoading}
                  />

                  {adminMessage && (
                    <p style={{
                      ...styles.adminMessage,
                      color: adminMessage.includes("✅") ? "#059669" : "#dc2626"
                    }}>
                      {adminMessage}
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updatePassword}
                    disabled={adminLoading}
                  >
                    {adminLoading ? "Uppdaterar..." : "Uppdatera lösenord"}
                  </button>
                </div>
              )}

              {adminTab === "stats" && (
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
                    <div style={styles.statNumber}>{company.is_admin ? "Ja" : "Nej"}</div>
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
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  onClick={() => setFilteredPrepTasksDone(true)}
                  disabled={prepLoading || prepBulkUpdating}
                >
                  Markera synliga klara
                </button>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  onClick={() => setFilteredPrepTasksDone(false)}
                  disabled={prepLoading || prepBulkUpdating}
                >
                  Återställ synliga
                </button>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  onClick={() => fetchPrepTasks(prepDate)}
                  disabled={prepLoading || prepBulkUpdating}
                >
                  {prepLoading ? "Laddar..." : "Uppdatera"}
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

            {prepError && <p style={styles.error}>{prepError}</p>}

            {!prepError && !prepLoading && prepTasks.length === 0 && (
              <div style={styles.prepEmptyState}>
                Inga prep-uppgifter för idag. Be chefen lägga in en prep-mall i admin.
              </div>
            )}

            <div style={styles.prepList}>
              {visiblePrepTasks.map((task) => {
                const priorityMeta = getPriorityMeta(task.priority);
                const stationText = String(task.station || "").trim();
                const dueTimeText = String(task.due_time || "").trim();

                return (
                  <label key={task.id} style={styles.prepItem}>
                    <input
                      type="checkbox"
                      checked={!!task.is_done}
                      onChange={(e) => togglePrepTask(task.id, e.target.checked)}
                      disabled={prepLoading}
                    />
                    <div style={styles.prepItemBody}>
                      <span style={{
                        ...styles.prepItemText,
                        ...(task.is_done ? styles.prepItemDone : {})
                      }}>
                        {task.title}
                      </span>
                      <div style={styles.prepMetaRow}>
                        <span style={{ ...styles.prepMetaChip, ...priorityMeta.style }}>
                          Prioritet: {priorityMeta.label}
                        </span>
                        {stationText && <span style={styles.prepMetaChip}>Station: {stationText}</span>}
                        {dueTimeText && <span style={styles.prepMetaChip}>Klar före {dueTimeText}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
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
              >
                {msg.from === "ai" ? renderAiTextWithClickableMenuItems(msg, i) : msg.text}
                {msg.from === "ai" && Array.isArray(msg.menuItems) && msg.menuItems.length > 0 && (
                  <div style={styles.menuItemsWrap}>
                    <div style={styles.menuItemsTitle}>Tryck på en rätt för recept</div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={styles.aiBubble} className="typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
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
  loginPage: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  landingPage: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(145deg, #ffffff 0%, #f8fbff 52%, #eff6ff 100%)"
  },

  landingBackground: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none"
  },

  landingContentWrap: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1200,
    margin: "0 auto",
    padding: "30px 18px 34px"
  },

  landingGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.95fr",
    gap: 26,
    alignItems: "stretch"
  },

  heroPanel: {
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid #dbeafe",
    borderRadius: 24,
    padding: 28,
    backdropFilter: "blur(5px)",
    boxShadow: "0 12px 30px rgba(37, 99, 235, 0.1)"
  },

  heroBadge: {
    display: "inline-block",
    background: "#2563eb",
    color: "#ffffff",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 11,
    letterSpacing: "0.09em",
    fontWeight: 700,
    marginBottom: 12
  },

  heroTitle: {
    margin: "0 0 12px",
    fontSize: "2.5rem",
    lineHeight: 1.08,
    color: "#0f172a",
    fontWeight: 800,
    letterSpacing: "-0.02em"
  },

  heroLead: {
    margin: "0 0 18px",
    fontSize: "1.07rem",
    lineHeight: 1.55,
    color: "#334155",
    maxWidth: "58ch"
  },

  heroCtaRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16
  },

  heroCtaPrimary: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 44
  },

  heroCtaSecondary: {
    border: "1px solid #bfdbfe",
    background: "#fff",
    color: "#1d4ed8",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 44
  },

  heroMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18
  },

  heroMetaChip: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600
  },

  heroVisualCard: {
    background: "linear-gradient(155deg, #ffffff 0%, #eff6ff 100%)",
    border: "1px solid #dbeafe",
    borderRadius: 16,
    padding: "14px 14px 12px"
  },

  heroVisualTitle: {
    margin: "0 0 8px",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#1d4ed8"
  },

  heroVisualList: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 8,
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.45
  },

  loginCard: {
    background: "#ffffff",
    padding: 30,
    borderRadius: 16,
    width: "100%",
    maxWidth: 430,
    boxShadow: "0 10px 24px rgba(37,99,235,0.08)",
    border: "1px solid #dbeafe",
    textAlign: "center",
    boxSizing: "border-box",
    transition: "transform 0.2s, box-shadow 0.2s",
  },

  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 32,
    margin: "0 auto 20px auto"
  },

  subtitle: {
    marginBottom: 24,
    color: "#475569",
    fontSize: 14,
    fontWeight: 600
  },

  loginModeRow: {
    display: "flex",
    gap: 8,
    marginBottom: 14
  },

  loginModeButton: {
    flex: 1,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 600,
    cursor: "pointer"
  },

  loginModeButtonActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb"
  },

  employeeLoginHint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "left"
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 16,
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    background: "#fafbfc"
  },

  primaryButton: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(37,99,235,0.18)"
  },

  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontSize: 14
  },

  faqSection: {
    marginTop: 22,
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid #dbeafe",
    borderRadius: 20,
    padding: "20px 18px"
  },

  faqTitle: {
    margin: "0 0 12px",
    fontSize: 20,
    color: "#0f172a",
    letterSpacing: "-0.01em"
  },

  faqGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10
  },

  faqItem: {
    background: "#fff",
    border: "1px solid #dbeafe",
    borderRadius: 12,
    padding: 12
  },

  faqSummary: {
    cursor: "pointer",
    fontWeight: 700,
    color: "#1e3a8a",
    fontSize: 15,
    lineHeight: 1.35
  },

  faqAnswer: {
    margin: "10px 0 0",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.5
  },

  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    minHeight: "100vh",
    background: "#f8fafc"
  },

  header: {
    padding: "18px 28px",
    background: "#ffffff",
    color: "#0f172a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 2px 12px rgba(15,23,42,0.04)"
  },

  headerSub: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
    letterSpacing: 0.3
  },

  logoutButton: {
    background: "#ffffff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
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
    background: "#f8fafc"
  },

  emptyStateCard: {
    alignSelf: "center",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "14px 16px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 3px 10px rgba(0,0,0,0.04)"
  },

  emptyStateTitle: {
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4
  },

  emptyStateText: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 1.5
  },

  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
    padding: 14,
    borderRadius: "16px 16px 6px 16px",
    maxWidth: "76%",
    boxShadow: "0 10px 22px rgba(37,99,235,0.24)",
    animation: "fadeIn 0.2s"
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "#ffffff",
    padding: 14,
    borderRadius: "16px 16px 16px 6px",
    maxWidth: "76%",
    whiteSpace: "pre-wrap",
    boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
    border: "1px solid #e2e8f0",
    animation: "fadeIn 0.2s"
  },

  menuItemsWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed #d1d5db"
  },

  menuItemsTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#4b5563",
    marginBottom: 8
  },

  menuInlineText: {
    color: "#1d4ed8"
  },

  menuInlineItemButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: "#1d4ed8",
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
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
    transition: "transform 0.15s, box-shadow 0.2s, background 0.2s"
  },

  quickActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "12px 18px 14px 18px",
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    borderBottom: "1px solid #e2e8f0"
  },

  quickActionButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e40af",
    borderRadius: 10,
    padding: "12px 18px",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform 0.15s, box-shadow 0.2s, background 0.2s",
    boxShadow: "0 1px 3px rgba(37,99,235,0.08)"
  },

  inputArea: {
    display: "flex",
    padding: "12px 18px 18px 18px",
    background: "#ffffff",
    boxShadow: "0 -2px 10px rgba(15,23,42,0.04)",
    borderTop: "1px solid #e2e8f0"
  },

  chatInput: {
    flex: 1,
    padding: "14px 16px",
    fontSize: 16,
    borderRadius: 12,
    border: "1.5px solid #cbd5e1",
    marginRight: 12,
    boxSizing: "border-box",
    outline: "none",
    background: "#fafbfc",
    transition: "border-color 0.2s, box-shadow 0.2s"
  },

  sendButton: {
    background: "#2563eb",
    color: "#fff",
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
    background: "#f8fafc"
  },

  prepCard: {
    maxWidth: 760,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
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
    color: "#475569",
    marginBottom: 6,
    fontWeight: 600
  },

  prepProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden"
  },

  prepProgressFill: {
    height: "100%",
    background: "#2563eb",
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
    color: "#374151"
  },

  prepSelect: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    minWidth: 170
  },

  prepEmptyState: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: 10,
    padding: 12,
    color: "#475569",
    marginBottom: 12
  },

  prepList: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  prepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "14px 14px",
    background: "#f9fafb",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    transition: "border-color 0.15s, box-shadow 0.15s",
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
    color: "#111827",
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
    background: "#eef2ff",
    color: "#3730a3",
    border: "1px solid #c7d2fe"
  },

  prepPriorityHigh: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca"
  },

  prepPriorityMedium: {
    background: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a"
  },

  prepPriorityLow: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0"
  },

  prepItemDone: {
    textDecoration: "line-through",
    color: "#6b7280"
  },

  prepTemplateTableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff"
  },

  prepTemplateTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 620
  },

  prepTemplateTh: {
    textAlign: "left",
    fontSize: 12,
    color: "#4b5563",
    padding: "10px 8px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb"
  },

  prepTemplateTd: {
    padding: 8,
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top"
  },

  prepTemplateInput: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box"
  },

  prepTemplateSelect: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box",
    background: "#fff"
  },

  prepDeleteRowButton: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#991b1b",
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
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    background: "#eff6ff",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700
  },

  recipeSidebar: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#f8fafc",
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
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#1f2937",
    borderRadius: 8,
    padding: "8px 10px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600
  },

  recipeListButtonActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#1d4ed8"
  },

  recipeListMeta: {
    color: "#6b7280",
    fontWeight: 500
  },

  recipeInactiveTag: {
    color: "#b91c1c",
    fontWeight: 700
  },

  recipeEditor: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff",
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
    background: "#f8fafc",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden"
  },

  adminTabs: {
    display: "flex",
    gap: 8,
    padding: "16px 24px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    overflowX: "auto",
    flexShrink: 0
  },

  adminTab: {
    padding: "12px 16px",
    minHeight: 44,
    border: "none",
    background: "transparent",
    color: "#6b7280",
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
    background: "#2563eb",
    color: "#fff"
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
    color: "#374151",
    marginBottom: 8,
    marginTop: 16
  },

  helperText: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12
  },

  lastSavedText: {
    margin: "0 0 12px 2px",
    color: "#4b5563",
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
    background: "linear-gradient(180deg, rgba(248,250,252,0), #f8fafc 28%)"
  },

  secondaryButton: {
    width: "auto",
    padding: 12,
    fontSize: 15,
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.15s, transform 0.1s"
  },

  adminMessage: {
    paddingBottom: 12,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16
  },

  statCard: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    textAlign: "center"
  },

  statNumber: {
    fontSize: 36,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 8
  },

  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: 500
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },

  modalContent: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    maxWidth: 400,
    width: "90%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
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