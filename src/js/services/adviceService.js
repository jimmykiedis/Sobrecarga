export const findLeaves = (baseVariables, query = "") => {
  const normalized = query.trim().toLowerCase();
  return [...baseVariables]
    .filter((leaf) => {
      if (!normalized) return true;
      return (
        leaf.name.toLowerCase().includes(normalized) ||
        leaf.note.toLowerCase().includes(normalized) ||
        leaf.cardinalName?.toLowerCase().includes(normalized) ||
        leaf.nodeName?.toLowerCase().includes(normalized)
      );
    })
    .sort((a, b) => a.horizonDays - b.horizonDays || a.name.localeCompare(b.name, "pt-BR"));
};
