  async function findAlternatives() {
    const med = input.value.trim();
    if (!med) { input.focus(); return; }

    btn.disabled = true;
    btn.textContent = 'Searching…';
    area.innerHTML = `<div class="loader"><div class="spinner"></div>Finding alternatives for <strong style="color:#fff;">${med}</strong>…</div>`;

    try {
      const response = await fetch(`/api/cosine-alternatives?med=${encodeURIComponent(med)}`);
      const data = await response.json();
      const results = data.results;

      if (!Array.isArray(results) || results.length === 0) throw new Error('No results');

      const rows = results.map(r => `
        <tr>
          <td>${r.brand || '—'}</td>
          <td>${r.name || '—'}</td>
          <td>${r.chemical_composition || '—'}</td>
          <td class="price-tag">$${parseFloat(r.price).toFixed(2)}</td>
          <td><span class="badge-form">${r.form || '—'}</span></td>
        </tr>
      `).join('');

      area.innerHTML = `
        <div class="results-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Name</th>
                <th>Chemical Composition</th>
                <th>Price</th>
                <th>Form</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="result-meta">${results.length} alternatives found · sorted by price · </p>
        </div>
      `;

    } catch (err) {
      area.innerHTML = `
        <div class="state-box">
          <span class="state-icon">⚠️</span>
          <p>Could not fetch alternatives for <strong style="color:#fff;">${med}</strong>.<br>
          Please check the medicine name and try again.</p>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Find Alternatives';
    }
  }
