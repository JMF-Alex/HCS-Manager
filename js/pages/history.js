let currentPage = 1
let itemsPerPage = 10
let filteredData = []
const selectedItems = new Set()

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

initialize()

function initialize() {
  setupEventListeners()

  const itemsPerPageSelect = document.getElementById("itemsPerPage")
  if (itemsPerPageSelect) {
    itemsPerPageSelect.value = itemsPerPage.toString()
  }

  renderTable()
}

function setupEventListeners() {
  const clearBtn = document.getElementById("clearHistory")
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

  const accountBtn = document.getElementById("accountBtn")

  if (clearBtn) clearBtn.addEventListener("click", confirmClearHistory)
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

  if (accountBtn) accountBtn.addEventListener("click", showAccountModal)

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

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `

  modal.classList.add("active")

  document.getElementById("exportDBModal").addEventListener("click", () => {
    exportData()
  })

  document.getElementById("importDBModal").addEventListener("click", () => {
    const fileInput = document.getElementById("fileInput")
    if (fileInput) {
      fileInput.click()
    }
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
    const ids = JSON.parse(checkbox.dataset.ids)
    if (isChecked) {
      ids.forEach((id) => selectedItems.add(id))
    }
  })

  updateBulkActionsBar()
}

function handleItemCheckbox(e) {
  const ids = JSON.parse(e.target.dataset.ids)
  if (e.target.checked) {
    ids.forEach((id) => selectedItems.add(id))
  } else {
    ids.forEach((id) => selectedItems.delete(id))
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
  const itemText = idsToDelete.length > 1 ? `${idsToDelete.length} items` : "Item"
  showToast(`${itemText} deleted from history`, "success")
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

  const groupedItems = new Map()
  filteredData.forEach((item) => {
    const groupKey = `${item.name}|${item.buy_price}|${item.sell_price}`

    if (groupedItems.has(groupKey)) {
      const existing = groupedItems.get(groupKey)
      existing.quantity += 1
      existing.ids.push(item.id)
      existing.totalBuyPrice += item.buy_price
      existing.totalSellPrice += item.sell_price
      existing.totalProfit += item.sell_price - item.buy_price
      if (item.sale_date > existing.sale_date) {
        existing.sale_date = item.sale_date
      }
    } else {
      groupedItems.set(groupKey, {
        ids: [item.id],
        name: item.name,
        type: item.type,
        buy_price: item.buy_price,
        sell_price: item.sell_price,
        totalBuyPrice: item.buy_price,
        totalSellPrice: item.sell_price,
        totalProfit: item.sell_price - item.buy_price,
        purchase_date: item.purchase_date,
        sale_date: item.sale_date,
        steam_link: item.steam_link,
        quantity: 1,
      })
    }
  })

  const groupedData = Array.from(groupedItems.values())
  filteredData = groupedData

  if (groupedData.length === 0) {
    const hasFilters = Object.values(filters).some((v) => v !== "")
    const message = hasFilters
      ? '<div class="empty-state-icon">🔍</div><div class="empty-state-text">No Results Found</div><div class="empty-state-subtext">Try adjusting your filters</div>'
      : '<div class="empty-state-icon">📊</div><div class="empty-state-text">No Sales History</div><div class="empty-state-subtext">Sold items will appear here</div>'

    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-state">${message}</td>
      </tr>`
    updatePaginationInfo(0, 0, 0)
    updatePaginationButtons()
    return
  }

  const totalItems = groupedData.length
  let paginatedItems = groupedData
  let startIndex = 0
  let endIndex = totalItems

  if (itemsPerPage !== "all") {
    startIndex = (currentPage - 1) * itemsPerPage
    endIndex = Math.min(startIndex + itemsPerPage, totalItems)
    paginatedItems = groupedData.slice(startIndex, endIndex)
  }

  paginatedItems.forEach((item) => {
    const { ids, name, type, buy_price, sell_price, totalProfit, purchase_date, sale_date, steam_link, quantity } = item

    const profit = sell_price - buy_price
    const percentage = ((profit / buy_price) * 100).toFixed(2)
    const profitClass = profit >= 0 ? "profit-positive" : "profit-negative"

    const purchaseDate = formatDate(purchase_date)
    const saleDate = formatDate(sale_date)

    const nameDisplay = steam_link
      ? `<a href="${escapeHtml(steam_link)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">${escapeHtml(name)}</a>`
      : `<strong>${escapeHtml(name)}</strong>`

    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>
        <input type="checkbox" class="checkbox-input item-checkbox" data-ids='${JSON.stringify(ids)}' />
      </td>
      <td>${nameDisplay}</td>
      <td>${escapeHtml(type)}</td>
      <td>€${buy_price.toFixed(2)}</td>
      <td>€${sell_price.toFixed(2)}</td>
      <td class="${profitClass}">€${profit.toFixed(2)}</td>
      <td class="${profitClass}">${percentage}%</td>
      <td style="font-weight: 600;">${quantity}</td>
      <td style="color: var(--text-muted); font-size: 0.875rem;">${purchaseDate}</td>
      <td style="color: var(--text-muted); font-size: 0.875rem;">${saleDate}</td>
      <td class="actions-cell">
        <div class="actions-wrapper">
          <button class="action-btn restore" onclick='restoreItem(${JSON.stringify(ids)}, ${quantity})'>Restore</button>
          <button class="action-btn delete" onclick='confirmDeleteItem(${JSON.stringify(ids)}, "${escapeHtml(name).replace(/'/g, "\\'")}", ${quantity})'>Delete</button>
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

