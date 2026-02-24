// Cursor Token Prices Extension - Displays API costs in the Cursor usage table
(function () {
  'use strict';

  const store = { events: [], totalEvents: 0, totalCostCents: 0 };
  const assignedEvents = new Set();
  const processedRows = new Set();

  const formatCents = (cents) => {
    if (cents == null) return '-';
    const dollars = cents / 100;
    return dollars < 0.01 ? `$${dollars.toFixed(3)}` : `$${dollars.toFixed(2)}`;
  };

  const getRowId = (row, index) => {
    const ts = row.querySelector('[title*="Feb"], [title*="Jan"], [title*="2026"]');
    if (ts) return ts.getAttribute('title') || ts.textContent;
    const text = row.textContent?.substring(0, 100);
    return text ? `${index}-${text}` : null;
  };

  const findMatchingEvent = (rowText, rowIndex) => {
    if (!store.events.length) return null;

    // Match by position (both sorted newest first)
    if (rowIndex > 0 && rowIndex <= store.events.length) {
      const ev = store.events[rowIndex - 1];
      if (ev && !assignedEvents.has(ev.timestamp)) {
        assignedEvents.add(ev.timestamp);
        return ev;
      }
    }

    // Fallback: match by model
    const match = rowText.match(/(kimi-k2\.5|gpt-5\.3-codex[^\s]*|claude-4\.6-opus[^\s]*|composer-1[^\s]*|auto)/i);
    const rowModel = match?.[1].toLowerCase();

    if (rowModel) {
      for (const ev of store.events) {
        if ((ev.model || '').toLowerCase().includes(rowModel) && !assignedEvents.has(ev.timestamp)) {
          assignedEvents.add(ev.timestamp);
          return ev;
        }
      }
    }

    // Last resort: first unassigned
    for (const ev of store.events) {
      if (!assignedEvents.has(ev.timestamp)) {
        assignedEvents.add(ev.timestamp);
        return ev;
      }
    }
    return null;
  };

  const injectIntoTable = () => {
    if (!store.events.length) return;

    document
      .querySelectorAll('.dashboard-table-rows, [role="rowgroup"], .dashboard-table-container')
      .forEach((container) => {
        container.querySelectorAll('[role="row"], .dashboard-table-row').forEach((row, idx) => {
          if (row.querySelector('[role="columnheader"], .dashboard-table-header')) return;

          const rowId = getRowId(row, idx);
          if (!rowId || processedRows.has(rowId)) return;

          const ev = findMatchingEvent(row.textContent || '', idx);
          if (!ev) return;

          const cost = ev.tokenUsage?.totalCents || 0;
          if (!cost) return;

          const cells = row.querySelectorAll('[role="cell"], .dashboard-table-cell');
          const costCell = cells[cells.length - 1];
          if (!costCell || costCell.querySelector('.cursor-cost-badge-inline')) return;

          const badge = document.createElement('span');
          badge.className = 'cursor-cost-badge-inline';
          badge.textContent = formatCents(cost);
          badge.title = [
            `Model: ${ev.model}`,
            `Input: ${(ev.tokenUsage?.inputTokens || 0).toLocaleString()}`,
            `Output: ${(ev.tokenUsage?.outputTokens || 0).toLocaleString()}`,
            `Cache: ${(ev.tokenUsage?.cacheReadTokens || 0).toLocaleString()}`,
            '',
            `Total: ${ev.tokenUsage?.totalCents} cents`,
          ].join('\n');

          costCell.appendChild(badge);
          processedRows.add(rowId);
        });
      });
  };

  const watchForTableChanges = () => {
    injectIntoTable();

    const observer = new MutationObserver((mutations) => {
      const shouldInject = mutations.some((m) =>
        Array.from(m.addedNodes).some(
          (n) =>
            n.nodeType === Node.ELEMENT_NODE &&
            (n.matches?.('[role="row"], .dashboard-table-row') ||
              n.querySelector?.('[role="row"], .dashboard-table-row'))
        )
      );
      if (shouldInject) injectIntoTable();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    let attempts = 0;
    const interval = setInterval(() => {
      injectIntoTable();
      if (++attempts >= 10) clearInterval(interval);
    }, 500);
  };

  const processApiResponse = (data) => {
    if (!data || typeof data !== 'object') return;

    const events = data.events || data.usageEventsDisplay || [];
    if (!events.length) return;

    store.events = events;
    store.totalEvents = data.totalEvents || data.totalUsageEventsCount || events.length;
    store.totalCostCents = events.reduce((sum, e) => sum + (e.tokenUsage?.totalCents || 0), 0);

    watchForTableChanges();
  };

  // Initialize
  window.addEventListener('cursor-usage-data', (e) => processApiResponse(e.detail));

  if (window.__cursorUsageData?.events?.length) {
    processApiResponse(window.__cursorUsageData);
    return;
  }

  const interval = setInterval(() => {
    if (window.__cursorUsageData?.events?.length) {
      processApiResponse(window.__cursorUsageData);
      clearInterval(interval);
    }
  }, 500);

  setTimeout(() => clearInterval(interval), 30000);
})();
