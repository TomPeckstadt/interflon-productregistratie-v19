"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"

// Supabase imports
import {
  fetchUsers,
  fetchProducts,
  fetchLocations,
  fetchPurposes,
  fetchCategories,
  fetchRegistrations,
  saveUser,
  saveProduct,
  saveLocation,
  saveCategory,
  saveRegistration,
  subscribeToUsers,
  subscribeToProducts,
  subscribeToLocations,
  subscribeToPurposes,
  subscribeToCategories,
  subscribeToRegistrations,
  isSupabaseConfigured,
  updateUser,
  updateLocation,
  updatePurpose,
  updateProduct,
  updateCategory,
  testSupabaseConnection,
  uploadPDFToStorage,
  deletePDFFromStorage,
  createAuthUser,
  supabase,
  deleteUser,
  deleteProduct,
  deleteLocation,
  deletePurpose,
  deleteCategory,
} from "@/lib/supabase"

// Auth imports
import { signIn, getCurrentUser, onAuthStateChange, signInWithBadge } from "@/lib/auth"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { X, QrCode, ChevronDown, LogOut, Lock, Mail } from "lucide-react"

interface Product {
  id: string
  name: string
  qrcode?: string
  categoryId?: string
  created_at?: string
  attachmentUrl?: string
  attachmentName?: string
}

interface Category {
  id: string
  name: string
}

interface Registration {
  id: string
  user: string
  product: string
  location: string
  purpose: string
  timestamp: string
  date: string
  time: string
  qrcode?: string
  created_at?: string
}

