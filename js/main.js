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

initializeTheme()
