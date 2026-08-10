import { get, set, del, keys, getMany, createStore } from "idb-keyval";

const db = createStore("sonneto", "kv");

const SEED_CATEGORIES = [
  { id: "c1", name: "Heavy days", color: "#8886C9" },
  { id: "c2", name: "Ideas", color: "#8FA98C" },
];

let healthy = true;

async function loadAll() {
  try {
    const allKeys = await keys(db);
    const entryKeys = allKeys.filter((k) => typeof k === "string" && k.startsWith("entry:"));
    const values = await getMany(entryKeys, db);
    const entries = values.filter((v) => v != null);
    const categories = await get("categories", db);
    return {
      entries,
      categories: Array.isArray(categories) ? categories : SEED_CATEGORIES,
    };
  } catch (err) {
    console.error("loadAll failed", err);
    return { entries: [], categories: SEED_CATEGORIES };
  }
}

async function saveEntry(entry) {
  try {
    await set(`entry:${entry.id}`, entry, db);
    return true;
  } catch (err) {
    console.error("saveEntry failed", err);
    healthy = false;
    return false;
  }
}

async function deleteEntry(id) {
  try {
    await del(`entry:${id}`, db);
    return true;
  } catch (err) {
    console.error("deleteEntry failed", err);
    healthy = false;
    return false;
  }
}

async function saveCategories(categories) {
  try {
    await set("categories", categories, db);
    return true;
  } catch (err) {
    console.error("saveCategories failed", err);
    healthy = false;
    return false;
  }
}

async function saveDraft(text) {
  try {
    await set("draft:current", { text, at: Date.now() }, db);
    return true;
  } catch (err) {
    console.error("saveDraft failed", err);
    healthy = false;
    return false;
  }
}

async function loadDraft() {
  try {
    const record = await get("draft:current", db);
    return record?.text ?? "";
  } catch (err) {
    console.error("loadDraft failed", err);
    return "";
  }
}

async function clearDraft() {
  try {
    await del("draft:current", db);
    return true;
  } catch (err) {
    console.error("clearDraft failed", err);
    healthy = false;
    return false;
  }
}

async function _doMigrate() {
  try {
    const migrated = await get("migrated", db);
    if (migrated) return false;

    let imported = false;
    try {
      const raw = localStorage.getItem("dusk-journal:v1");
      if (raw) {
        const data = JSON.parse(raw);
        if (data) {
          if (Array.isArray(data.entries)) {
            for (const entry of data.entries) {
              if (entry && entry.id) {
                await saveEntry(entry);
                imported = true;
              }
            }
          }
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            await saveCategories(data.categories);
            imported = true;
          }
        }
      }
    } catch (err) {
      console.error("migrateFromLocalStorage: could not read stored data", err);
    }

    /* leave the localStorage key in place as a fallback copy */
    await set("migrated", true, db);
    return imported;
  } catch (err) {
    console.error("migrateFromLocalStorage failed", err);
    return false;
  }
}

let migrating = null;
function migrateFromLocalStorage() {
  if (!migrating) migrating = _doMigrate();
  return migrating;
}

function storageHealthy() {
  return healthy;
}

async function probeStorage() {
  try {
    await set("__probe", Date.now(), db);
    await del("__probe", db);
    healthy = true;
    return true;
  } catch (err) {
    console.error("probeStorage failed", err);
    healthy = false;
    return false;
  }
}

async function importBackup(parsed) {
  try {
    let entries = 0;
    let categories = 0;

    if (parsed && Array.isArray(parsed.entries)) {
      const now = Date.now();
      for (const raw of parsed.entries) {
        if (!raw || typeof raw.id !== "string" || !raw.id || typeof raw.text !== "string") continue;
        const entry = {
          id: raw.id,
          text: raw.text,
          createdAt: Number(raw.createdAt) || now,
          updatedAt: Number(raw.updatedAt) || now,
          categoryId: typeof raw.categoryId === "string" ? raw.categoryId : null,
        };
        await saveEntry(entry);
        entries++;
      }
    }

    const existing = await get("categories", db);
    const union = Array.isArray(existing) ? existing.slice() : [];
    const seen = new Set(union.map((c) => c.id));
    if (parsed && Array.isArray(parsed.categories)) {
      for (const raw of parsed.categories) {
        if (!raw || typeof raw.id !== "string" || !raw.id) continue;
        if (!seen.has(raw.id)) {
          union.push({
            id: raw.id,
            name: typeof raw.name === "string" ? raw.name : "Untitled",
            color: typeof raw.color === "string" ? raw.color : "#9E9AB8",
          });
          seen.add(raw.id);
          categories++;
        }
      }
    }

    if (Array.isArray(existing) || union.length > 0) await saveCategories(union);
    return { entries, categories };
  } catch (err) {
    console.error("importBackup failed", err);
    return { entries: 0, categories: 0 };
  }
}

async function seenIntro() {
  try {
    return (await get("seen:intro", db)) === true;
  } catch (err) {
    console.error("seenIntro failed", err);
    return false;
  }
}

async function markIntroSeen() {
  try {
    await set("seen:intro", true, db);
  } catch (err) {
    console.error("markIntroSeen failed", err);
  }
}

async function getTheme() {
  try {
    const v = await get("pref:theme", db);
    return v === "light" || v === "dark" ? v : null;
  } catch (err) {
    console.error("getTheme failed", err);
    return null;
  }
}

async function setTheme(v) {
  try {
    await set("pref:theme", v, db);
    return true;
  } catch (err) {
    console.error("setTheme failed", err);
    healthy = false;
    return false;
  }
}

async function seenFiling() {
  try {
    return (await get("seen:filing", db)) === true;
  } catch (err) {
    console.error("seenFiling failed", err);
    return false;
  }
}

async function markFilingSeen() {
  try {
    await set("seen:filing", true, db);
  } catch (err) {
    console.error("markFilingSeen failed", err);
  }
}

async function exportAll() {
  try {
    const { entries, categories } = await loadAll();
    return { entries, categories, exportedAt: new Date().toISOString() };
  } catch (err) {
    console.error("exportAll failed", err);
    return {
      entries: [],
      categories: SEED_CATEGORIES,
      exportedAt: new Date().toISOString(),
    };
  }
}

export {
  loadAll,
  saveEntry,
  deleteEntry,
  saveCategories,
  migrateFromLocalStorage,
  exportAll,
  saveDraft,
  loadDraft,
  clearDraft,
  storageHealthy,
  probeStorage,
  importBackup,
  seenIntro,
  markIntroSeen,
  getTheme,
  setTheme,
  seenFiling,
  markFilingSeen,
};
