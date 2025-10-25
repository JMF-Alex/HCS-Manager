let database
let sqlModule
let currentPage = 1
let itemsPerPage = 10
let filteredData = []
const selectedItems = new Set()

initialize()

async function initialize() {
  try {
    const initSqlJs = window.initSqlJs
    sqlModule = await initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`,
    })

    const savedData = localStorage.getItem("skinsDB")
    if (savedData) {
      const dataArray = new Uint8Array(JSON.parse(savedData))
      database = new sqlModule.Database(dataArray)

      try {
        database.exec("SELECT purchase_date FROM skins LIMIT 1")
      } catch (e) {
        database.run("ALTER TABLE skins ADD COLUMN purchase_date TEXT")
      }
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

    const itemsPerPageSelect = document.getElementById("itemsPerPage")
    if (itemsPerPageSelect) {
      itemsPerPageSelect.value = itemsPerPage.toString()
    }

    renderTable()
  } catch (error) {
    console.error("Initialization error:", error)
    alert("Failed to initialize database. Please refresh the page.")
  }
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
  const addSkinBtn = document.getElementById("addSkin")
  const exportBtn = document.getElementById("exportDB")
  const importBtn = document.getElementById("importDB")
  const fileInput = document.getElementById("fileInput")
  const modalClose = document.getElementById("modalClose")
  const modal = document.getElementById("modal")
  const searchInput = document.getElementById("searchInput")
  const clearFilters = document.getElementById("clearFilters")

  const selectAll = document.getElementById("selectAll")
  const deleteSelected = document.getElementById("deleteSelected")

  const itemsPerPageSelect = document.getElementById("itemsPerPage")
  const prevPageBtn = document.getElementById("prevPage")
  const nextPageBtn = document.getElementById("nextPage")

  if (themeToggle) themeToggle.addEventListener("click", toggleTheme)
  if (addSkinBtn) addSkinBtn.addEventListener("click", showAddModal)
  if (exportBtn) exportBtn.addEventListener("click", exportDatabase)
  if (importBtn) importBtn.addEventListener("click", () => fileInput.click())
  if (fileInput) fileInput.addEventListener("change", importDatabase)
  if (modalClose) modalClose.addEventListener("click", closeModal)
  if (searchInput)
    searchInput.addEventListener("input", () => {
      currentPage = 1
      renderTable()
    })
  if (clearFilters) clearFilters.addEventListener("click", clearAllFilters)

  if (selectAll) selectAll.addEventListener("change", handleSelectAll)
  if (deleteSelected) deleteSelected.addEventListener("click", confirmDeleteSelected)

  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener("change", (e) => {
      itemsPerPage = e.target.value === "all" ? "all" : Number.parseInt(e.target.value)
      currentPage = 1
      renderTable()
    })
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--
        renderTable()
      }
    })
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filteredData.length / itemsPerPage)
      if (currentPage < totalPages) {
        currentPage++
        renderTable()
      }
    })
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "modal") closeModal()
    })
  }

  const filterIds = ["filterType", "filterMinPrice", "filterMaxPrice", "filterStartDate", "filterEndDate"]
  filterIds.forEach((id) => {
    const element = document.getElementById(id)
    if (element) {
      const eventType = id.includes("Price") ? "input" : "change"
      element.addEventListener(eventType, () => {
        currentPage = 1
        renderTable()
      })
    }
  })
}

function clearAllFilters() {
  const filterIds = [
    "filterType",
    "filterMinPrice",
    "filterMaxPrice",
    "filterStartDate",
    "filterEndDate",
    "searchInput",
  ]
  filterIds.forEach((id) => {
    const element = document.getElementById(id)
    if (element) element.value = ""
  })
  currentPage = 1
  renderTable()
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeIcon(newTheme)
}

function saveDatabase() {
  const exportedData = database.export()
  const dataArray = Array.from(exportedData)
  localStorage.setItem("skinsDB", JSON.stringify(dataArray))
}

function renderTable() {
  const tbody = document.querySelector("#skinsTable tbody")
  tbody.innerHTML = ""
  selectedItems.clear()
  updateBulkActionsBar()

  const selectAllCheckbox = document.getElementById("selectAll")
  if (selectAllCheckbox) selectAllCheckbox.checked = false

  const filters = {
    search: document.getElementById("searchInput")?.value.toLowerCase() || "",
    type: document.getElementById("filterType")?.value || "",
    minPrice: document.getElementById("filterMinPrice")?.value || "",
    maxPrice: document.getElementById("filterMaxPrice")?.value || "",
    startDate: document.getElementById("filterStartDate")?.value || "",
    endDate: document.getElementById("filterEndDate")?.value || "",
  }

  const result = database.exec("SELECT * FROM skins")

  if (!result || !result[0]) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-text">No Skins in Inventory</div>
          <div class="empty-state-subtext">Add your first skin to get started</div>
        </td>
      </tr>`
    updatePaginationInfo(0, 0, 0)
    updatePaginationButtons()
    return
  }

  let rows = result[0].values

  rows = rows.filter((row) => {
    const [id, name, type, buyPrice, sellPrice, purchaseDate] = row

    if (
      filters.search &&
      !name.toLowerCase().includes(filters.search) &&
      !type.toLowerCase().includes(filters.search)
    ) {
      return false
    }
    if (filters.type && type !== filters.type) return false
    if (filters.minPrice && buyPrice < Number.parseFloat(filters.minPrice)) return false
    if (filters.maxPrice && buyPrice > Number.parseFloat(filters.maxPrice)) return false
    if (filters.startDate && purchaseDate && purchaseDate < filters.startDate) return false
    if (filters.endDate && purchaseDate && purchaseDate > filters.endDate) return false

    return true
  })

  filteredData = rows

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">No Results Found</div>
          <div class="empty-state-subtext">Try adjusting your filters</div>
        </td>
      </tr>`
    updatePaginationInfo(0, 0, 0)
    updatePaginationButtons()
    return
  }

  const totalItems = rows.length
  let paginatedRows = rows
  let startIndex = 0
  let endIndex = totalItems

  if (itemsPerPage !== "all") {
    startIndex = (currentPage - 1) * itemsPerPage
    endIndex = Math.min(startIndex + itemsPerPage, totalItems)
    paginatedRows = rows.slice(startIndex, endIndex)
  }

  for (const row of paginatedRows) {
    const [id, name, type, buyPrice, sellPrice, purchaseDate] = row
    const formattedDate = formatDate(purchaseDate)

    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>
        <input type="checkbox" class="checkbox-input item-checkbox" data-id="${id}" />
      </td>
      <td><strong>${escapeHtml(name)}</strong></td>
      <td>${escapeHtml(type)}</td>
      <td>€${buyPrice.toFixed(2)}</td>
      <td style="color: var(--text-muted); font-size: 0.875rem;">${formattedDate}</td>
      <td>
        <button class="action-btn sell" onclick="showSellModal(${id}, '${escapeHtml(name).replace(/'/g, "\\'")}')">Sell</button>
        <button class="action-btn delete" style="background-color: #dc2626; color: white;" onclick="confirmDeleteItem(${id}, '${escapeHtml(name).replace(/'/g, "\\'")}')">Delete</button>
      </td>
    `
    tbody.appendChild(tr)
  }

  document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", handleItemCheckbox)
  })

  updatePaginationInfo(startIndex + 1, endIndex, totalItems)
  updatePaginationButtons()
}

