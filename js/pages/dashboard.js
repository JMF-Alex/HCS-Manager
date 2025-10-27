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

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeIcon(newTheme)
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
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `
  modal.classList.add("active")
  document.getElementById("accountForm").onsubmit = (e) => {
    e.preventDefault()
    const language = document.getElementById("languageSelect").value
    localStorage.setItem("language", language)
    closeModal()
  }
}

function loadAnalytics() {
  const inventoryResult = database.exec("SELECT * FROM skins");
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]");

  let totalInventoryValue = 0;
  let totalItems = 0;

  if (inventoryResult && inventoryResult[0]) {
    const rows = inventoryResult[0].values;
    totalItems = rows.length;

    for (const row of rows) {
      const [id, name, type, buyPrice] = row;
      totalInventoryValue += buyPrice;
    }
  }

  let totalProfit = 0;
  let itemsSold = 0;

  for (const item of history) {
    const profit = item.sell_price - item.buy_price;
    totalProfit += profit;
    itemsSold++;
  }

  document.getElementById("totalItems").textContent = totalItems;
  document.getElementById("totalValue").textContent = `€${totalInventoryValue.toFixed(2)}`;
  document.getElementById("itemsSold").textContent = itemsSold;
  document.getElementById("totalProfit").textContent = `€${totalProfit.toFixed(2)}`;
}

function closeModal() {
  document.getElementById("modal").classList.remove("active")
}

document.getElementById("themeToggle").addEventListener("click", toggleTheme)
document.getElementById("accountBtn").addEventListener("click", showAccountModal)
document.getElementById("modalClose").addEventListener("click", closeModal)
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal()
})
