export const renderLeafModal = ({ leaves, query, selectedLeafId }) => {
  const rows = leaves.length
    ? leaves
        .map(
          (leaf) => `
            <button
              type="button"
              class="leaf-result ${leaf.id === selectedLeafId ? "is-active" : ""}"
              data-action="select-leaf"
              data-leaf-id="${leaf.id}"
            >
              <div>
                <strong>${leaf.name}</strong>
                <span>${leaf.cardinalName}</span>
              </div>
              <div class="leaf-result__meta">
                <span>Atual: ${leaf.currentValue}</span>
                <span>Prazo: ${leaf.horizonLabel}</span>
              </div>
            </button>
          `
        )
        .join("")
    : `<p class="empty-state">Nenhuma folha encontrada para "${query}".</p>`;

  return `
    <div class="modal is-open" role="dialog" aria-modal="true" aria-labelledby="leaf-modal-title">
      <div class="modal__backdrop" data-action="close-modal"></div>
      <div class="modal__panel">
        <header class="modal__header">
          <div>
            <p class="eyebrow">Próximo passo concreto</p>
            <h3 id="leaf-modal-title">Buscar folhas</h3>
          </div>
          <button type="button" class="icon-button" data-action="close-modal" aria-label="Fechar modal">×</button>
        </header>
        <label class="field">
          <span>Procurar folhas</span>
          <input
            type="search"
            placeholder="Digite o nome, cardinal ou observação"
            value="${query.replace(/"/g, "&quot;")}"
            data-field="leaf-search"
          />
        </label>
        <div class="modal__results">
          ${rows}
        </div>
      </div>
    </div>
  `;
};
