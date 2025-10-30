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
