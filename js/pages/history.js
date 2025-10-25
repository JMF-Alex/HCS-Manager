let currentPage = 1
let itemsPerPage = 10
let filteredData = []
const selectedItems = new Set()

initialize()

function initialize() {
  initializeTheme()
  setupEventListeners()

  const itemsPerPageSelect = document.getElementById("itemsPerPage")
  if (itemsPerPageSelect) {
    itemsPerPageSelect.value = itemsPerPage.toString()
  }

  renderTable()
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
  const clearBtn = document.getElementById("clearHistory")
  const exportBtn = document.getElementById("exportDB")
  const importBtn = document.getElementById("importDB")
  const fileInput = document.getElementById("fileInput")
  const modalClose = document.getElementById("modalClose")
  const modal = document.getElementById("modal")
  const searchInput = document.getElementById("searchInput")
  const clearFilters = document.getElementById("clearFilters")
  const itemsPerPageSelect = document.getElementById("itemsPerPage")
  const prevPageBtn = document.getElementById("prevPage")
  const nextPageBtn = document.getElementById("nextPage")

  const selectAll = document.getElementById("selectAll")
  const deleteSelected = document.getElementById("deleteSelected")

  if (themeToggle) themeToggle.addEventListener("click", toggleTheme)
  if (clearBtn) clearBtn.addEventListener("click", confirmClearHistory)
  if (exportBtn) exportBtn.addEventListener("click", exportData)
  if (importBtn) importBtn.addEventListener("click", () => fileInput.click())
  if (fileInput) fileInput.addEventListener("change", importData)
  if (modalClose) modalClose.addEventListener("click", closeModal)
  if (searchInput)
    searchInput.addEventListener("input", () => {
      currentPage = 1
      renderTable()
    })
  if (clearFilters) clearFilters.addEventListener("click", clearAllFilters)

  if (selectAll) selectAll.addEventListener("change", handleSelectAll)
  if (deleteSelected) deleteSelected.addEventListener("click", confirmDeleteSelected)

  if (itemsPerPageSelect)
    itemsPerPageSelect.addEventListener("change", (e) => {
      itemsPerPage = e.target.value === "all" ? "all" : Number.parseInt(e.target.value)
      currentPage = 1
      renderTable()
    })
  if (prevPageBtn)
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--
        renderTable()
      }
    })
  if (nextPageBtn)
    nextPageBtn.addEventListener("click", () => {
      const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filteredData.length / itemsPerPage)
      if (currentPage < totalPages) {
        currentPage++
        renderTable()
      }
    })

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "modal") closeModal()
    })
  }

  const filterIds = [
    "filterType",
    "filterMinPrice",
    "filterMaxPrice",
    "filterStartDate",
    "filterEndDate",
    "filterProfit",
  ]
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

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeIcon(newTheme)
}

function clearAllFilters() {
  const filterIds = [
    "filterType",
    "filterMinPrice",
    "filterMaxPrice",
    "filterStartDate",
    "filterEndDate",
    "filterProfit",
    "searchInput",
  ]
  filterIds.forEach((id) => {
    const element = document.getElementById(id)
    if (element) element.value = ""
  })
  currentPage = 1
  renderTable()
}

