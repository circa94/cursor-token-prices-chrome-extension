// Early injection script - intercepts fetch/XHR before page scripts run
(function () {
  'use strict';

  const scriptContent = `
    (function () {
      'use strict';

      window.__cursorTokenPricesActive = true;

      const API_PATTERNS = [
        /get-filtered-usage-events/,
        /get-usage-events/,
        /\\/api\\/dashboard\\/.*usage/,
        /\\/api\\/usage/,
      ];

      function isApiUrl(url) {
        if (!url) return false;
        const urlString = typeof url === 'string' ? url : url?.url || url?.toString?.() || '';
        return API_PATTERNS.some((p) => p.test(urlString));
      }

      function extractEvents(data) {
        const events = data.usageEventsDisplay || data.events || [];
        return {
          events,
          totalEvents: data.totalUsageEventsCount || events.length,
          totalCostCents: events.reduce((sum, e) => sum + (e.tokenUsage?.totalCents || 0), 0),
          lastUpdated: new Date(),
        };
      }

      function dispatchData(data) {
        window.__cursorUsageData = data;
        window.dispatchEvent(new CustomEvent('cursor-usage-data', { detail: data }));
      }

      // Intercept fetch
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const url = args[0];
        const response = await originalFetch.apply(this, args);

        if (isApiUrl(url)) {
          try {
            const data = extractEvents(await response.clone().json());
            dispatchData(data);
          } catch (e) {
            console.error('[Cursor Token Prices] Error processing fetch:', e);
          }
        }
        return response;
      };

      // Intercept XHR
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._url = url;
        return originalXHROpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        const xhr = this;

        if (isApiUrl(xhr._url)) {
          const onReady = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
              try {
                dispatchData(extractEvents(JSON.parse(xhr.responseText)));
              } catch (e) {
                console.error('[Cursor Token Prices] Error processing XHR:', e);
              }
            }
          };

          const original = xhr.onreadystatechange;
          xhr.onreadystatechange = function () {
            onReady();
            if (original) original.apply(this, arguments);
          };
        }
        return originalXHRSend.apply(this, args);
      };
    })();
  `;

  const script = document.createElement('script');
  script.textContent = scriptContent;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
})();