function handleSelectAll(e) {
  const isChecked = e.target.checked
  const visibleCheckboxes = document.querySelectorAll("#skinsTable tbody .item-checkbox")

  if (!isChecked) {
    selectedItems.clear()
  } else {
    selectedItems.clear()
  }

  visibleCheckboxes.forEach((checkbox) => {
    checkbox.checked = isChecked
    const id = Number.parseInt(checkbox.dataset.id)
    if (isChecked) {
      selectedItems.add(id)
    }
  })

  updateBulkActionsBar()
}

function handleItemCheckbox(e) {
  const id = Number.parseInt(e.target.dataset.id)
  if (e.target.checked) {
    selectedItems.add(id)
  } else {
    selectedItems.delete(id)
  }
  updateBulkActionsBar()

  const selectAllCheckbox = document.getElementById("selectAll")
  const allCheckboxes = document.querySelectorAll(".item-checkbox")
  const allChecked = Array.from(allCheckboxes).every((cb) => cb.checked)
  if (selectAllCheckbox) selectAllCheckbox.checked = allChecked
}

function updateBulkActionsBar() {
  const bulkActionsBar = document.getElementById("bulkActionsBar")
  const selectedCount = document.getElementById("selectedCount")

  if (selectedItems.size > 0) {
    bulkActionsBar.style.display = "flex"
    selectedCount.textContent = `${selectedItems.size} item${selectedItems.size > 1 ? "s" : ""} selected`
  } else {
    bulkActionsBar.style.display = "none"
  }
}

