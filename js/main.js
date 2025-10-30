let database
let sqlModule

initialize()

async function initialize() {
  const initSqlJs = window.initSqlJs
  sqlModule = await initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`,
  })

  const savedData = localStorage.getItem("skinsDB")
  if (savedData) {
    const dataArray = new Uint8Array(JSON.parse(savedData))
    database = new sqlModule.Database(dataArray)
  } else {
    database = new sqlModule.Database()
    database.run(`CREATE TABLE IF NOT EXISTS skins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, 
      type TEXT,
      buy_price REAL, 
      sell_price REAL,
      purchase_date TEXT
    );`)
  }

  initializeTheme()
}

function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark"
  document.documentElement.setAttribute("data-theme", savedTheme)
  updateThemeIcon(savedTheme)
}

function updateThemeIcon(theme) {
  const icon = document.querySelector(".theme-icon")
  if (icon) {
    icon.textContent = theme === "dark" ? "🌙" : "☀️"
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeIcon(newTheme)
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer")
  if (!container) {
    console.warn("Toast container not found")
    return
  }

  const toast = document.createElement("div")
  toast.className = `toast ${type}`

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  }

  const icon = icons[type] || icons.info

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add("hiding")
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

window.showToast = showToast

function exportDatabase() {
  try {
    const savedData = localStorage.getItem("skinsDB")
    const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

    if (!savedData) {
      showToast("No database found to export", "error")
      return
    }

    const fullExport = {
      database: JSON.parse(savedData),
      history: history,
      exportDate: new Date().toISOString(),
      version: "1.0",
    }

    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: "application/json" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `hcs-manager-full-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    showToast("Database exported successfully", "success")
  } catch (error) {
    console.error("Export error:", error)
    showToast("Failed to export database", "error")
  }
}

function importDatabase(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result)

      if (imported.database) {
        localStorage.setItem("skinsDB", JSON.stringify(imported.database))
      }

      if (imported.history) {
        localStorage.setItem("skinsHistory", JSON.stringify(imported.history))
      }

      showToast("Database imported successfully! Refresh the page to see changes.", "success")
    } catch (error) {
      console.error("Import error:", error)
      showToast("Failed to import database. Invalid file format.", "error")
    }
  }
  reader.readAsText(file)
}

async function exportAnalyticsPDF() {
  showToast("Generating PDF report...", "info")

  try {
    if (!window.jspdf) {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      document.head.appendChild(script)
      await new Promise((resolve) => {
        script.onload = resolve
      })
    }

    const { jsPDF } = window.jspdf
    const doc = new jsPDF()

    const inventoryResult = database.exec("SELECT * FROM skins")
    const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

    let totalInventoryValue = 0
    let inventoryCount = 0

    if (inventoryResult && inventoryResult[0]) {
      const rows = inventoryResult[0].values
      inventoryCount = rows.length
      for (const row of rows) {
        totalInventoryValue += row[3]
      }
    }

    let totalProfit = 0
    let totalRevenue = 0
    let totalInvested = 0

    for (const item of history) {
      totalRevenue += item.sell_price
      totalInvested += item.buy_price
      totalProfit += item.sell_price - item.buy_price
    }

    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0

    doc.setFontSize(20)
    doc.text("HCS-Manager Dashboard Report", 20, 20)

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30)

    doc.setFontSize(14)
    doc.text("Summary", 20, 45)

    doc.setFontSize(11)
    doc.text(`Total Inventory Value: €${totalInventoryValue.toFixed(2)}`, 20, 55)
    doc.text(`Items in Inventory: ${inventoryCount}`, 20, 62)
    doc.text(`Total Profit: €${totalProfit.toFixed(2)}`, 20, 69)
    doc.text(`Total Revenue: €${totalRevenue.toFixed(2)}`, 20, 76)
    doc.text(`Items Sold: ${history.length}`, 20, 83)
    doc.text(`ROI: ${roi.toFixed(2)}%`, 20, 90)

    doc.save(`hcs-dashboard-${new Date().toISOString().split("T")[0]}.pdf`)
    showToast("PDF report generated successfully", "success")
  } catch (error) {
    console.error("PDF export error:", error)
    showToast("Failed to generate PDF report", "error")
  }
}

