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

  loadAnalytics()
}

function loadAnalytics() {
  const inventoryResult = database.exec("SELECT * FROM skins")
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

  let totalInventoryValue = 0
  let totalItems = 0

  if (inventoryResult && inventoryResult[0]) {
    const rows = inventoryResult[0].values
    totalItems = rows.length

    for (const row of rows) {
      const [id, name, type, buyPrice] = row
      totalInventoryValue += buyPrice
    }
  }

  let totalProfit = 0
  let itemsSold = 0

  for (const item of history) {
    const profit = item.sell_price - item.buy_price
    totalProfit += profit
    itemsSold++
  }

  document.getElementById("totalItems").textContent = totalItems
  document.getElementById("totalValue").textContent = `€${totalInventoryValue.toFixed(2)}`
  document.getElementById("itemsSold").textContent = itemsSold
  document.getElementById("totalProfit").textContent = `€${totalProfit.toFixed(2)}`
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
  } catch (error) {
    console.error("Export error:", error)
    showToast("Failed to export database", "error")
  }
}