function confirmDeleteItem(ids, name, quantity) {
  const modal = document.getElementById("modal")
  const title = document.getElementById("modalTitle")
  const body = document.getElementById("modalBody")

  const quantityText = quantity > 1 ? ` (${quantity} items)` : ""
  title.textContent = "Delete Item"
  body.innerHTML = `
    <p class="confirm-text">Are you sure you want to delete <strong>${name}${quantityText}</strong> from history? This action cannot be undone.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick='deleteItem(${JSON.stringify(ids)})'>Delete</button>
    </div>
  `

  modal.classList.add("active")
}

function deleteItem(ids) {
  let history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")
  history = history.filter((item) => !ids.includes(item.id))
  localStorage.setItem("skinsHistory", JSON.stringify(history))
  renderTable()
  closeModal()
  const itemText = ids.length > 1 ? `${ids.length} items` : "Item"
  showToast(`${itemText} deleted from history`, "success")
}

async function restoreItem(ids, quantity) {
  const history = JSON.parse(localStorage.getItem("skinsHistory") || "[]")
  const itemsToRestore = history.filter((h) => ids.includes(h.id))

  if (itemsToRestore.length === 0) {
    showToast("Items not found in history", "error")
    return
  }

  try {
    const savedData = localStorage.getItem("skinsDB")
    if (!savedData) {
      showToast("Database not found. Please refresh the page.", "error")
      return
    }

    const initSqlJs = window.initSqlJs
    const sqlModule = await initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`,
    })

    const dataArray = new Uint8Array(JSON.parse(savedData))
    const database = new sqlModule.Database(dataArray)

    itemsToRestore.forEach((item) => {
      database.run(
        "INSERT INTO skins (name, type, buy_price, sell_price, purchase_date, steam_link) VALUES (?, ?, ?, ?, ?, ?)",
        [item.name, item.type, item.buy_price, 0, item.purchase_date || null, item.steam_link || null],
      )
    })

    const exportedData = database.export()
    const newDataArray = Array.from(exportedData)
    localStorage.setItem("skinsDB", JSON.stringify(newDataArray))

    const updatedHistory = history.filter((h) => !ids.includes(h.id))
    localStorage.setItem("skinsHistory", JSON.stringify(updatedHistory))

    renderTable()
    const itemText = quantity > 1 ? `${quantity} items` : itemsToRestore[0].name
    showToast(`${itemText} restored to inventory`, "success")
  } catch (error) {
    console.error("Restore error:", error)
    showToast("Failed to restore items. Please try again.", "error")
  }
}

async function exportData() {
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
        showToast("Import successful! Database and history restored.", "success")
      } else {
        showToast("Invalid file format", "error")
      }
    } catch (e) {
      showToast("Error importing file: " + e.message, "error")
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
  showToast("History cleared successfully", "success")
}

function closeModal() {
  document.getElementById("modal").classList.remove("active")
}