function exportAnalyticsCSV() {
  try {
    const inventoryResult = database.exec("SELECT * FROM skins")
    const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

    let csv = "HCS-Manager Dashboard Export\n"
    csv += `Generated: ${new Date().toISOString()}\n\n`

    csv += "SUMMARY\n"
    csv += "Metric,Value\n"

    let totalInventoryValue = 0
    let inventoryCount = 0

    if (inventoryResult && inventoryResult[0]) {
      const rows = inventoryResult[0].values
      inventoryCount = rows.length
      for (const row of rows) {
        totalInventoryValue += row[3]
      }
    }

    let totalProfit = 0
    let totalRevenue = 0
    let totalInvested = 0

    for (const item of history) {
      totalRevenue += item.sell_price
      totalInvested += item.buy_price
      totalProfit += item.sell_price - item.buy_price
    }

    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0

    csv += `Total Inventory Value,€${totalInventoryValue.toFixed(2)}\n`
    csv += `Items in Inventory,${inventoryCount}\n`
    csv += `Total Profit,€${totalProfit.toFixed(2)}\n`
    csv += `Total Revenue,€${totalRevenue.toFixed(2)}\n`
    csv += `Items Sold,${history.length}\n`
    csv += `ROI,${roi.toFixed(2)}%\n`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `hcs-dashboard-${new Date().toISOString().split("T")[0]}.csv`
    link.click()

    showToast("CSV report exported successfully", "success")
  } catch (error) {
    console.error("CSV export error:", error)
    showToast("Failed to export CSV report", "error")
  }
}

function showAccountModal() {
  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")
  const savedLanguage = localStorage.getItem("language") || "en"

  title.textContent = "Account Settings"
  body.innerHTML = `
    <form id="accountForm">
      <div class="form-group">
        <label>Language</label>
        <select id="languageSelect" class="form-select">
          <option value="en" ${savedLanguage === "en" ? "selected" : ""}>English</option>
          <option value="es" ${savedLanguage === "es" ? "selected" : ""}>Español</option>
          <option value="fr" ${savedLanguage === "fr" ? "selected" : ""}>Français</option>
          <option value="de" ${savedLanguage === "de" ? "selected" : ""}>Deutsch</option>
          <option value="pt" ${savedLanguage === "pt" ? "selected" : ""}>Português</option>
        </select>
      </div>
      
      <div class="form-group" style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
        <label style="margin-bottom: 0.75rem; display: block; font-weight: 600;">Database Management</label>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-secondary" id="exportDBModal" style="flex: 1;">
            Export Data
          </button>
          <button type="button" class="btn btn-secondary" id="importDBModal" style="flex: 1;">
            Import Data
          </button>
        </div>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">
          Export your database to backup or import to restore data
        </p>
      </div>

      <div class="form-group" style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
        <label style="margin-bottom: 0.75rem; display: block; font-weight: 600;">Analytics Export</label>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-secondary" id="exportPDFModal" style="flex: 1;">
            Export PDF
          </button>
          <button type="button" class="btn btn-secondary" id="exportCSVModal" style="flex: 1;">
            Export CSV
          </button>
        </div>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">
          Export analytics with charts and data
        </p>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `

  modal.classList.add("active")

  document.getElementById("exportDBModal").addEventListener("click", () => {
    exportDatabase()
  })

  document.getElementById("importDBModal").addEventListener("click", () => {
    const fileInput = document.getElementById("fileInput")
    if (fileInput) {
      fileInput.click()
    } else {
      showToast("Import function not available on this page", "error")
    }
  })

  document.getElementById("exportPDFModal").addEventListener("click", () => {
    exportAnalyticsPDF()
  })

  document.getElementById("exportCSVModal").addEventListener("click", () => {
    exportAnalyticsCSV()
  })

  document.getElementById("accountForm").onsubmit = (e) => {
    e.preventDefault()
    const language = document.getElementById("languageSelect").value
    const previousLanguage = localStorage.getItem("language") || "en"
    localStorage.setItem("language", language)
    if (language !== previousLanguage) {
      showToast(`Language changed to ${language.toUpperCase()}`, "success")
    } else {
      showToast("Settings saved successfully", "success")
    }
    closeModal()
  }
}

function closeModal() {
  document.getElementById("modal").classList.remove("active")
}

const themeToggleBtn = document.getElementById("themeToggle")
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", toggleTheme)
}

const accountBtn = document.getElementById("accountBtn")
if (accountBtn) {
  accountBtn.addEventListener("click", showAccountModal)
}

const modalClose = document.getElementById("modalClose")
if (modalClose) {
  modalClose.addEventListener("click", closeModal)
}

const modal = document.getElementById("modal")
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal()
  })
}

const fileInput = document.getElementById("fileInput")
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      importDatabase(file)
      e.target.value = ""
    }
  })
}