function handleSelectAll(e) {
  const isChecked = e.target.checked
  const visibleCheckboxes = document.querySelectorAll("#historyTable tbody .item-checkbox")

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
    <p class="confirm-text">Are you sure you want to delete ${selectedItems.size} item${selectedItems.size > 1 ? "s" : ""} from history? This action cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="deleteSelectedItems()">Delete</button>
    </div>
  `

  modal.classList.add("active")
}

function deleteSelectedItems() {
  let history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")
  const idsToDelete = Array.from(selectedItems)

  history = history.filter((item) => !idsToDelete.includes(item.id))
  localStorage.setItem("skinsHistory", JSON.stringify(history))

  selectedItems.clear()
  renderTable()
  closeModal()
}

function renderTable() {
  const tbody = document.querySelector("#historyTable tbody")
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

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
    profit: document.getElementById("filterProfit")?.value || "",
  }

  filteredData = history.filter((item) => {
    if (
      filters.search &&
      !item.name.toLowerCase().includes(filters.search) &&
      !item.type.toLowerCase().includes(filters.search)
    ) {
      return false
    }
    if (filters.type && item.type !== filters.type) return false
    if (filters.minPrice && item.buy_price < Number.parseFloat(filters.minPrice)) return false
    if (filters.maxPrice && item.buy_price > Number.parseFloat(filters.maxPrice)) return false
    if (filters.startDate && item.sale_date && item.sale_date < filters.startDate) return false
    if (filters.endDate && item.sale_date && item.sale_date > filters.endDate) return false
    if (filters.profit) {
      const profit = item.sell_price - item.buy_price
      if (filters.profit === "positive" && profit < 0) return false
      if (filters.profit === "negative" && profit >= 0) return false
    }

    return true
  })

  filteredData = filteredData.reverse()

  if (filteredData.length === 0) {
    const hasFilters = Object.values(filters).some((v) => v !== "")
    const message = hasFilters
      ? '<div class="empty-state-icon">🔍</div><div class="empty-state-text">No Results Found</div><div class="empty-state-subtext">Try adjusting your filters</div>'
      : '<div class="empty-state-icon">📊</div><div class="empty-state-text">No Sales History</div><div class="empty-state-subtext">Sold items will appear here</div>'

    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">${message}</td>
      </tr>`
    updatePaginationInfo(0, 0, 0)
    updatePaginationButtons()
    return
  }

  const totalItems = filteredData.length
  let paginatedItems = filteredData
  let startIndex = 0
  let endIndex = totalItems

  if (itemsPerPage !== "all") {
    startIndex = (currentPage - 1) * itemsPerPage
    endIndex = Math.min(startIndex + itemsPerPage, totalItems)
    paginatedItems = filteredData.slice(startIndex, endIndex)
  }

  paginatedItems.forEach((item) => {
    const profit = item.sell_price - item.buy_price
    const percentage = ((profit / item.buy_price) * 100).toFixed(2)
    const profitClass = profit >= 0 ? "profit-positive" : "profit-negative"

    const purchaseDate = formatDate(item.purchase_date)
    const saleDate = formatDate(item.sale_date)

    const nameDisplay = item.steam_link
      ? `<a href="${escapeHtml(item.steam_link)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">${escapeHtml(item.name)}</a>`
      : `<strong>${escapeHtml(item.name)}</strong>`

    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>
        <input type="checkbox" class="checkbox-input item-checkbox" data-id="${item.id}" />
      </td>
      <td>${nameDisplay}</td>
      <td>${escapeHtml(item.type)}</td>
      <td>€${item.buy_price.toFixed(2)}</td>
      <td>€${item.sell_price.toFixed(2)}</td>
      <td class="${profitClass}">€${profit.toFixed(2)}</td>
      <td class="${profitClass}">${percentage}%</td>
      <td style="color: var(--text-muted); font-size: 0.875rem;">${purchaseDate}</td>
      <td style="color: var(--text-muted); font-size: 0.875rem;">${saleDate}</td>
      <td class="actions-cell">
        <div class="actions-wrapper">
          <button class="action-btn restore" onclick="restoreItem(${item.id})">Restore</button>
          <button class="action-btn delete" onclick="confirmDeleteItem(${item.id}, '${escapeHtml(item.name).replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </td>
    `
    tbody.appendChild(tr)
  })

  document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", handleItemCheckbox)
  })

  updatePaginationInfo(startIndex + 1, endIndex, totalItems)
  updatePaginationButtons()
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

function confirmDeleteItem(id, name) {
  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  title.textContent = "Delete Item"
  body.innerHTML = `
    <p class="confirm-text">Are you sure you want to delete <strong>${name}</strong> from history? This action cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="deleteItem(${id})">Delete</button>
    </div>
  `

  modal.classList.add("active")
}

function deleteItem(id) {
  let history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")
  history = history.filter((item) => item.id !== id)
  localStorage.setItem("skinsHistory", JSON.stringify(history))
  renderTable()
  closeModal()
}

async function restoreItem(id) {
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")
  const item = history.find((h) => h.id === id)

  if (!item) {
    alert("Item not found in history")
    return
  }

  try {
    const savedData = localStorage.getItem("skinsDB")
    if (!savedData) {
      alert("Database not found. Please refresh the page.")
      return
    }

    const initSqlJs = window.initSqlJs
    const sqlModule = await initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`,
    })

    const dataArray = new Uint8Array(JSON.parse(savedData))
    const database = new sqlModule.Database(dataArray)

    database.run("INSERT INTO skins (name, type, buy_price, sell_price, purchase_date) VALUES (?, ?, ?, ?, ?)", [
      item.name,
      item.type,
      item.buy_price,
      0,
      item.purchase_date || null,
    ])

    const exportedData = database.export()
    const newDataArray = Array.from(exportedData)
    localStorage.setItem("skinsDB", JSON.stringify(newDataArray))

    const updatedHistory = history.filter((h) => h.id !== id)
    localStorage.setItem("skinsHistory", JSON.stringify(updatedHistory))

    renderTable()
    alert(`${item.name} has been restored to inventory!`)
  } catch (error) {
    console.error("Restore error:", error)
    alert("Failed to restore item. Please try again.")
  }
}

async function exportData() {
  const savedData = localStorage.getItem("skinsDB")
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")

  if (!savedData) {
    alert("No database found to export")
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
}

async function importData(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const content = JSON.parse(reader.result)

      if (content.database && Array.isArray(content.database)) {
        localStorage.setItem("skinsDB", JSON.stringify(content.database))

        if (content.history && Array.isArray(content.history)) {
          localStorage.setItem("skinsHistory", JSON.stringify(content.history))
        }

        renderTable()
        alert("Import successful! Database and history have been restored. Please refresh the page.")
      } else {
        alert("Invalid file format")
      }
    } catch (e) {
      alert("Error importing file: " + e.message)
    }
  }

  reader.readAsText(file)
  event.target.value = ""
}

function confirmClearHistory() {
  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  title.textContent = "Clear All History"
  body.innerHTML = `
    <p class="confirm-text">Are you sure you want to clear all sales history? This action cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="clearHistory()">Clear History</button>
    </div>
  `

  modal.classList.add("active")
}

function clearHistory() {
  localStorage.removeItem("skinsHistory")
  renderTable()
  closeModal()
}

function closeModal() {
  document.getElementById("modal").classList.remove("active")
}
