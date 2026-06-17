import { getLeafDisplayName } from "./variableService.js";

export const findLeaves = (baseVariables, query = "") => {
  const normalized = query.trim().toLowerCase();
  return [...baseVariables]
    .filter((leaf) => !leaf.deleted)
    .filter((leaf) => {
      if (!normalized) return true;
      const displayName = getLeafDisplayName(leaf).toLowerCase();
      return (
        displayName.includes(normalized) ||
        leaf.note.toLowerCase().includes(normalized) ||
        leaf.cardinalName?.toLowerCase().includes(normalized) ||
        leaf.nodeName?.toLowerCase().includes(normalized)
      );
    })
    .sort((a, b) => a.horizonDays - b.horizonDays || getLeafDisplayName(a).localeCompare(getLeafDisplayName(b), "pt-BR"));
};
