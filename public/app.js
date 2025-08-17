document.addEventListener('DOMContentLoaded', function() {
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const originalUrl = document.getElementById('originalUrl');
  const resultDiv = document.getElementById('result');
  const trackingUrl = document.getElementById('trackingUrl');
  const linksTable = document.getElementById('linksTable');

  generateBtn.addEventListener('click', async () => {
    if (!originalUrl.value) return alert('Please enter URL');
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl: originalUrl.value })
      });
      
      const data = await res.json();
      trackingUrl.textContent = data.trackingUrl;
      resultDiv.style.display = 'block';
      loadLinks();
    } catch (err) {
      alert('Failed to create link');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate';
    }
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(trackingUrl.textContent)
      .then(() => alert('Copied!'))
      .catch(() => alert('Copy failed'));
  });

async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    const links = await res.json();

    const rows = await Promise.all(links.map(async link => {
      const analyticsRes = await fetch(`/api/links/${link.trackingId}/analytics`);
      const analytics = await analyticsRes.json();

      const clickRows = analytics.clickData.map(click => {
        const loc = click
          ? `<a href="https://www.google.com/maps?q=${click.latitude},${click.longitude}" target="_blank">${click.latitude}, ${click.longitude}</a>`
          : 'N/A';
        return `
          <tr>
            <td>${new Date(click.timestamp).toLocaleString()}</td>
            <td>${click.ip || 'N/A'}</td>
            <td>${click.deviceType || 'Unknown'}</td>
            <td>${click.country || 'Unknown'}</td>
            <td>${loc}</td>
          </tr>
        `;
      }).join('');

      if (link.trackings === undefined) 
        link.trackings = [];
      console.log(`Tracking entries for link ${link.trackingId}:`, link.trackings);
      const trackingRows = (link.trackings || []).map(track => {
        console.log(`Tracking click for link`);
        const loc = track.location
          ? `<a href="https://www.google.com/maps?q=${track.location.lat},${track.location.lng}" target="_blank">${track.location.lat}, ${track.location.lng}</a>`
          : 'N/A';
        return `
          <tr>
            <td>${new Date(track.timestamp).toLocaleString()}</td>
            <td>${loc}</td>
            <td>${track.location?.accuracy || 'N/A'}</td>
            <td>${track.location?.source || 'Unknown'}</td>
          </tr>
        `;
        console.log(`Tracking click for link ${link.trackingId} from IP ${track.ipAddress} (${track.country})`);
      }).join('');

      return `
        <tr>
          <td><a href="${link.originalUrl}" target="_blank">${link.originalUrl.slice(0, 40)}${link.originalUrl.length > 40 ? '...' : ''}</a></td>
          <td><a href="/r/${link.trackingId}" target="_blank">${link.trackingId}</a></td>
          <td>${link.clicks.length}</td>
          <td>${new Date(link.createdAt).toLocaleDateString()}</td>
          <td>
            <a href="/api/links/${link.trackingId}/analytics" target="_blank">Raw</a> |
            <a href="/details.html?trackingId=${link.trackingId}" target="_blank">Details</a>
            <details style="margin-top: 8px;">
              <summary>Click Data</summary>
              <table style="width: 100%; margin-top: 8px; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="border: 1px solid #ccc; padding: 4px;">Timestamp</th>
                    <th style="border: 1px solid #ccc; padding: 4px;">IP</th>
                    <th style="border: 1px solid #ccc; padding: 4px;">Device</th>
                    <th style="border: 1px solid #ccc; padding: 4px;">Country</th>
                    <th style="border: 1px solid #ccc; padding: 4px;">Location</th>
                  </tr>
                </thead>
                <tbody>${clickRows}</tbody>
              </table>
            </details>
            <details style="margin-top: 8px;">
              <summary>Tracking Logs</summary>
              <table style="width: 100%; margin-top: 8px; border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="border: 1px solid #ccc; padding: 4px;">Timestamp</th>
                    <th style="border: 1px solid #ccc; padding: 4px;">Location</th>
                    <th style="border: 1px solid #ccc; padding: 4px;">Accuracy</th>
                    <th style="border: 1px solid #ccc; padding: 4px;">Source</th>
                  </tr>
                </thead>
                <tbody>${trackingRows}</tbody>
              </table>
            </details>
          </td>
        </tr>
      `;
    }));

    linksTable.innerHTML = rows.length === 0 ? '<tr><td colspan="5">N/A</td></tr>' : rows.join('');
  } catch (err) {
    linksTable.innerHTML = '<tr><td colspan="5">Error loading links</td></tr>';
  }
}

  loadLinks();
});