function confirmDeleteSelected() {
  if (selectedItems.size === 0) return

  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  title.textContent = "Delete Selected Items"
  body.innerHTML = `
    <p class="confirm-text">Are you sure you want to delete ${selectedItems.size} item${selectedItems.size > 1 ? "s" : ""}? This action cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="deleteSelectedItems()">Delete</button>
    </div>
  `

  modal.classList.add("active")
}

function deleteSelectedItems() {
  const idsToDelete = Array.from(selectedItems)
  const placeholders = idsToDelete.map(() => "?").join(",")
  database.run(`DELETE FROM skins WHERE id IN (${placeholders})`, idsToDelete)
  saveDatabase()
  selectedItems.clear()
  renderTable()
  closeModal()
}

function confirmDeleteItem(id, name) {
  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  title.textContent = "Delete Item"
  body.innerHTML = `
    <p class="confirm-text">Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="deleteItem(${id})">Delete</button>
    </div>
  `

  modal.classList.add("active")
}

function deleteItem(id) {
  database.run("DELETE FROM skins WHERE id = ?", [id])
  saveDatabase()
  renderTable()
  closeModal()
}

function updatePaginationInfo(start, end, total) {
  const paginationInfo = document.getElementById("paginationInfo")
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${start}-${end} of ${total} items`
  }
}

function updatePaginationButtons() {
  const prevBtn = document.getElementById("prevPage")
  const nextBtn = document.getElementById("nextPage")
  const pageNumbers = document.getElementById("pageNumbers")

  const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filteredData.length / itemsPerPage)

  if (prevBtn) prevBtn.disabled = currentPage === 1
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages || itemsPerPage === "all"

  if (pageNumbers && itemsPerPage !== "all") {
    pageNumbers.textContent = `Page ${currentPage} of ${totalPages}`
  } else if (pageNumbers) {
    pageNumbers.textContent = ""
  }
}

function formatDate(dateString) {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

function showAddModal() {
  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  title.textContent = "Add New Skin"
  body.innerHTML = `
    <form id="addForm">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="skinName" required placeholder="e.g. AK-47 Redline" />
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="skinType" required class="form-select">
          <option value="">Select type...</option>
          <option value="Knife">Knife</option>
          <option value="Skin">Skin</option>
          <option value="Case">Case</option>
          <option value="Gloves">Gloves</option>
          <option value="Agent">Agent</option>
          <option value="Sticker">Sticker</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Buy Price (€)</label>
        <input type="number" id="buyPrice" step="0.01" required placeholder="0.00" />
      </div>
      <div class="form-group">
        <label>Purchase Date</label>
        <input type="date" id="purchaseDate" required />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Skin</button>
      </div>
    </form>
  `

  modal.classList.add("active")
  document.getElementById("purchaseDate").valueAsDate = new Date()

  document.getElementById("addForm").onsubmit = (e) => {
    e.preventDefault()
    addSkin()
  }
}

function addSkin() {
  const name = document.getElementById("skinName").value
  const type = document.getElementById("skinType").value
  const buyPrice = Number.parseFloat(document.getElementById("buyPrice").value)
  const purchaseDate = document.getElementById("purchaseDate").value

  database.run("INSERT INTO skins (name, type, buy_price, sell_price, purchase_date) VALUES (?, ?, ?, ?, ?)", [
    name,
    type,
    buyPrice,
    0,
    purchaseDate,
  ])

  saveDatabase()
  renderTable()
  closeModal()
}

function showSellModal(id, name) {
  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  title.textContent = "Sell Item"
  body.innerHTML = `
    <p class="confirm-text">Enter sale details for <strong>${name}</strong></p>
    <form id="sellForm">
      <div class="form-group">
        <label>Sale Price (€)</label>
        <input type="number" id="salePrice" step="0.01" required placeholder="0.00" />
      </div>
      <div class="form-group">
        <label>Sale Date</label>
        <input type="date" id="saleDate" required />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Complete Sale</button>
      </div>
    </form>
  `

  modal.classList.add("active")
  document.getElementById("saleDate").valueAsDate = new Date()

  document.getElementById("sellForm").onsubmit = (e) => {
    e.preventDefault()
    sellSkin(id)
  }
}

function sellSkin(id) {
  const salePrice = Number.parseFloat(document.getElementById("salePrice").value)
  const saleDate = document.getElementById("saleDate").value

  const result = database.exec("SELECT * FROM skins WHERE id = ?", [id])

  if (result && result[0]) {
    const [skinId, name, type, buyPrice, estimatedSellPrice, purchaseDate] = result[0].values[0]

    const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")
    history.push({
      id: Date.now(),
      name,
      type,
      buy_price: buyPrice,
      sell_price: salePrice,
      purchase_date: purchaseDate || null,
      sale_date: saleDate,
    })
    localStorage.setItem("skinsHistory", JSON.stringify(history))
  }

  database.run("DELETE FROM skins WHERE id = ?", [id])
  saveDatabase()
  renderTable()
  closeModal()
}

function exportDatabase() {
  const exportedData = database.export()
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

  const fullExport = {
    database: Array.from(exportedData),
    history: history,
    exportDate: new Date().toISOString(),
    version: "1.0",
  }

  const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: "application/json" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `hcs-manager-full-${new Date().toISOString().split("T")[0]}.json`
  link.click()
}

function importDatabase(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const content = reader.result

      try {
        const jsonData = JSON.parse(content)

        if (jsonData.database && Array.isArray(jsonData.database)) {
          const dataArray = new Uint8Array(jsonData.database)
          database = new sqlModule.Database(dataArray)
          saveDatabase()

          if (jsonData.history && Array.isArray(jsonData.history)) {
            localStorage.setItem("skinsHistory", JSON.stringify(jsonData.history))
          }

          renderTable()
          alert("Data imported successfully!")
        } else {
          throw new Error("Invalid JSON format")
        }
      } catch (jsonError) {
        const dataArray = new Uint8Array(content)
        database = new sqlModule.Database(dataArray)
        saveDatabase()
        renderTable()
        alert("Database imported successfully!")
      }
    } catch (error) {
      console.error("Import error:", error)
      alert("Failed to import file. Please check the file format.")
    }
  }

  if (file.name.endsWith(".json")) {
    reader.readAsText(file)
  } else {
    reader.readAsArrayBuffer(file)
  }

  event.target.value = ""
}

function closeModal() {
  document.getElementById("modal").classList.remove("active")
}
