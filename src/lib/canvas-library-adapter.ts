'use client';

// localStorage key for persisting library items
const LIBRARY_STORAGE_KEY = 'excalidraw-library';

// Bundled default library file paths (served from public/libraries/)
const BUNDLED_LIBRARY_PATHS = [
  '/libraries/basic-ux-wireframing-elements.excalidrawlib',
  '/libraries/decision-flow-control.excalidrawlib',
  '/libraries/gantt.excalidrawlib',
  '/libraries/system-design-template.excalidrawlib',
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LibraryItemsAny = any[];

/**
 * Load and merge all bundled .excalidrawlib files from public/libraries/.
 * Returns an empty array if any fetch fails (graceful degradation).
 */
async function loadBundledDefaults(): Promise<LibraryItemsAny> {
  const allItems: LibraryItemsAny = [];

  for (const path of BUNDLED_LIBRARY_PATHS) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;
      const data = await response.json();
      // Each .excalidrawlib file has a `libraryItems` array
      if (Array.isArray(data?.libraryItems)) {
        allItems.push(...data.libraryItems);
      }
    } catch {
      // Non-fatal — skip this file
    }
  }

  return allItems;
}

/**
 * localStorage-backed LibraryPersistenceAdapter for Excalidraw.
 *
 * On first use (no stored data), loads the 4 bundled default libraries
 * from public/libraries/ so users start with a useful set.
 * Subsequent loads return the persisted user library.
 */
export const canvasLibraryAdapter = {
  async load(_metadata: { source: 'load' | 'save' }): Promise<{ libraryItems: LibraryItemsAny } | null> {
    try {
      const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return { libraryItems: parsed };
        }
      }
    } catch {
      // Corrupted storage — fall through to defaults
    }

    // First use: load bundled defaults
    const defaults = await loadBundledDefaults();
    if (defaults.length > 0) {
      // Persist the defaults so future loads are fast
      try {
        localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(defaults));
      } catch {
        // Storage full — proceed without persisting
      }
      return { libraryItems: defaults };
    }

    return null;
  },

  async save(libraryData: { libraryItems: LibraryItemsAny }): Promise<void> {
    try {
      localStorage.setItem(
        LIBRARY_STORAGE_KEY,
        JSON.stringify(libraryData.libraryItems)
      );
    } catch {
      // Storage full — silently fail, library still works in-session
    }
  },
};