export default function ProductRegistrationApp() {
  // ALL HOOKS MUST BE AT THE TOP - NEVER CONDITIONAL
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string>("")

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState("")

  // Basic state
  const [currentUser, setCurrentUser] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [location, setLocation] = useState("")
  const [purpose, setPurpose] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [importMessage, setImportMessage] = useState("")
  const [importError, setImportError] = useState("")

  // Connection state
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("Controleren...")

  // Data arrays - SINGLE SOURCE OF TRUTH
  const [users, setUsers] = useState<{ name: string; role: string; badgeCode?: string }[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [purposes, setPurposes] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])

  // New item states
  const [newUserName, setNewUserName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductQrCode, setNewProductQrCode] = useState("")
  const [newProductCategory, setNewProductCategory] = useState("none")
  const [newLocationName, setNewLocationName] = useState("")
  const [newPurposeName, setNewPurposeName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  // Auth user management states
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserLevel, setNewUserLevel] = useState("user")
  const [newUserBadgeCode, setNewUserBadgeCode] = useState("")

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [originalCategory, setOriginalCategory] = useState<Category | null>(null)
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false)

  const [editingUser, setEditingUser] = useState<string>("")
  const [editingUserRole, setEditingUserRole] = useState<string>("user")
  const [editingUserBadgeCode, setEditingUserBadgeCode] = useState<string>("")
  const [originalUser, setOriginalUser] = useState<string>("")
  const [originalUserRole, setOriginalUserRole] = useState<string>("user")
  const [originalUserBadgeCode, setOriginalUserBadgeCode] = useState<string>("")
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)

  const [editingLocation, setEditingLocation] = useState<string>("")
  const [originalLocation, setOriginalLocation] = useState<string>("")
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false)

  const [editingPurpose, setEditingPurpose] = useState<string>("")
  const [originalPurpose, setOriginalPurpose] = useState<string>("")
  const [showEditPurposeDialog, setShowEditPurposeDialog] = useState(false)

  // Product selector states
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const productSelectorRef = useRef<HTMLDivElement>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")

  // QR Scanner states
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [qrScanResult, setQrScanResult] = useState("")
  const [qrScanMode, setQrScanMode] = useState<"registration" | "product-management">("registration")

  // History filtering states
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [selectedHistoryUser, setSelectedHistoryUser] = useState("all")
  const [selectedHistoryLocation, setSelectedHistoryLocation] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("newest")

  // Product search state
  const [productSearchFilter, setProductSearchFilter] = useState("")

  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  // Badge login state
  const [badgeId, setBadgeId] = useState("")
  const [badgeError, setBadgeError] = useState("")

  // FIXED: Import/Export functions with proper XLSX handling
  const handleImportUsersExcel = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    setIsLoading(true)
    setImportMessage("📥 Bezig met lezen van Excel bestand...")

    try {
      // Dynamic import of xlsx library
      const XLSX = await import("xlsx")

      const reader = new FileReader()
      reader.onload = async (event: any) => {
        try {
          const data = new Uint8Array(event.target.result)
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          console.log("📋 Parsed Excel data:", jsonData)

          if (jsonData.length === 0) {
            setImportError("Excel bestand is leeg")
            setTimeout(() => setImportError(""), 3000)
            setIsLoading(false)
            return
          }

          let successCount = 0
          let errorCount = 0

          for (const row of jsonData) {
            const userData = {
              name: row["Naam"]?.toString()?.trim(),
              email: row["Email"]?.toString()?.trim(),
              password: row["Wachtwoord"]?.toString()?.trim(),
              level: row["Niveau"]?.toString()?.trim() || "user",
              badgeCode: row["Badge Code"]?.toString()?.trim() || "",
            }

            console.log("👤 Processing user:", userData)

            // Validation
            if (!userData.name || !userData.email || !userData.password) {
              console.log(`❌ Skipping row - missing required fields:`, userData)
              errorCount++
              continue
            }

            if (userData.password.length < 6) {
              console.log(`❌ Skipping row - password too short:`, userData.name)
              errorCount++
              continue
            }

            // Check if user already exists
            const existingUser = users.find((u) => u.name === userData.name)
            if (existingUser) {
              console.log(`❌ Skipping row - user already exists:`, userData.name)
              errorCount++
              continue
            }

            try {
              setImportMessage(`👤 Bezig met aanmaken gebruiker: ${userData.name}...`)

              const result = await createAuthUser(userData.email, userData.password, userData.name, userData.level)

              if (result.error) {
                console.error(`❌ Error creating user ${userData.name}:`, result.error)
                errorCount++
                continue
              }

              // Save badge code if provided
              if (userData.badgeCode) {
                const badgeResult = await saveBadgeCode(userData.badgeCode, userData.email, userData.name)
                if (!badgeResult.success) {
                  console.warn(`⚠️ User created but badge failed for ${userData.name}`)
                }
              }

              successCount++
              console.log(`✅ Successfully created user: ${userData.name}`)

              // Small delay to prevent overwhelming the system
              await new Promise((resolve) => setTimeout(resolve, 500))
            } catch (error) {
              console.error(`❌ Exception creating user ${userData.name}:`, error)
              errorCount++
            }
          }

          // Refresh users list
          await refreshUsersWithBadges()

          if (successCount > 0) {
            setImportMessage(
              `✅ ${successCount} gebruikers succesvol geïmporteerd!${errorCount > 0 ? ` (${errorCount} fouten)` : ""}`,
            )
          } else {
            setImportError(`❌ Geen gebruikers geïmporteerd. ${errorCount} fouten gevonden.`)
          }

          setTimeout(() => {
            setImportMessage("")
            setImportError("")
          }, 5000)
        } catch (error) {
          console.error("❌ Error parsing Excel file:", error)
          setImportError("Fout bij lezen van Excel bestand. Zorg ervoor dat het een geldig .xlsx bestand is.")
          setTimeout(() => setImportError(""), 5000)
        } finally {
          setIsLoading(false)
        }
      }

      reader.onerror = () => {
        setImportError("Fout bij lezen van bestand")
        setTimeout(() => setImportError(""), 3000)
        setIsLoading(false)
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("❌ Error importing Excel:", error)
      setImportError("Fout bij importeren van Excel bestand")
      setTimeout(() => setImportError(""), 3000)
      setIsLoading(false)
    }
  }

  const handleExportUsersExcel = async () => {
    try {
      setImportMessage("📤 Bezig met exporteren naar Excel...")

      // Dynamic import of xlsx library
      const XLSX = await import("xlsx")

      // Prepare data for export
      const exportData = users.map((user) => ({
        Naam: user.name,
        Email: `${user.name.toLowerCase().replace(/\s+/g, ".")}@dematic.com`,
        Wachtwoord: "", // Empty for security
        Niveau: user.role,
        "Badge Code": user.badgeCode || "",
      }))

      console.log("📤 Export data prepared:", exportData)

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Set column widths
      const colWidths = [
        { wch: 25 }, // Naam
        { wch: 30 }, // Email
        { wch: 15 }, // Wachtwoord
        { wch: 10 }, // Niveau
        { wch: 15 }, // Badge Code
      ]
      worksheet["!cols"] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Gebruikers")

      // Generate Excel file and download
      XLSX.writeFile(workbook, "gebruikers_export.xlsx")

      setImportMessage("✅ Gebruikers geëxporteerd naar Excel!")
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("❌ Error exporting to Excel:", error)
      setImportError("Fout bij exporteren naar Excel")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  const downloadUserTemplate = async () => {
    try {
      setImportMessage("📄 Bezig met maken van template...")

      // Dynamic import of xlsx library
      const XLSX = await import("xlsx")

      // Create template with headers and example data
      const templateData = [
        {
          Naam: "Jan Janssen",
          Email: "jan.janssen@dematic.com",
          Wachtwoord: "wachtwoord123",
          Niveau: "user",
          "Badge Code": "BADGE001",
        },
        {
          Naam: "Marie Peeters",
          Email: "marie.peeters@dematic.com",
          Wachtwoord: "veiligwachtwoord",
          Niveau: "admin",
          "Badge Code": "BADGE002",
        },
      ]

      console.log("📄 Template data prepared:", templateData)

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(templateData)

      // Set column widths
      const colWidths = [
        { wch: 25 }, // Naam
        { wch: 30 }, // Email
        { wch: 20 }, // Wachtwoord
        { wch: 10 }, // Niveau
        { wch: 15 }, // Badge Code
      ]
      worksheet["!cols"] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Gebruikers Template")

      // Generate Excel file and download
      XLSX.writeFile(workbook, "gebruikers_template.xlsx")

      setImportMessage("✅ Template gedownload!")
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("❌ Error creating template:", error)
      setImportError("Fout bij maken van template")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  // Helper function to load badge codes for users
  const loadUserBadges = async () => {
    if (!supabase) {
      console.log("📋 No Supabase - returning empty badge map")
      return {}
    }

    try {
      console.log("📋 Loading user badges from database...")
      const { data, error } = await supabase.from("user_badges").select("*")

      if (error) {
        console.error("❌ Error loading badges:", error)
        return {}
      }

      console.log("📋 Raw badge data from database:", data)

      const badgeMap: Record<string, string> = {}
      data?.forEach((badge) => {
        if (badge.user_name && badge.badge_id) {
          badgeMap[badge.user_name] = badge.badge_id
          console.log(`📋 Mapped badge: ${badge.user_name} -> ${badge.badge_id}`)
        }
      })

      console.log("📋 Final badge map:", badgeMap)
      return badgeMap
    } catch (error) {
      console.error("❌ Exception loading badges:", error)
      return {}
    }
  }

  // Helper function to save badge code
  const saveBadgeCode = async (badgeCode: string, userEmail: string, userName: string) => {
    if (!supabase || !badgeCode.trim()) {
      console.log("💾 No badge to save or no supabase")
      return { success: true }
    }

    try {
      console.log("💾 Saving badge code:", { badgeCode, userEmail, userName })

      // First, delete any existing badge for this user
      const { error: deleteError } = await supabase.from("user_badges").delete().eq("user_name", userName)

      if (deleteError) {
        console.log("⚠️ Delete error (might be expected if no existing badge):", deleteError)
      }

      // Then insert the new badge
      const { error: insertError } = await supabase.from("user_badges").insert([
        {
          badge_id: badgeCode.trim(),
          user_email: userEmail,
          user_name: userName,
        },
      ])

      if (insertError) {
        console.error("❌ Error saving badge:", insertError)
        return { success: false, error: insertError }
      }

      console.log("✅ Badge saved successfully")
      return { success: true }
    } catch (error) {
      console.error("❌ Exception saving badge:", error)
      return { success: false, error }
    }
  }

  // Helper function to refresh users with badge codes
  const refreshUsersWithBadges = async () => {
    console.log("🔄 Refreshing users with badges...")

    const usersResult = await fetchUsers()
    if (usersResult.data) {
      console.log("👥 Fetched users:", usersResult.data)

      const badgeMap = await loadUserBadges()
      console.log("🏷️ Badge map:", badgeMap)

      const usersWithBadges = usersResult.data.map((user) => ({
        ...user,
        badgeCode: badgeMap[user.name] || "",
      }))

      console.log("👥 Users with badges:", usersWithBadges)
      setUsers(usersWithBadges)
    }
  }

  // Login function
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loginEmail.trim()) {
      setLoginError("Voer je email adres in")
      return
    }

    if (!loginPassword) {
      setLoginError("Voer je wachtwoord in")
      return
    }

    setIsLoading(true)
    setLoginError("")

    try {
      console.log("🔐 Attempting login with email:", loginEmail)

      const result = await signIn(loginEmail.trim(), loginPassword)

      if (result.error) {
        console.error("🔐 Login error:", result.error)
        setLoginError(result.error.message || "Inloggen mislukt")
      } else if (result.data?.user) {
        console.log("✅ Login successful:", result.data.user.email)

        // Get user name from email or user metadata
        const userName = result.data.user.user_metadata?.name || result.data.user.email?.split("@")[0] || "Gebruiker"

        setLoggedInUser(userName)
        setCurrentUser(userName)
        setIsLoggedIn(true)

        // Reset login form
        setLoginEmail("")
        setLoginPassword("")
        setLoginError("")
      } else {
        setLoginError("Inloggen mislukt - geen gebruikersgegevens ontvangen")
      }
    } catch (error) {
      console.error("🔐 Login exception:", error)
      setLoginError("Er ging iets mis bij het inloggen")
    } finally {
      setIsLoading(false)
    }
  }

  // Badge login function
  const handleBadgeLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!badgeId.trim()) {
      setBadgeError("Voer je badge ID in")
      return
    }

    setIsLoading(true)
    setBadgeError("")
    setLoginError("") // Clear any existing login errors

    try {
      console.log("🏷️ Attempting badge login with ID:", badgeId)

      const result = await signInWithBadge(badgeId.trim())

      if (result.error) {
        console.error("🏷️ Badge login error:", result.error)
        setBadgeError(result.error.message || "Badge login mislukt")
      } else if (result.data?.user) {
        console.log("✅ Badge login successful:", result.data.user.email)

        // Get user name from email or user metadata
        const userName = result.data.user.user_metadata?.name || result.data.user.email?.split("@")[0] || "Gebruiker"

        setLoggedInUser(userName)
        setCurrentUser(userName)
        setIsLoggedIn(true)

        // Reset badge form
        setBadgeId("")
        setBadgeError("")
      } else {
        setBadgeError("Badge login mislukt - geen gebruikersgegevens ontvangen")
      }
    } catch (error) {
      console.error("🏷️ Badge login exception:", error)
      setBadgeError("Er ging iets mis bij het badge login")
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const handleLogout = () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
      setIsLoggedIn(false)
      setLoggedInUser("")
      setCurrentUser("")

      // Reset form data
      setSelectedProduct("")
      setProductSearchQuery("")
      setLocation("")
      setPurpose("")
      setQrScanResult("")

      console.log("👤 User logged out")
    }
  }

  // Check for existing session on app start
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          console.log("🔐 Found existing session:", user.email)
          setLoggedInUser(user.name)
          setCurrentUser(user.name)
          setIsLoggedIn(true)
        }
      } catch (error) {
        console.log("🔐 No existing session found")
      }
    }

    checkExistingSession()

    // Set up auth state listener
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      if (user) {
        console.log("🔐 Auth state changed - user logged in:", user.email)
        setLoggedInUser(user.name)
        setCurrentUser(user.name)
        setIsLoggedIn(true)
      } else {
        console.log("🔐 Auth state changed - user logged out")
        setIsLoggedIn(false)
        setLoggedInUser("")
        setCurrentUser("")
      }
    })

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  // FIXED: handleSubmit function with better error handling
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    console.log("🔄 Starting registration submission...")
    console.log("Form data:", { currentUser, selectedProduct, location, purpose })

    // Validation
    if (!currentUser || !selectedProduct || !location || !purpose) {
      console.error("❌ Missing required fields:", { currentUser, selectedProduct, location, purpose })
      setImportError("Vul alle velden in")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    setIsLoading(true)
    setImportError("")
    setImportMessage("")

    try {
      const now = new Date()
      const timestamp = now.toISOString()
      const date = now.toISOString().split("T")[0]
      const time = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })

      // Find the selected product to get QR code
      const selectedProductObj = products.find((p) => p.name === selectedProduct)

      const registrationData = {
        user_name: currentUser,
        product_name: selectedProduct,
        location: location,
        purpose: purpose,
        timestamp: timestamp,
        date: date,
        time: time,
        qr_code: selectedProductObj?.qrcode || qrScanResult || null,
      }

      console.log("📝 Registration data to save:", registrationData)

      const result = await saveRegistration(registrationData)

      if (result.error) {
        console.error("❌ Error saving registration:", result.error)
        setImportError(`Fout bij opslaan: ${result.error.message || "Onbekende fout"}`)
        setTimeout(() => setImportError(""), 5000)
      } else {
        console.log("✅ Registration saved successfully")

        // Refresh registrations list
        const refreshResult = await fetchRegistrations()
        if (refreshResult.data) {
          setRegistrations(refreshResult.data)
        }

        // Show success message
        setImportMessage("✅ Product succesvol geregistreerd!")
        setTimeout(() => setImportMessage(""), 3000)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)

        // Reset form
        setSelectedProduct("")
        setProductSearchQuery("")
        setLocation("")
        setPurpose("")
        setQrScanResult("")
      }
    } catch (error) {
      console.error("❌ Exception in handleSubmit:", error)
      setImportError(`Onverwachte fout: ${error}`)
      setTimeout(() => setImportError(""), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const startQrScanner = () => {
    setShowQrScanner(true)
  }

  const stopQrScanner = () => {
    setShowQrScanner(false)
  }

  const handleQrCodeDetected = (code: string) => {
    console.log("📱 QR Code detected:", code)
    setQrScanResult(code)
    stopQrScanner()

    if (qrScanMode === "registration") {
      // Find product by QR code
      const foundProduct = products.find((p) => p.qrcode === code)
      if (foundProduct) {
        setSelectedProduct(foundProduct.name)
        setProductSearchQuery(foundProduct.name)

        // FIXED: Automatically select the product's category
        if (foundProduct.categoryId) {
          setSelectedCategory(foundProduct.categoryId)
          console.log("🗂️ Auto-selected category:", foundProduct.categoryId)
        }

        setImportMessage(`✅ Product gevonden: ${foundProduct.name}`)
        setTimeout(() => setImportMessage(""), 3000)
      } else {
        setProductSearchQuery(code)
        setImportError(`❌ Geen product gevonden voor QR code: ${code}`)
        setTimeout(() => setImportError(""), 3000)
      }
    } else if (qrScanMode === "product-management") {
      setNewProductQrCode(code)
    }
  }

  const getFilteredProducts = () => {
    let filtered = products

    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.categoryId === selectedCategory)
    }

    if (productSearchQuery) {
      const query = productSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.qrcode && product.qrcode.toLowerCase().includes(query)),
      )
    }

    return filtered
  }

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product.name)
    setProductSearchQuery(product.name)
    setQrScanResult(product.qrcode || "")
    setShowProductDropdown(false)
  }

  const handleEditUser = (userName: string) => {
    const user = users.find((u) => u.name === userName)
    setEditingUser(userName)
    setEditingUserRole(user?.role || "user")
    setEditingUserBadgeCode(user?.badgeCode || "")
    setOriginalUser(userName)
    setOriginalUserRole(user?.role || "user")
    setOriginalUserBadgeCode(user?.badgeCode || "")
    setShowEditUserDialog(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser.trim()) {
      setImportError("Gebruikersnaam is verplicht")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    const hasChanges =
      editingUser.trim() !== originalUser ||
      editingUserRole !== originalUserRole ||
      editingUserBadgeCode.trim() !== originalUserBadgeCode

    if (!hasChanges) {
      setShowEditUserDialog(false)
      return
    }

    setIsLoading(true)

    try {
      console.log("💾 Saving user changes:", {
        originalUser,
        editingUser: editingUser.trim(),
        editingUserRole,
        editingUserBadgeCode: editingUserBadgeCode.trim(),
        originalUserBadgeCode,
      })

      // Update user in users table
      const result = await updateUser(originalUser, editingUser.trim(), editingUserRole)

      if (result.error) {
        setImportError("Fout bij opslaan gebruiker")
        setTimeout(() => setImportError(""), 3000)
        setIsLoading(false)
        return
      }

      // Handle badge code update
      if (editingUserBadgeCode.trim() !== originalUserBadgeCode) {
        const userEmail = `${editingUser.trim().toLowerCase().replace(/\s+/g, ".")}@dematic.com`

        if (editingUserBadgeCode.trim()) {
          // Save new badge
          const badgeResult = await saveBadgeCode(editingUserBadgeCode.trim(), userEmail, editingUser.trim())

          if (!badgeResult.success) {
            setImportError("Gebruiker opgeslagen maar badge kon niet worden opgeslagen")
            setTimeout(() => setImportError(""), 5000)
          } else {
            setImportMessage("✅ Gebruiker en badge succesvol aangepast!")
            setTimeout(() => setImportMessage(""), 3000)
          }
        } else {
          // Remove badge if empty
          if (supabase) {
            try {
              await supabase.from("user_badges").delete().eq("user_name", originalUser)
              console.log("🗑️ Badge removed for user:", originalUser)
              setImportMessage("✅ Gebruiker aangepast en badge verwijderd!")
              setTimeout(() => setImportMessage(""), 3000)
            } catch (err) {
              console.error("Error removing badge:", err)
            }
          }
        }
      } else {
        setImportMessage("✅ Gebruiker succesvol aangepast!")
        setTimeout(() => setImportMessage(""), 3000)
      }

      // Refresh users list with badge codes
      await refreshUsersWithBadges()
      setShowEditUserDialog(false)
    } catch (error) {
      console.error("❌ Exception in handleSaveUser:", error)
      setImportError("Er ging iets mis bij het opslaan")
      setTimeout(() => setImportError(""), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product })
    setOriginalProduct({ ...product })
    setShowEditDialog(true)
  }

  const handleSaveProduct = async () => {
    if (editingProduct && originalProduct) {
      const updateData = {
        name: editingProduct.name,
        qr_code: editingProduct.qrcode || null,
        category_id: editingProduct.categoryId ? Number.parseInt(editingProduct.categoryId) : null,
        attachment_url: editingProduct.attachmentUrl || null,
        attachment_name: editingProduct.attachmentName || null,
      }

      const result = await updateProduct(originalProduct.id, updateData)
      if (result.error) {
        setImportError("Fout bij opslaan product")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          setProducts(refreshResult.data)
        }
        setImportMessage("✅ Product aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditDialog(false)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory({ ...category })
    setOriginalCategory({ ...category })
    setShowEditCategoryDialog(true)
  }

  const handleSaveCategory = async () => {
    if (editingCategory && originalCategory) {
      const result = await updateCategory(originalCategory.id, { name: editingCategory.name })
      if (result.error) {
        setImportError("Fout bij opslaan categorie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchCategories()
        if (refreshResult.data) {
          setCategories(refreshResult.data)
        }
        setImportMessage("✅ Categorie aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditCategoryDialog(false)
    }
  }

  const handleEditLocation = (location: string) => {
    setEditingLocation(location)
    setOriginalLocation(location)
    setShowEditLocationDialog(true)
  }

  const handleSaveLocation = async () => {
    if (editingLocation.trim() && editingLocation.trim() !== originalLocation) {
      const result = await updateLocation(originalLocation, editingLocation.trim())
      if (result.error) {
        setImportError("Fout bij opslaan locatie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchLocations()
        if (refreshResult.data) {
          setLocations(refreshResult.data)
        }
        setImportMessage("✅ Locatie aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditLocationDialog(false)
    }
  }

  const handleEditPurpose = (purpose: string) => {
    setEditingPurpose(purpose)
    setOriginalPurpose(purpose)
    setShowEditPurposeDialog(true)
  }

  const handleSavePurpose = async () => {
    if (editingPurpose.trim() && editingPurpose.trim() !== originalPurpose) {
      const result = await updatePurpose(originalPurpose, editingPurpose.trim())
      if (result.error) {
        setImportError("Fout bij opslaan doel")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchPurposes()
        if (refreshResult.data) {
          setPurposes(refreshResult.data)
        }
        setImportMessage("✅ Doel aangepast!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setShowEditPurposeDialog(false)
    }
  }

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event: any) => {
      const text = event.target.result
      const lines = text.split("\n")
      const header = lines[0].split(",")

      if (header.length < 1) {
        setImportError("Ongeldig CSV formaat: kolom A: Productnaam, kolom B: Categorie")
        setTimeout(() => setImportError(""), 3000)
        return
      }

      const newProducts: Product[] = []

      for (let i = 1; i < lines.length; i++) {
        const data = lines[i].split(",")
        if (data.length < 1) continue

        const productName = data[0]?.trim()
        const categoryName = data[1]?.trim()

        if (!productName) continue

        let categoryId: string | undefined = undefined
        if (categoryName) {
          const existingCategory = categories.find((c) => c.name === categoryName)
          if (existingCategory) {
            categoryId = existingCategory.id
          } else {
            const newCategoryResult = await saveCategory({ name: categoryName })
            if (newCategoryResult.data) {
              categoryId = newCategoryResult.data.id
              const refreshResult = await fetchCategories()
              if (refreshResult.data) {
                setCategories(refreshResult.data)
              }
            }
          }
        }

        const existingProduct = products.find((p) => p.name === productName)
        if (!existingProduct) {
          const newProduct: Product = {
            id: Date.now().toString(),
            name: productName,
            categoryId: categoryId,
            created_at: new Date().toISOString(),
          }
          newProducts.push(newProduct)
          await saveProduct(newProduct)
        }
      }

      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        setProducts(refreshResult.data)
      }

      setImportMessage(`✅ ${newProducts.length} producten geïmporteerd!`)
      setTimeout(() => setImportMessage(""), 3000)
    }

    reader.onerror = () => {
      setImportError("Fout bij lezen van bestand")
      setTimeout(() => setImportError(""), 3000)
    }

    reader.readAsText(file)
  }

  const handleExportExcel = () => {
    const csvRows = []
    const header = ["Productnaam", "Categorie"]
    csvRows.push(header.join(","))

    for (const product of products) {
      const categoryName = product.categoryId ? categories.find((c) => c.id === product.categoryId)?.name : ""
      const values = [product.name, categoryName]
      csvRows.push(values.join(","))
    }

    const csvString = csvRows.join("\n")

    const blob = new Blob([csvString], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("href", url)
    a.setAttribute("download", "producten.csv")
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const printAllQRCodes = () => {
    const productsWithQRCodes = products.filter((p) => p.qrcode)

    if (productsWithQRCodes.length === 0) {
      alert("Geen producten met QR codes gevonden")
      return
    }

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Popup blocker is actief. Sta popups toe om af te drukken.")
      return
    }

    printWindow.document.write("<html><head><title>QR Codes</title></head><body>")
    productsWithQRCodes.forEach((product) => {
      printWindow.document.write(`
          <div style="margin: 10px; text-align: center;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${product.qrcode}" alt="${product.name}" style="margin-bottom: 5px;">
              <p>${product.name}</p>
          </div>
      `)
    })
    printWindow.document.write("</body></html>")
    printWindow.document.close()
    printWindow.print()
    printWindow.onafterprint = () => printWindow.close()
  }

  const printQRCode = (product: Product) => {
    if (!product.qrcode) {
      alert("Geen QR code gevonden voor dit product")
      return
    }

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Popup blocker is actief. Sta popups toe om af te drukken.")
      return
    }

    printWindow.document.write(`
          <html>
          <head>
              <title>QR Code - ${product.name}</title>
          </head>
          <body>
              <div style="margin: 20px; text-align: center;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${product.qrcode}" alt="${product.name}" style="margin-bottom: 10px;">
                  <p style="font-size: 16px; font-weight: bold;">${product.name}</p>
                  <p style="font-size: 14px;">QR Code: ${product.qrcode}</p>
              </div>
          </body>
          </html>
      `)

    printWindow.document.close()
    printWindow.print()
    printWindow.onafterprint = () => printWindow.close()
  }

  // FIXED: Generate QR Code function - back to original format
  const generateQRCode = async (product: Product) => {
    // Generate QR code in the original format like "IFLS001", "IFFL002", etc.
    // Based on product name and a sequential number or unique identifier

    // Extract first letters from product name for prefix
    const words = product.name.split(" ")
    let prefix = ""

    // Create prefix from first letters of significant words
    for (const word of words) {
      if (word.length > 2 && !["spray", "ml", "gr", "kit"].includes(word.toLowerCase())) {
        prefix += word.charAt(0).toUpperCase()
      }
    }

    // If prefix is too short, use first 2-3 characters of product name
    if (prefix.length < 2) {
      prefix = product.name.replace(/\s+/g, "").substring(0, 3).toUpperCase()
    }

    // Limit prefix to 4 characters max
    if (prefix.length > 4) {
      prefix = prefix.substring(0, 4)
    }

    // Generate a 3-digit number based on existing products to avoid duplicates
    let number = 1
    let newQrCode = ""

    do {
      const paddedNumber = number.toString().padStart(3, "0")
      newQrCode = `${prefix}${paddedNumber}`
      number++
    } while (products.some((p) => p.qrcode === newQrCode) && number < 1000)

    const updateData = {
      name: product.name,
      qr_code: newQrCode,
      category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
      attachment_url: product.attachmentUrl || null,
      attachment_name: product.attachmentName || null,
    }

    const result = await updateProduct(product.id, updateData)
    if (result.error) {
      setImportError("Fout bij genereren QR code")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        setProducts(refreshResult.data)
      }
      setImportMessage(`✅ QR Code gegenereerd: ${newQrCode}`)
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const exportQRCodesForLabelPrinter = () => {
    const csvRows = []
    const header = ["Productnaam", "QR Code"]
    csvRows.push(header.join(","))

    for (const product of products) {
      if (product.qrcode) {
        const values = [product.name, product.qrcode]
        csvRows.push(values.join(","))
      }
    }

    const csvString = csvRows.join("\n")

    const blob = new Blob([csvString], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("href", url)
    a.setAttribute("download", "qr_codes.csv")
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleAttachmentUpload = async (product: Product, e: any) => {
    const file = e.target.files[0]
    if (!file) return

    setIsLoading(true)

    try {
      const result = await uploadPDFToStorage(file, product.id)

      if (result.error) {
        setImportError("Fout bij uploaden bestand")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const updateData = {
          name: product.name,
          qr_code: product.qrcode || null,
          category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
          attachment_url: result.url,
          attachment_name: file.name,
        }

        const updateResult = await updateProduct(product.id, updateData)

        if (updateResult.error) {
          setImportError("Fout bij opslaan product")
          setTimeout(() => setImportError(""), 3000)
        } else {
          const refreshResult = await fetchProducts()
          if (refreshResult.data) {
            setProducts(refreshResult.data)
          }
          setImportMessage("✅ Bestand geupload!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAttachment = async (product: Product) => {
    setIsLoading(true)

    try {
      if (!product.attachmentUrl) return

      const result = await deletePDFFromStorage(product.attachmentUrl)

      if (result.error) {
        setImportError("Fout bij verwijderen bestand")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const updateData = {
          name: product.name,
          qr_code: product.qrcode || null,
          category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
          attachment_url: null,
          attachment_name: null,
        }

        const updateResult = await updateProduct(product.id, updateData)

        if (updateResult.error) {
          setImportError("Fout bij opslaan product")
          setTimeout(() => setImportError(""), 3000)
        } else {
          const refreshResult = await fetchProducts()
          if (refreshResult.data) {
            setProducts(refreshResult.data)
          }
          setImportMessage("✅ Bestand verwijderd!")
          setTimeout(() => setImportMessage(""), 2000)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    console.log("🚀 Starting app initialization...")
    loadAllData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSelectorRef.current && !productSelectorRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const loadAllData = async () => {
    console.log("🔄 Loading all data...")
    setConnectionStatus("Verbinden met database...")

    try {
      const supabaseConfigured = isSupabaseConfigured()
      console.log("🔧 Supabase configured:", supabaseConfigured)

      if (supabaseConfigured) {
        console.log("🔄 Testing Supabase connection...")

        const connectionTest = await testSupabaseConnection()

        if (connectionTest) {
          console.log("🔄 Loading from Supabase...")
          const [usersResult, productsResult, locationsResult, purposesResult, categoriesResult, registrationsResult] =
            await Promise.all([
              fetchUsers(),
              fetchProducts(),
              fetchLocations(),
              fetchPurposes(),
              fetchCategories(),
              fetchRegistrations(),
            ])

          console.log("📊 Supabase results:", {
            users: { success: !usersResult.error, count: usersResult.data?.length || 0 },
            products: { success: !productsResult.error, count: productsResult.data?.length || 0 },
            locations: { success: !locationsResult.error, count: locationsResult.data?.length || 0 },
            purposes: { success: !purposesResult.error, count: purposesResult.data?.length || 0 },
            categories: { success: !categoriesResult.error, count: categoriesResult.data?.length || 0 },
          })

          const hasErrors = usersResult.error || productsResult.error || categoriesResult.error

          if (!hasErrors) {
            console.log("✅ Supabase connected successfully")
            setIsSupabaseConnected(true)
            setConnectionStatus("Supabase verbonden")

            // Load users with badge codes
            const badgeMap = await loadUserBadges()
            const usersWithBadges = (usersResult.data || []).map((user) => ({
              ...user,
              badgeCode: badgeMap[user.name] || "",
            }))

            console.log("👥 Setting users with badges:", usersWithBadges)
            setUsers(usersWithBadges)
            setProducts(productsResult.data || [])
            setLocations(locationsResult.data || [])
            setPurposes(purposesResult.data || [])
            setCategories(categoriesResult.data || [])
            setRegistrations(registrationsResult.data || [])

            setupSubscriptions()
          } else {
            console.log("️ Supabase data fetch failed - using mock data")
            setIsSupabaseConnected(false)
            setConnectionStatus("Mock data actief (data fetch failed)")
            loadMockData()
          }
        } else {
          console.log("⚠️ Supabase connection test failed - using mock data")
          setIsSupabaseConnected(false)
          setConnectionStatus("Mock data actief (connection failed)")
          loadMockData()
        }
      } else {
        console.log("⚠️ Supabase not configured - using mock data")
        setIsSupabaseConnected(false)
        setConnectionStatus("Mock data actief (not configured)")
        loadMockData()
      }

      console.log("🎯 App initialization complete - setting ready state")
      setIsReady(true)
    } catch (error) {
      console.error("❌ Error loading data:", error)
      setError(`Fout bij laden: ${error}`)
      setIsSupabaseConnected(false)
      setConnectionStatus("Mock data actief (error)")
      loadMockData()
      setIsReady(true)
    }
  }

  const loadMockData = () => {
    console.log("📱 Loading mock data...")
    const mockUsers = [
      { name: "Tom Peckstadt", role: "admin", badgeCode: "BADGE001" },
      { name: "Sven De Poorter", role: "user", badgeCode: "" },
      { name: "Nele Herteleer", role: "user", badgeCode: "BADGE003" },
      { name: "Wim Peckstadt", role: "admin", badgeCode: "" },
      { name: "Siegfried Weverbergh", role: "user", badgeCode: "BADGE005" },
      { name: "Jan Janssen", role: "user", badgeCode: "" },
    ]
    const mockProducts = [
      { id: "1", name: "Interflon Metal Clean spray 500ml", qrcode: "IFLS001", categoryId: "1" },
      { id: "2", name: "Interflon Grease LT2 Lube shuttle 400gr", qrcode: "IFFL002", categoryId: "1" },
      { id: "3", name: "Interflon Maintenance Kit", qrcode: "IFD003", categoryId: "2" },
      { id: "4", name: "Interflon Food Lube spray 500ml", qrcode: "IFGR004", categoryId: "1" },
      { id: "5", name: "Interflon Foam Cleaner spray 500ml", qrcode: "IFMC005", categoryId: "2" },
      { id: "6", name: "Interflon Fin Super", qrcode: "IFMK006", categoryId: "3" },
    ]
    const mockLocations = [
      "Warehouse Dematic groot boven",
      "Warehouse Interflon",
      "Warehouse Dematic klein beneden",
      "Onderhoud werkplaats",
      "Kantoor 1.1",
    ]
    const mockPurposes = ["Presentatie", "Thuiswerken", "Reparatie", "Training", "Demonstratie"]
    const mockCategories = [
      { id: "1", name: "Smeermiddelen" },
      { id: "2", name: "Reinigers" },
      { id: "3", name: "Onderhoud" },
    ]

    const mockRegistrations = [
      {
        id: "1",
        user: "Tom Peckstadt",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Interflon",
        purpose: "Reparatie",
        timestamp: "2025-06-15T05:41:00Z",
        date: "2025-06-15",
        time: "05:41",
        qrcode: "IFLS001",
      },
      {
        id: "2",
        user: "Nele Herteleer",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Dematic klein beneden",
        purpose: "Training",
        timestamp: "2025-06-15T05:48:00Z",
        date: "2025-06-15",
        time: "05:48",
        qrcode: "IFLS001",
      },
    ]

    setUsers(mockUsers)
    setProducts(mockProducts)
    setLocations(mockLocations)
    setPurposes(mockPurposes)
    setCategories(mockCategories)
    setRegistrations(mockRegistrations)
  }

  const setupSubscriptions = () => {
    console.log("🔔 Setting up real-time subscriptions...")

    const usersSub = subscribeToUsers(async (newUsers) => {
      console.log("🔔 Users updated via subscription:", newUsers.length)
      // Reload users with badge codes when users change
      await refreshUsersWithBadges()
    })

    const productsSub = subscribeToProducts((newProducts) => {
      console.log("🔔 Products updated via subscription:", newProducts.length)
      setProducts(newProducts)
    })

    const locationsSub = subscribeToLocations((newLocations) => {
      console.log("🔔 Locations updated via subscription:", newLocations.length)
      setLocations(newLocations)
    })

    const purposesSub = subscribeToPurposes((newPurposes) => {
      console.log("🔔 Purposes updated via subscription:", newPurposes.length)
      setPurposes(newPurposes)
    })

    const categoriesSub = subscribeToCategories((newCategories) => {
      console.log("🔔 Categories updated via subscription:", newCategories.length)
      setCategories(newCategories)
    })

    const registrationsSub = subscribeToRegistrations((newRegistrations) => {
      console.log("🔔 Registrations updated via subscription:", newRegistrations.length)
      setRegistrations(newRegistrations)
    })

    return () => {
      usersSub?.unsubscribe?.()
      productsSub?.unsubscribe?.()
      locationsSub?.unsubscribe?.()
      purposesSub?.unsubscribe?.()
      categoriesSub?.unsubscribe?.()
      registrationsSub?.unsubscribe?.()
    }
  }

  // Add functions
  const addNewUser = async () => {
    if (newUserName.trim() && !users.find((user) => user.name === newUserName.trim())) {
      const userName = newUserName.trim()
      const result = await saveUser(userName)
      if (result.error) {
        setImportError("Fout bij opslaan gebruiker")
        setTimeout(() => setImportError(""), 3000)
      } else {
        await refreshUsersWithBadges()
        setImportMessage("✅ Gebruiker toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewUserName("")
    }
  }

  const addNewUserWithAuth = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setImportError("Vul alle velden in")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    if (newUserPassword.length < 6) {
      setImportError("Wachtwoord moet minimaal 6 tekens lang zijn")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    setIsLoading(true)

    try {
      setImportMessage("👤 Bezig met aanmaken gebruiker en inlog-account...")

      const result = await createAuthUser(newUserEmail.trim(), newUserPassword, newUserName.trim(), newUserLevel)

      if (result.error) {
        console.error("Error creating auth user:", result.error)
        setImportError(`Fout bij aanmaken: ${result.error.message || "Onbekende fout"}`)
        setTimeout(() => setImportError(""), 5000)
      } else {
        // Save badge code if provided
        if (newUserBadgeCode.trim()) {
          const badgeResult = await saveBadgeCode(newUserBadgeCode.trim(), newUserEmail.trim(), newUserName.trim())

          if (!badgeResult.success) {
            setImportError("Gebruiker aangemaakt maar badge kon niet worden opgeslagen")
            setTimeout(() => setImportError(""), 5000)
          } else {
            setImportMessage("✅ Gebruiker, inlog-account en badge succesvol aangemaakt!")
            setTimeout(() => setImportMessage(""), 3000)
          }
        } else {
          setImportMessage("✅ Gebruiker en inlog-account succesvol aangemaakt!")
          setTimeout(() => setImportMessage(""), 3000)
        }

        setNewUserName("")
        setNewUserEmail("")
        setNewUserPassword("")
        setNewUserBadgeCode("")

        await refreshUsersWithBadges()
      }
    } catch (error) {
      console.error("Exception creating auth user:", error)
      setImportError("Er ging iets mis bij het aanmaken van de gebruiker")
      setTimeout(() => setImportError(""), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const addNewProduct = async () => {
    if (newProductName.trim()) {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: newProductName.trim(),
        qrcode: newProductQrCode.trim() || undefined,
        categoryId: newProductCategory === "none" ? undefined : newProductCategory,
        created_at: new Date().toISOString(),
      }

      const result = await saveProduct(newProduct)
      if (result.error) {
        setImportError("Fout bij opslaan product")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          setProducts(refreshResult.data)
        }
        setImportMessage("✅ Product toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }

      setNewProductName("")
      setNewProductQrCode("")
      setNewProductCategory("none")
    }
  }

  const addNewLocation = async () => {
    if (newLocationName.trim() && !locations.includes(newLocationName.trim())) {
      const locationName = newLocationName.trim()
      const result = await saveLocation(locationName)
      if (result.error) {
        setImportError("Fout bij opslaan locatie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchLocations()
        if (refreshResult.data) {
          setLocations(refreshResult.data)
        }
        setImportMessage("✅ Locatie toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewLocationName("")
    }
  }

  const addNewPurpose = async () => {
    if (newPurposeName.trim() && !purposes.includes(newPurposeName.trim())) {
      const purposeName = newPurposeName.trim()
      const result = await savePurpose(purposeName)
      if (result.error) {
        setImportError("Fout bij opslaan doel")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchPurposes()
        if (refreshResult.data) {
          setPurposes(refreshResult.data)
        }
        setImportMessage("✅ Doel toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewPurposeName("")
    }
  }

  const addNewCategory = async () => {
    if (newCategoryName.trim() && !categories.find((c) => c.name === newCategoryName.trim())) {
      const categoryName = newCategoryName.trim()
      const result = await saveCategory({ name: categoryName })
      if (result.error) {
        setImportError("Fout bij opslaan categorie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        const refreshResult = await fetchCategories()
        if (refreshResult.data) {
          setCategories(refreshResult.data)
        }
        setImportMessage("✅ Categorie toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewCategoryName("")
    }
  }

  // Remove functions
  const removeUser = async (userToRemove: string) => {
    const result = await deleteUser(userToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen gebruiker")
      setTimeout(() => setImportError(""), 3000)
    } else {
      await refreshUsersWithBadges()
      setImportMessage("✅ Gebruiker verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeProduct = async (productToRemove: Product) => {
    const result = await deleteProduct(productToRemove.id)
    if (result.error) {
      setImportError("Fout bij verwijderen product")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        setProducts(refreshResult.data)
      }
      setImportMessage("✅ Product verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeLocation = async (locationToRemove: string) => {
    const result = await deleteLocation(locationToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen locatie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchLocations()
      if (refreshResult.data) {
        setLocations(refreshResult.data)
      }
      setImportMessage("✅ Locatie verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removePurpose = async (purposeToRemove: string) => {
    const result = await deletePurpose(purposeToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen doel")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchPurposes()
      if (refreshResult.data) {
        setPurposes(refreshResult.data)
      }
      setImportMessage("✅ Doel verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeCategory = async (categoryToRemove: Category) => {
    const result = await deleteCategory(categoryToRemove.id)
    if (result.error) {
      setImportError("Fout bij verwijderen categorie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchCategories()
      if (refreshResult.data) {
        setCategories(refreshResult.data)
      }
      setImportMessage("✅ Categorie verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  // Function to get filtered and sorted registrations
  const getFilteredAndSortedRegistrations = () => {
    const filtered = registrations.filter((registration) => {
      if (historySearchQuery) {
        const searchLower = historySearchQuery.toLowerCase()
        const matchesSearch =
          registration.user.toLowerCase().includes(searchLower) ||
          registration.product.toLowerCase().includes(searchLower) ||
          registration.location.toLowerCase().includes(searchLower) ||
          registration.purpose.toLowerCase().includes(searchLower) ||
          (registration.qrcode && registration.qrcode.toLowerCase().includes(searchLower))

        if (!matchesSearch) return false
      }

      if (selectedHistoryUser !== "all" && registration.user !== selectedHistoryUser) {
        return false
      }

      if (selectedHistoryLocation !== "all" && registration.location !== selectedHistoryLocation) {
        return false
      }

      const registrationDate = new Date(registration.timestamp).toISOString().split("T")[0]

      if (dateFrom && registrationDate < dateFrom) {
        return false
      }

      if (dateTo && registrationDate > dateTo) {
        return false
      }

      return true
    })

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case "user":
          comparison = a.user.localeCompare(b.user, "nl", { sensitivity: "base" })
          break
        case "product":
          comparison = a.product.localeCompare(b.product, "nl", { sensitivity: "base" })
          break
        case "location":
          comparison = a.location.localeCompare(b.location, "nl", { sensitivity: "base" })
          break
        default:
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      }

      return sortOrder === "newest" ? -comparison : comparison
    })

    return filtered
  }

  // Function to get filtered and sorted users
  const getFilteredAndSortedUsers = () => {
    return users
      .filter((user) => user.name.toLowerCase().includes(userSearchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }))
  }

  // Statistics functions
  const getTopUsers = () => {
    const userCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.user] = (acc[reg.user] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getTopProducts = () => {
    const productCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.product] = (acc[reg.product] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getTopLocations = () => {
    const locationCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.location] = (acc[reg.location] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getProductChartData = () => {
    const productCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.product] = (acc[reg.product] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"]

    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product, count], index) => ({
        product,
        count,
        color: colors[index % colors.length],
      }))
  }

  // Function to get current user's role
  const getCurrentUserRole = () => {
    // First try to find user in the users array
    const currentUserData = users.find((user) => user.name === loggedInUser)
    if (currentUserData?.role) {
      return currentUserData.role
    }

    // Fallback: check if this is a known admin user
    const knownAdmins = ["Tom Peckstadt", "Wim Peckstadt", "wipeckstadt"]
    if (knownAdmins.includes(loggedInUser)) {
      return "admin"
    }

    // Default to user if no role found
    return "user"
  }

  // Debug logging
  console.log("🔍 Current user role check:", {
    loggedInUser,
    usersArray: users,
    foundUser: users.find((user) => user.name === loggedInUser),
    calculatedRole: getCurrentUserRole(),
  })

  // CONDITIONAL RENDERING AFTER ALL HOOKS
  console.log("🎨 Rendering main app interface")

  // Show loading screen
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">App wordt geladen...</p>
          <p className="text-xs text-gray-500">{connectionStatus}</p>
        </div>
      </div>
    )
  }

  // Show error if something went wrong
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="text-red-500 text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900">Er ging iets mis</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 Opnieuw Proberen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="shadow-lg">
            <CardHeader className="text-center bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex justify-center mb-4">
                <div
                  className="flex items-center bg-white p-4 rounded-lg shadow-sm border"
                  style={{ minWidth: "200px", height: "80px", position: "relative" }}
                >
                  <div className="w-1 h-12 bg-amber-500 absolute left-4"></div>
                  <div
                    className="text-2xl font-bold text-gray-800 tracking-wide absolute"
                    style={{ bottom: "16px", left: "32px" }}
                  >
                    DEMATIC
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Product Registratie</CardTitle>
              <CardDescription>Log in met je email adres en wachtwoord</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email adres
                  </Label>
                  <Input
                    type="email"
                    placeholder="je.naam@dematic.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Wachtwoord
                  </Label>
                  <Input
                    type="password"
                    placeholder="Voer je wachtwoord in"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">🏷️ Badge Login</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Scan of voer badge ID in"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      className="h-12 flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleBadgeLogin(e)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        // Focus the input field for external NFC readers
                        const badgeInput = document.querySelector(
                          'input[placeholder="Scan of voer badge ID in"]',
                        ) as HTMLInputElement
                        if (badgeInput) {
                          badgeInput.focus()
                        }
                      }}
                      className="h-12 px-4 bg-blue-600 hover:bg-blue-700"
                      disabled={isLoading}
                    >
                      🏷️ Scan badge
                    </Button>
                  </div>
                  {badgeError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{badgeError}</div>
                  )}
                  <Button
                    type="button"
                    onClick={handleBadgeLogin}
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                    disabled={isLoading || !badgeId.trim()}
                  >
                    {isLoading ? "Bezig met badge login..." : "🏷️ Login met Badge"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Of</span>
                  </div>
                </div>

                {loginError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{loginError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-amber-600 hover:bg-amber-700"
                  disabled={isLoading || !loginEmail.trim() || !loginPassword}
                >
                  {isLoading ? "Bezig met inloggen..." : "🔐 Inloggen"}
                </Button>

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div
                      className={`w-2 h-2 rounded-full ${isSupabaseConnected ? "bg-green-500" : "bg-orange-500"}`}
                    ></div>
                    <span>{connectionStatus}</span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div
                  className="flex items-center bg-white p-4 rounded-lg shadow-sm border"
                  style={{ minWidth: "200px", height: "80px", position: "relative" }}
                >
                  <div className="w-1 h-12 bg-amber-500 absolute left-4"></div>
                  <div
                    className="text-2xl font-bold text-gray-800 tracking-wide absolute"
                    style={{ bottom: "16px", left: "32px" }}
                  >
                    DEMATIC
                  </div>
                </div>
              </div>

              <div className="hidden lg:block w-px h-16 bg-gray-300"></div>

              <div className="text-center lg:text-left">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Product Registratie</h1>
                <p className="text-sm lg:text-base text-gray-600 mt-1">Registreer product gebruik en locatie</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isSupabaseConnected ? "bg-green-500" : "bg-orange-500"}`}
                  ></div>
                  <span>{connectionStatus}</span>
                </div>
                <div className="hidden md:block">{registrations.length} registraties</div>
              </div>

              {/* User Info and Logout */}
              {loggedInUser && (
                <div className="flex items-center gap-3 pl-4 border-l border-gray-300">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{loggedInUser}</div>
                    <div className="text-xs text-gray-500">Ingelogd</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-xs flex items-center gap-1 bg-transparent"
                  >
                    <LogOut className="h-3 w-3" />
                    Uitloggen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">✅ Product succesvol geregistreerd!</AlertDescription>
          </Alert>
        )}

        {importMessage && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">{importMessage}</AlertDescription>
          </Alert>
        )}

        {importError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{importError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="register" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 bg-white border border-gray-200 shadow-sm">
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Registreren
            </TabsTrigger>
            {getCurrentUserRole() === "admin" && (
              <>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
                >
                  Geschiedenis ({registrations.length})
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
                >
                  Gebruikers ({users.length})
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
                >
                  Producten ({products.length})
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
                >
                  Categorieën ({categories.length})
                </TabsTrigger>
                <TabsTrigger
                  value="locations"
                  className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
                >
                  Locaties ({locations.length})
                </TabsTrigger>
                <TabsTrigger
                  value="purposes"
                  className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
                >
                  Doelen ({purposes.length})
                </TabsTrigger>
                <TabsTrigger
                  value="statistics"
                  className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
                >
                  Statistieken
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="register">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📦 Nieuw Product Registreren</CardTitle>
                <CardDescription>Scan een QR code of vul onderstaande gegevens handmatig in</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">👤 Gebruiker</Label>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-sm font-medium text-green-800">✅ Ingelogd als: {loggedInUser}</div>
                        <div className="text-xs text-green-600 mt-1">
                          Registraties worden opgeslagen onder deze naam
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">🗂️ Categorie</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer een categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle categorieën</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm sm:text-base font-medium">📦 Product</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQrScanMode("registration")
                            startQrScanner()
                          }}
                          className="flex items-center gap-2 text-xs sm:text-sm"
                        >
                          <QrCode className="h-4 w-4" />
                          QR Scannen
                        </Button>
                      </div>

                      <div className="relative" ref={productSelectorRef}>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Zoek product..."
                            value={productSearchQuery}
                            onChange={(e) => {
                              setProductSearchQuery(e.target.value)
                              setShowProductDropdown(true)
                            }}
                            onFocus={() => setShowProductDropdown(true)}
                            className="h-10 sm:h-12 pr-10"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        {showProductDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {getFilteredProducts().length > 0 ? (
                              getFilteredProducts().map((product) => (
                                <div
                                  key={product.id}
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => handleProductSelect(product)}
                                >
                                  <div className="font-medium text-sm">{product.name}</div>
                                  {product.qrcode && (
                                    <div className="text-xs text-gray-500 mt-1">QR: {product.qrcode}</div>
                                  )}
                                  {product.categoryId && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      {categories.find((c) => c.id === product.categoryId)?.name}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500 text-sm">Geen producten gevonden</div>
                            )}
                          </div>
                        )}
                      </div>

                      {selectedProduct && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="text-sm font-medium text-green-800">✅ Geselecteerd: {selectedProduct}</div>
                          {qrScanResult && <div className="text-xs text-green-600 mt-1">QR Code: {qrScanResult}</div>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">📍 Locatie</Label>
                      <Select value={location} onValueChange={setLocation} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer locatie" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc} value={loc}>
                              {loc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">🎯 Doel</Label>
                      <Select value={purpose} onValueChange={setPurpose} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer doel" />
                        </SelectTrigger>
                        <SelectContent>
                          {purposes.map((purp) => (
                            <SelectItem key={purp} value={purp}>
                              {purp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium bg-amber-600 hover:bg-amber-700"
                    disabled={isLoading || !selectedProduct || !location || !purpose}
                  >
                    {isLoading ? "Bezig met opslaan..." : "📝 Product Registreren"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Scanner Modal */}
          {showQrScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">QR Code Scanner</h3>
                  <Button variant="ghost" size="sm" onClick={stopQrScanner}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📱</div>
                    <p className="text-gray-600 mb-4">Scan een QR code of voer handmatig in</p>
                  </div>
                  <div className="space-y-2">
                    <Label>QR Code</Label>
                    <Input
                      placeholder="Scan of typ QR code..."
                      value={qrScanResult}
                      onChange={(e) => setQrScanResult(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && qrScanResult.trim()) {
                          handleQrCodeDetected(qrScanResult.trim())
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => qrScanResult.trim() && handleQrCodeDetected(qrScanResult.trim())}
                      disabled={!qrScanResult.trim()}
                      className="flex-1"
                    >
                      ✅ Bevestigen
                    </Button>
                    <Button variant="outline" onClick={stopQrScanner} className="flex-1 bg-transparent">
                      ❌ Annuleren
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  )
}
