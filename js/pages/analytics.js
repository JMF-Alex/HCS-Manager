let database
let sqlModule
let timelineLimit = 12
let topItemsLimit = 10

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
  setupEventListeners()
  loadAnalytics()
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

function setupEventListeners() {
  const themeToggle = document.getElementById("themeToggle")
  const refreshData = document.getElementById("refreshData")
  const timelineLimitSelect = document.getElementById("timelineLimit")
  const topItemsLimitSelect = document.getElementById("topItemsLimit")

  if (themeToggle) themeToggle.addEventListener("click", toggleTheme)
  if (refreshData) refreshData.addEventListener("click", loadAnalytics)

  if (timelineLimitSelect) {
    timelineLimitSelect.addEventListener("change", (e) => {
      timelineLimit = e.target.value === "all" ? "all" : Number.parseInt(e.target.value)
      loadAnalytics()
    })
  }

  if (topItemsLimitSelect) {
    topItemsLimitSelect.addEventListener("change", (e) => {
      topItemsLimit = Number.parseInt(e.target.value)
      loadAnalytics()
    })
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeIcon(newTheme)

  loadAnalytics()
}

function loadAnalytics() {
  const inventoryResult = database.exec("SELECT * FROM skins")
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

  let totalInventoryInvestment = 0
  let inventoryCount = 0
  const inventoryByType = {}

  if (inventoryResult && inventoryResult[0]) {
    const rows = inventoryResult[0].values
    inventoryCount = rows.length

    for (const row of rows) {
      const [id, name, type, buyPrice] = row
      totalInventoryInvestment += buyPrice

      inventoryByType[type] = (inventoryByType[type] || 0) + 1
    }
  }

  let totalInvestedInSold = 0
  let totalRevenue = 0
  let totalSales = 0
  const profitByType = {}
  const salesByMonth = {}

  for (const item of history) {
    const profit = item.sell_price - item.buy_price
    totalRevenue += item.sell_price
    totalInvestedInSold += item.buy_price
    totalSales++

    profitByType[item.type] = (profitByType[item.type] || 0) + profit

    if (item.sale_date) {
      const month = item.sale_date.substring(0, 7)
      salesByMonth[month] = (salesByMonth[month] || 0) + profit
    }
  }

  const totalProfit = totalRevenue - totalInvestedInSold
  const totalInvested = totalInventoryInvestment + totalInvestedInSold
  const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const totalBalance = totalRevenue - totalInvestedInSold - totalInventoryInvestment

  document.getElementById("totalBalance").textContent = `€${totalBalance.toFixed(2)}`
  document.getElementById("balanceBreakdown").className =
    totalProfit >= 0 ? "stat-change positive" : "stat-change negative"

  document.getElementById("totalInventoryValue").textContent = `€${totalInventoryInvestment.toFixed(2)}`
  document.getElementById("inventoryChange").textContent =
    `${inventoryCount} items • €${totalInvested.toFixed(2)} total invested`

  document.getElementById("totalProfit").textContent = `€${totalProfit.toFixed(2)}`
  document.getElementById("profitChange").textContent = `${roi.toFixed(1)}% ROI • ${totalSales} sales`
  document.getElementById("profitChange").className = totalProfit >= 0 ? "stat-change positive" : "stat-change negative"

  document.getElementById("itemsSold").textContent = totalSales
  document.getElementById("soldChange").textContent = `€${totalRevenue.toFixed(2)} revenue`

  document.getElementById("avgProfitMargin").textContent = `${avgProfitMargin.toFixed(1)}%`
  document.getElementById("marginChange").textContent =
    `€${(totalSales > 0 ? totalProfit / totalSales : 0).toFixed(2)} avg per sale`
  document.getElementById("marginChange").className =
    avgProfitMargin >= 0 ? "stat-change positive" : "stat-change negative"

  createProfitByTypeChart(profitByType)
  createInventoryDistChart(inventoryByType)
  createSalesTimelineChart(salesByMonth)
  createTopItemsChart(history)
}

function createProfitByTypeChart(profitByType) {
  const ctx = document.getElementById("profitByTypeChart")
  if (!ctx) return

  const existingChart = window.Chart.getChart(ctx)
  if (existingChart) existingChart.destroy()

  const types = Object.keys(profitByType)
  const profits = Object.values(profitByType)

  if (types.length === 0) {
    ctx.parentElement.innerHTML = '<div class="empty-chart">No profit data available</div>'
    return
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
  const textColor = isDark ? "#f8fafc" : "#0f172a"

  new window.Chart(ctx, {
    type: "doughnut",
    data: {
      labels: types,
      datasets: [
        {
          data: profits,
          backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"],
          borderWidth: 2,
          borderColor: isDark ? "#151b2e" : "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
            padding: 15,
            font: { size: 12, weight: "600" },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: €${context.parsed.toFixed(2)}`,
          },
        },
      },
    },
  })
}

function createInventoryDistChart(inventoryByType) {
  const ctx = document.getElementById("inventoryDistChart")
  if (!ctx) return

  const existingChart = window.Chart.getChart(ctx)
  if (existingChart) existingChart.destroy()

  const types = Object.keys(inventoryByType)
  const counts = Object.values(inventoryByType)

  if (types.length === 0) {
    ctx.parentElement.innerHTML = '<div class="empty-chart">No inventory data available</div>'
    return
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
  const textColor = isDark ? "#f8fafc" : "#0f172a"

  new window.Chart(ctx, {
    type: "pie",
    data: {
      labels: types,
      datasets: [
        {
          data: counts,
          backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"],
          borderWidth: 2,
          borderColor: isDark ? "#151b2e" : "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
            padding: 15,
            font: { size: 12, weight: "600" },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${context.parsed} items`,
          },
        },
      },
    },
  })
}

function createSalesTimelineChart(salesByMonth) {
  const ctx = document.getElementById("salesTimelineChart")
  if (!ctx) return

  const existingChart = window.Chart.getChart(ctx)
  if (existingChart) existingChart.destroy()

  let months = Object.keys(salesByMonth).sort()

  if (timelineLimit !== "all" && months.length > timelineLimit) {
    months = months.slice(-timelineLimit)
  }

  const profits = months.map((month) => salesByMonth[month])

  if (months.length === 0) {
    ctx.parentElement.innerHTML = '<div class="empty-chart">No sales timeline data available</div>'
    return
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
  const textColor = isDark ? "#f8fafc" : "#0f172a"
  const gridColor = isDark ? "#2d3748" : "#e2e8f0"

  new window.Chart(ctx, {
    type: "line",
    data: {
      labels: months.map((m) => {
        const [year, month] = m.split("-")
        return new Date(year, month - 1).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      }),
      datasets: [
        {
          label: "Profit",
          data: profits,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#6366f1",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Profit: €${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            callback: (value) => "€" + value.toFixed(0),
          },
          grid: { color: gridColor },
        },
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
      },
    },
  })
}

function createTopItemsChart(history) {
  const ctx = document.getElementById("topItemsChart")
  if (!ctx) return

  const existingChart = window.Chart.getChart(ctx)
  if (existingChart) existingChart.destroy()

  const itemsWithProfit = history
    .map((item) => ({
      name: item.name,
      profit: item.sell_price - item.buy_price,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, topItemsLimit)

  if (itemsWithProfit.length === 0) {
    ctx.parentElement.innerHTML = '<div class="empty-chart">No sales data available</div>'
    return
  }

  const names = itemsWithProfit.map((item) => item.name)
  const profits = itemsWithProfit.map((item) => item.profit)

  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
  const textColor = isDark ? "#f8fafc" : "#0f172a"
  const gridColor = isDark ? "#2d3748" : "#e2e8f0"

  new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: names,
      datasets: [
        {
          label: "Profit",
          data: profits,
          backgroundColor: profits.map((p) => (p >= 0 ? "#10b981" : "#ef4444")),
          borderRadius: 8,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Profit: €${context.parsed.x.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            callback: (value) => "€" + value.toFixed(0),
          },
          grid: { color: gridColor },
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 11 },
          },
          grid: { display: false },
        },
      },
    },
  })
}
