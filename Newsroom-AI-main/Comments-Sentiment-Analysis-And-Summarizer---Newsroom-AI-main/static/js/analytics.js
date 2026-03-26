/*
  analytics.js (Clean Backend-Driven Version + Clusters)
*/

const API_BASE = "http://127.0.0.1:8000/api/analytics";

let analytics = null;
let currentArticleId = null;

// ===============================
// FETCH ANALYTICS
// ===============================
async function loadAnalytics(articleId) {

  currentArticleId = articleId;

  try {
    const res = await fetch(`${API_BASE}/${articleId}`);
    if (!res.ok) throw new Error("API not ready");

    analytics = await res.json();
    console.log("✅ Loaded backend analytics");

    initDashboard();

  } catch (e) {
    console.error("❌ Failed to load analytics:", e);
  }
}

// ===============================
// LOAD ML SUMMARY
// ===============================
async function loadMLSummary() {

  try {
    const res = await fetch(`http://127.0.0.1:8000/articles/${currentArticleId}/summary`);
    if (!res.ok) return;

    const summary = await res.json();

    if (summary.error) {
      document.getElementById('ai-summary').textContent = summary.error;
      return;
    }

    document.getElementById('ai-summary').innerHTML = `
      <strong>Quick Overview:</strong><br>
      ${summary.short}
      <br><br>
      <strong>Detailed Insight:</strong><br>
      ${summary.medium}
    `;

  } catch (e) {
    console.warn("⚠ Could not load ML summary");
  }
}

// ===============================
// LOAD CLUSTERS
// ===============================
async function loadClusters() {

  try {
    const res = await fetch(`http://127.0.0.1:8000/articles/${currentArticleId}/clusters`);
    if (!res.ok) return;

    const clusters = await res.json();
    if (!Array.isArray(clusters) || clusters.length === 0) return;

    renderClusterChart(clusters);

  } catch (e) {
    console.warn("⚠ Could not load clusters");
  }
}

// ===============================
// RENDER FUNCTIONS
// ===============================
function renderHeader() {
  const titleEl = document.querySelector('.ai-header h1');
  if (titleEl && analytics.article.title) {
    titleEl.textContent = `Article: ${analytics.article.title}`;
  }

  document.getElementById('meta-source').textContent = `Source: ${analytics.article.source}`;
  document.getElementById('meta-category').textContent = `Category: ${analytics.article.category}`;
  document.getElementById('meta-pubtime').textContent = `Published: ${analytics.article.published}`;
  document.getElementById('meta-comments').textContent = `Comments: ${analytics.article.totalComments}`;
}

function renderKPIs() {
  const container = document.getElementById('kpi-cards');
  container.innerHTML = "";

  analytics.kpis.forEach(k => {
    const div = document.createElement('div');
    div.className = 'kpi-card';

    div.innerHTML = `
      <div class="title">${k.title}</div>
      <div class="value">${k.value}</div>
      <div class="subtitle">${k.subtitle || ""}</div>
    `;

    container.appendChild(div);
  });
}

function renderSentimentChart() {

  const labels = Object.keys(analytics.sentimentDist);
  const values = Object.values(analytics.sentimentDist);

  new Chart(document.getElementById('sentimentChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: "Sentiment Distribution (%)",
        data: values,
        backgroundColor: [
          '#6b7280', // neutral (grey)
          '#ef4444', // anger / bad (red)
          '#f59e0b', // fear / warning (yellow/orange)
          '#10b981', // joy / good (green)
          '#6366f1', // sadness / misc (blue/indigo)
          '#87939F'  // disgust / unknown (slate/greyish)
        ]
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function renderTrendChart() {

  if (!analytics.sentimentTrend || analytics.sentimentTrend.length === 0) {
    return;
  }

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: analytics.sentimentTrend.map((_, i) => `Comment ${i + 1}`),
      datasets: [{
        label: "Negative Sentiment Trend",
        data: analytics.sentimentTrend,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.2)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true
    }
  });
}

function renderClusterChart(clusters) {

  const labels = clusters.map(c => c.headline);
  const values = clusters.map(c => c.percentage);

  new Chart(document.getElementById('clusterChart'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: "Cluster Share (%)",
        data: values,
        backgroundColor: [
          '#1d4ed8', // blue
          '#ef4444', // red
          '#10b981', // green
          '#f59e0b', // yellow/orange
          '#8b5cf6', // purple
          '#14b8a6'  // teal
        ]
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

// ===============================
// EXPORT FUNCTIONS
// ===============================
function attachExportListeners() {
  document.getElementById('export-pdf').addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    // Target the entire dashboard
    const content = document.getElementById('dashboard-root');

    // Temporarily hide buttons for clean export
    const buttons = document.querySelector('.export-buttons');
    if (buttons) buttons.style.display = 'none';

    try {
      const canvas = await html2canvas(content, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      doc.save(`${analytics.article.title}_Analytics.pdf`);
    } catch (e) {
      console.error("PDF Export failed:", e);
      alert("Failed to export PDF.");
    } finally {
      if (buttons) buttons.style.display = 'block';
    }
  });

  document.getElementById('export-excel').addEventListener('click', async () => {
    if (!currentArticleId) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/articles/${currentArticleId}/comments`);
      if (!res.ok) throw new Error("Could not fetch comments");
      const comments = await res.json();

      const wb = XLSX.utils.book_new();

      const exportData = [
        ["Total Comments", comments.length],
        [],
        ["Article ID", "Comment", "Emotion Label", "Emotion Score"]
      ];

      comments.forEach(c => {
        exportData.push([
          c.article_id || currentArticleId,
          String(c.text || ''),
          c.emotion_label || 'N/A',
          c.emotion_score !== undefined ? String(c.emotion_score) : 'N/A'
        ]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, sheet, "Comments Data");

      const title = analytics && analytics.article ? analytics.article.title : "Article";
      XLSX.writeFile(wb, `${title}_Comments_Data.xlsx`);
    } catch (e) {
      console.error("Excel Export failed:", e);
      alert("Failed to export Excel.");
    }
  });

  document.getElementById('export-csv').addEventListener('click', async () => {
    if (!currentArticleId) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/articles/${currentArticleId}/comments`);
      if (!res.ok) throw new Error("Could not fetch comments");
      const comments = await res.json();

      let csvContent = `"Total Comments","${comments.length}"\n\n`;
      csvContent += `"Article ID","Comment","Emotion Label","Emotion Score"\n`;

      comments.forEach(c => {
        const articleId = String(c.article_id || currentArticleId).replace(/"/g, '""');
        const text = String(c.text || '').replace(/"/g, '""');
        const label = String(c.emotion_label || 'N/A').replace(/"/g, '""');
        const score = c.emotion_score !== undefined ? String(c.emotion_score).replace(/"/g, '""') : 'N/A';

        csvContent += `"${articleId}","${text}","${label}","${score}"\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const title = analytics && analytics.article ? analytics.article.title : "Article";
      saveAs(blob, `${title}_Comments_Data.csv`);
    } catch (e) {
      console.error("CSV Export failed:", e);
      alert("Failed to export CSV.");
    }
  });
}

// ===============================
// INIT
// ===============================
function initDashboard() {
  renderHeader();
  renderKPIs();
  renderSentimentChart();
  renderTrendChart();
  attachExportListeners();

  if (currentArticleId) {
    loadClusters();
    loadMLSummary();
  }
}

// ===============================
// AUTO START
// ===============================
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const articleId = params.get("article_id");

  if (articleId) {
    loadAnalytics(articleId);
  }
};