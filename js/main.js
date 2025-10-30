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

    if (!window.jspdf.jsPDF.API.autoTable) {
      const autoTableScript = document.createElement("script")
      autoTableScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
      document.head.appendChild(autoTableScript)
      await new Promise((resolve) => {
        autoTableScript.onload = resolve
      })
    }

    const { jsPDF } = window.jspdf
    const doc = new jsPDF()

    const inventoryResult = database.exec("SELECT * FROM skins")
    const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

    let totalInventoryValue = 0
    let inventoryCount = 0
    const inventoryByType = {}

    if (inventoryResult && inventoryResult[0]) {
      const rows = inventoryResult[0].values
      inventoryCount = rows.length
      for (const row of rows) {
        totalInventoryValue += row[3]
        const type = row[2]
        inventoryByType[type] = (inventoryByType[type] || 0) + 1
      }
    }

    let totalProfit = 0
    let totalRevenue = 0
    let totalInvested = 0
    const profitByType = {}
    const salesByMonth = {}

    for (const item of history) {
      totalRevenue += item.sell_price
      totalInvested += item.buy_price
      totalProfit += item.sell_price - item.buy_price

      const type = item.type
      profitByType[type] = (profitByType[type] || 0) + (item.sell_price - item.buy_price)

      if (item.sale_date) {
        const month = item.sale_date.substring(0, 7)
        salesByMonth[month] = (salesByMonth[month] || 0) + (item.sell_price - item.buy_price)
      }
    }

    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const totalBalance = totalRevenue - totalInvested - totalInventoryValue

    doc.setFillColor(99, 102, 241)
    doc.rect(0, 0, 210, 45, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.setFont(undefined, "bold")
    doc.text("HCS-Manager", 20, 20)

    doc.setFontSize(14)
    doc.setFont(undefined, "normal")
    doc.text("Analytics Dashboard Report", 20, 30)

    doc.setFontSize(10)
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      20,
      38,
    )

    let yPos = 55
    doc.setTextColor(0, 0, 0)

    const metrics = [
      {
        label: "Total Balance",
        value: `€${totalBalance.toFixed(2)}`,
        color: totalBalance >= 0 ? [16, 185, 129] : [239, 68, 68],
      },
      {
        label: "Total Profit",
        value: `€${totalProfit.toFixed(2)}`,
        color: totalProfit >= 0 ? [16, 185, 129] : [239, 68, 68],
      },
      { label: "ROI", value: `${roi.toFixed(2)}%`, color: [99, 102, 241] },
      { label: "Avg Profit Margin", value: `${avgProfitMargin.toFixed(2)}%`, color: [245, 158, 11] },
    ]

    metrics.forEach((metric, index) => {
      const xPos = 20 + (index % 2) * 95
      const yOffset = Math.floor(index / 2) * 30

      doc.setFillColor(...metric.color)
      doc.roundedRect(xPos, yPos + yOffset, 85, 22, 3, 3, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont(undefined, "normal")
      doc.text(metric.label, xPos + 5, yPos + yOffset + 8)

      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text(metric.value, xPos + 5, yPos + yOffset + 17)
    })

    yPos += 70

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont(undefined, "bold")
    doc.text("Summary Statistics", 20, yPos)

    yPos += 8

    doc.autoTable({
      startY: yPos,
      head: [["Metric", "Value"]],
      body: [
        ["Total Inventory Value", `€${totalInventoryValue.toFixed(2)}`],
        ["Items in Inventory", inventoryCount.toString()],
        ["Total Revenue", `€${totalRevenue.toFixed(2)}`],
        ["Total Invested", `€${totalInvested.toFixed(2)}`],
        ["Items Sold", history.length.toString()],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [15, 23, 42],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 20, right: 20 },
    })

    doc.addPage()
    yPos = 20

    doc.setFontSize(18)
    doc.setFont(undefined, "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("Visual Analytics", 20, yPos)

    yPos += 15

    if (Object.keys(profitByType).length > 0) {
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text("Profit by Type", 20, yPos)
      yPos += 8

      const maxProfit = Math.max(...Object.values(profitByType))
      const barMaxWidth = 140

      Object.entries(profitByType).forEach(([type, profit], index) => {
        const barWidth = (profit / maxProfit) * barMaxWidth
        const color = profit >= 0 ? [16, 185, 129] : [239, 68, 68]

        doc.setFillColor(...color)
        doc.roundedRect(20, yPos, barWidth, 8, 2, 2, "F")

        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text(type, 165, yPos + 6)
        doc.text(`€${profit.toFixed(2)}`, 185, yPos + 6)

        yPos += 12
      })

      yPos += 10
    }

    if (Object.keys(inventoryByType).length > 0) {
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text("Inventory Distribution", 20, yPos)
      yPos += 8

      const colors = [
        [99, 102, 241],
        [16, 185, 129],
        [245, 158, 11],
        [239, 68, 68],
        [139, 92, 246],
        [236, 72, 153],
        [20, 184, 166],
      ]

      Object.entries(inventoryByType).forEach(([type, count], index) => {
        const color = colors[index % colors.length]

        doc.setFillColor(...color)
        doc.circle(25, yPos + 2, 2, "F")

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.text(`${type}: ${count} items`, 32, yPos + 4)

        yPos += 8
      })

      yPos += 10
    }

    if (Object.keys(salesByMonth).length > 0) {
      const months = Object.keys(salesByMonth).sort().slice(-6)

      if (yPos > 240) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text("Sales Timeline (Last 6 Months)", 20, yPos)
      yPos += 8

      const maxMonthProfit = Math.max(...months.map((m) => salesByMonth[m]))
      const barMaxHeight = 50
      const barWidth = 25
      const spacing = 5

      months.forEach((month, index) => {
        const profit = salesByMonth[month]
        const barHeight = (profit / maxMonthProfit) * barMaxHeight
        const xPos = 20 + index * (barWidth + spacing)

        const color = profit >= 0 ? [99, 102, 241] : [239, 68, 68]
        doc.setFillColor(...color)
        doc.roundedRect(xPos, yPos + barMaxHeight - barHeight, barWidth, barHeight, 2, 2, "F")

        doc.setFontSize(7)
        doc.setTextColor(0, 0, 0)
        const [year, monthNum] = month.split("-")
        const monthName = new Date(year, monthNum - 1).toLocaleDateString("en-US", { month: "short" })
        doc.text(monthName, xPos + 3, yPos + barMaxHeight + 5)
        doc.text(`€${profit.toFixed(0)}`, xPos + 2, yPos + barMaxHeight - barHeight - 2)
      })

      yPos += barMaxHeight + 15
    }

    if (history.length > 0) {
      if (yPos > 220) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text("Top 5 Profitable Items", 20, yPos)
      yPos += 8

      const topItems = history
        .map((item) => ({
          name: item.name,
          profit: item.sell_price - item.buy_price,
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5)

      doc.autoTable({
        startY: yPos,
        head: [["Rank", "Item Name", "Profit"]],
        body: topItems.map((item, index) => [`#${index + 1}`, item.name, `€${item.profit.toFixed(2)}`]),
        theme: "striped",
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 10,
        },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 110 },
          2: { cellWidth: 40, halign: "right" },
        },
        margin: { left: 20, right: 20 },
      })
    }

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" })
      doc.text("HCS-Manager © 2025", 20, 290)
    }

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
    csv += `Generated: ${new Date().toISOString()}\n`
    csv += "=".repeat(80) + "\n\n"

    csv += "EXECUTIVE SUMMARY\n"
    csv += "=".repeat(80) + "\n"

    let totalInventoryValue = 0
    let inventoryCount = 0
    const inventoryByType = {}

    if (inventoryResult && inventoryResult[0]) {
      const rows = inventoryResult[0].values
      inventoryCount = rows.length
      for (const row of rows) {
        totalInventoryValue += row[3]
        const type = row[2]
        inventoryByType[type] = (inventoryByType[type] || 0) + 1
      }
    }

    let totalProfit = 0
    let totalRevenue = 0
    let totalInvested = 0
    const profitByType = {}
    const salesByMonth = {}

    for (const item of history) {
      totalRevenue += item.sell_price
      totalInvested += item.buy_price
      totalProfit += item.sell_price - item.buy_price

      const type = item.type
      profitByType[type] = (profitByType[type] || 0) + (item.sell_price - item.buy_price)

      if (item.sale_date) {
        const month = item.sale_date.substring(0, 7)
        salesByMonth[month] = (salesByMonth[month] || 0) + (item.sell_price - item.buy_price)
      }
    }

    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const totalBalance = totalRevenue - totalInvested - totalInventoryValue

    csv += "Metric,Value,Status\n"
    csv += `Total Balance,€${totalBalance.toFixed(2)},${totalBalance >= 0 ? "✓ Positive" : "✗ Negative"}\n`
    csv += `Total Inventory Value,€${totalInventoryValue.toFixed(2)},-\n`
    csv += `Items in Inventory,${inventoryCount},-\n`
    csv += `Total Profit,€${totalProfit.toFixed(2)},${totalProfit >= 0 ? "✓ Profitable" : "✗ Loss"}\n`
    csv += `Total Revenue,€${totalRevenue.toFixed(2)},-\n`
    csv += `Total Invested,€${totalInvested.toFixed(2)},-\n`
    csv += `Items Sold,${history.length},-\n`
    csv += `ROI,${roi.toFixed(2)}%,${roi >= 0 ? "✓ Positive" : "✗ Negative"}\n`
    csv += `Average Profit Margin,${avgProfitMargin.toFixed(2)}%,-\n`
    csv += "\n"

    if (Object.keys(profitByType).length > 0) {
      csv += "PROFIT BY TYPE\n"
      csv += "=".repeat(80) + "\n"
      csv += "Type,Profit,Percentage\n"

      const totalProfitByType = Object.values(profitByType).reduce((a, b) => a + b, 0)

      Object.entries(profitByType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, profit]) => {
          const percentage = totalProfitByType > 0 ? (profit / totalProfitByType) * 100 : 0
          csv += `${type},€${profit.toFixed(2)},${percentage.toFixed(1)}%\n`
        })
      csv += "\n"
    }

    if (Object.keys(inventoryByType).length > 0) {
      csv += "INVENTORY DISTRIBUTION\n"
      csv += "=".repeat(80) + "\n"
      csv += "Type,Count,Percentage\n"

      Object.entries(inventoryByType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          const percentage = inventoryCount > 0 ? (count / inventoryCount) * 100 : 0
          csv += `${type},${count},${percentage.toFixed(1)}%\n`
        })
      csv += "\n"
    }

    if (Object.keys(salesByMonth).length > 0) {
      csv += "SALES TIMELINE\n"
      csv += "=".repeat(80) + "\n"
      csv += "Month,Profit,Trend\n"

      const months = Object.keys(salesByMonth).sort()
      months.forEach((month, index) => {
        const profit = salesByMonth[month]
        let trend = "-"
        if (index > 0) {
          const prevProfit = salesByMonth[months[index - 1]]
          trend = profit > prevProfit ? "↑ Up" : profit < prevProfit ? "↓ Down" : "→ Stable"
        }
        const [year, monthNum] = month.split("-")
        const monthName = new Date(year, monthNum - 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
        csv += `${monthName},€${profit.toFixed(2)},${trend}\n`
      })
      csv += "\n"
    }

    if (history.length > 0) {
      csv += "TOP 10 PROFITABLE ITEMS\n"
      csv += "=".repeat(80) + "\n"
      csv += "Rank,Item Name,Type,Buy Price,Sell Price,Profit,Margin %\n"

      history
        .map((item) => ({
          name: item.name,
          type: item.type,
          buyPrice: item.buy_price,
          sellPrice: item.sell_price,
          profit: item.sell_price - item.buy_price,
          margin: item.buy_price > 0 ? ((item.sell_price - item.buy_price) / item.buy_price) * 100 : 0,
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10)
        .forEach((item, index) => {
          csv += `${index + 1},${item.name},${item.type},€${item.buyPrice.toFixed(2)},€${item.sellPrice.toFixed(2)},€${item.profit.toFixed(2)},${item.margin.toFixed(1)}%\n`
        })
      csv += "\n"
    }

    if (history.length > 0) {
      csv += "RECENT SALES (Last 20)\n"
      csv += "=".repeat(80) + "\n"
      csv += "Date,Item Name,Type,Buy Price,Sell Price,Profit\n"

      history
        .slice(-20)
        .reverse()
        .forEach((item) => {
          const profit = item.sell_price - item.buy_price
          csv += `${item.sale_date || "N/A"},${item.name},${item.type},€${item.buy_price.toFixed(2)},€${item.sell_price.toFixed(2)},€${profit.toFixed(2)}\n`
        })
      csv += "\n"
    }

    csv += "=".repeat(80) + "\n"
    csv += "End of Report\n"
    csv += `HCS-Manager © 2025 | Generated: ${new Date().toLocaleString()}\n`

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
  const savedView = localStorage.getItem("viewMode") || "list"

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

      <div class="form-group" style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
        <label style="margin-bottom: 0.75rem; display: block; font-weight: 600;">View Mode</label>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn ${savedView === "list" ? "btn-primary" : "btn-secondary"}" id="viewModeList" style="flex: 1; height: 80px; border-radius: 12px;">
            List View
          </button>
          <button type="button" class="btn ${savedView === "grid" ? "btn-primary" : "btn-secondary"}" id="viewModeGrid" style="flex: 1; height: 80px; border-radius: 12px;">
            Grid View
          </button>
        </div>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">
          Choose how to display inventory and history items
        </p>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `

  modal.classList.add("active")
  modal.removeAttribute("aria-hidden")

  let selectedView = savedView
  const listBtn = document.getElementById("viewModeList")
  const gridBtn = document.getElementById("viewModeGrid")

  listBtn.addEventListener("click", () => {
    selectedView = "list"
    listBtn.className = "btn btn-primary"
    gridBtn.className = "btn btn-secondary"
  })

  gridBtn.addEventListener("click", () => {
    selectedView = "grid"
    listBtn.className = "btn btn-secondary"
    gridBtn.className = "btn btn-primary"
  })

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
    const previousView = localStorage.getItem("viewMode") || "list"

    localStorage.setItem("language", language)
    localStorage.setItem("viewMode", selectedView)

    if (selectedView !== previousView) {
      window.dispatchEvent(new CustomEvent("viewModeChanged", { detail: { viewMode: selectedView } }))
      showToast(`View mode changed to ${selectedView}`, "success")
    } else if (language !== previousLanguage) {
      showToast(`Language changed to ${language.toUpperCase()}`, "success")
    } else {
      showToast("Settings saved successfully", "success")
    }
    closeModal()
  }
}

function closeModal() {
  const modal = document.getElementById("modal")

  const activeElement = document.activeElement
  if (modal.contains(activeElement)) {
    activeElement.blur()
  }

  modal.classList.remove("active")

  setTimeout(() => {
    modal.setAttribute("aria-hidden", "true")
  }, 0)
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
