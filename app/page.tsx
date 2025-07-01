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
import { X, QrCode, LogOut, Lock, Mail } from "lucide-react"

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
    if (newCategoryName.trim()) {
      const newCategory = { name: newCategoryName.trim() }
      const result = await saveCategory(newCategory)
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

  // Delete functions
  const handleDeleteUser = async (userName: string) => {
    if (confirm(`Weet je zeker dat je gebruiker "${userName}" wilt verwijderen?`)) {
      const result = await deleteUser(userName)
      if (result.error) {
        setImportError("Fout bij verwijderen gebruiker")
        setTimeout(() => setImportError(""), 3000)
      } else {
        await refreshUsersWithBadges()
        setImportMessage("✅ Gebruiker verwijderd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (confirm(`Weet je zeker dat je product "${product?.name}" wilt verwijderen?`)) {
      const result = await deleteProduct(productId)
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
  }

  const handleDeleteLocation = async (locationName: string) => {
    if (confirm(`Weet je zeker dat je locatie "${locationName}" wilt verwijderen?`)) {
      const result = await deleteLocation(locationName)
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
  }

  const handleDeletePurpose = async (purposeName: string) => {
    if (confirm(`Weet je zeker dat je doel "${purposeName}" wilt verwijderen?`)) {
      const result = await deletePurpose(purposeName)
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
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (confirm(`Weet je zeker dat je categorie "${category?.name}" wilt verwijderen?`)) {
      const result = await deleteCategory(categoryId)
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
  }

  // Filter functions
  const getFilteredRegistrations = () => {
    let filtered = registrations

    if (historySearchQuery) {
      const query = historySearchQuery.toLowerCase()
      filtered = filtered.filter(
        (reg) =>
          reg.user.toLowerCase().includes(query) ||
          reg.product.toLowerCase().includes(query) ||
          reg.location.toLowerCase().includes(query) ||
          reg.purpose.toLowerCase().includes(query),
      )
    }

    if (selectedHistoryUser !== "all") {
      filtered = filtered.filter((reg) => reg.user === selectedHistoryUser)
    }

    if (selectedHistoryLocation !== "all") {
      filtered = filtered.filter((reg) => reg.location === selectedHistoryLocation)
    }

    if (dateFrom) {
      filtered = filtered.filter((reg) => reg.date >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter((reg) => reg.date <= dateTo)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.timestamp).getTime()
        const dateB = new Date(b.timestamp).getTime()
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB
      } else if (sortBy === "user") {
        return sortOrder === "asc" ? a.user.localeCompare(b.user) : b.user.localeCompare(a.user)
      } else if (sortBy === "product") {
        return sortOrder === "asc" ? a.product.localeCompare(b.product) : b.product.localeCompare(a.product)
      }
      return 0
    })

    return filtered
  }

  const getFilteredProductsForManagement = () => {
    let filtered = products

    if (productSearchFilter) {
      const query = productSearchFilter.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.qrcode && product.qrcode.toLowerCase().includes(query)),
      )
    }

    return filtered
  }

  const getFilteredUsers = () => {
    if (!userSearchQuery) return users

    const query = userSearchQuery.toLowerCase()
    return users.filter((user) => user.name.toLowerCase().includes(query))
  }

  // Statistics functions
  const getStatistics = () => {
    const totalRegistrations = registrations.length
    const uniqueUsers = new Set(registrations.map((r) => r.user)).size
    const uniqueProducts = new Set(registrations.map((r) => r.product)).size

    const today = new Date().toISOString().split("T")[0]
    const todayRegistrations = registrations.filter((r) => r.date === today).length

    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    const last7DaysRegistrations = registrations.filter((r) => new Date(r.date) >= last7Days).length

    const topUsers = Object.entries(
      registrations.reduce(
        (acc, reg) => {
          acc[reg.user] = (acc[reg.user] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    const topProducts = Object.entries(
      registrations.reduce(
        (acc, reg) => {
          acc[reg.product] = (acc[reg.product] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    return {
      totalRegistrations,
      uniqueUsers,
      uniqueProducts,
      todayRegistrations,
      last7DaysRegistrations,
      topUsers,
      topProducts,
    }
  }

  // Show loading screen if not ready
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">App wordt geladen...</p>
            <p className="text-sm text-gray-500 mt-2">{connectionStatus}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error screen if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Fout bij laden</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Opnieuw proberen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img
                src="/images/interflon-logo-official.jpg"
                alt="Interflon Logo"
                className="h-16 w-auto mx-auto"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=64&width=120&text=Interflon"
                }}
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Inloggen</CardTitle>
            <CardDescription>Log in om de product registratie app te gebruiken</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email/Password Login */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="je.naam@dematic.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Voer je wachtwoord in"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              {loginError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Bezig met inloggen..." : "Inloggen"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Of</span>
              </div>
            </div>

            {/* Badge Login */}
            <form onSubmit={handleBadgeLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="badge">Badge ID</Label>
                <Input
                  id="badge"
                  type="text"
                  placeholder="Scan je badge of voer ID in"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {badgeError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{badgeError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" variant="outline" className="w-full bg-transparent" disabled={isLoading}>
                {isLoading ? "Bezig met badge login..." : "Login met Badge"}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-500">
              <p>Status: {connectionStatus}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/images/interflon-logo-official.jpg"
                alt="Interflon Logo"
                className="h-10 sm:h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=48&width=120&text=Interflon"
                }}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Registratie</h1>
                <p className="text-sm text-gray-600">Welkom, {loggedInUser}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500 text-right">
                <div>{isSupabaseConnected ? "🟢 Live data" : "🟡 Mock data"}</div>
                <div>{connectionStatus}</div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Status Messages */}
        {(importMessage || importError || showSuccess) && (
          <div className="mb-4 space-y-2">
            {importMessage && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">{importMessage}</AlertDescription>
              </Alert>
            )}
            {importError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{importError}</AlertDescription>
              </Alert>
            )}
            {showSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">✅ Product succesvol geregistreerd!</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 mb-6">
            <TabsTrigger value="register" className="text-xs sm:text-sm">
              Registreer
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              Geschiedenis
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              Gebruikers
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">
              Producten
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm">
              Categorieën
            </TabsTrigger>
            <TabsTrigger value="locations" className="text-xs sm:text-sm">
              Locaties
            </TabsTrigger>
            <TabsTrigger value="purposes" className="text-xs sm:text-sm">
              Doelen
            </TabsTrigger>
            <TabsTrigger value="statistics" className="text-xs sm:text-sm">
              Statistieken
            </TabsTrigger>
          </TabsList>

          {/* Registration Tab */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Product Registratie</CardTitle>
                <CardDescription>Registreer een product voor gebruik</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* User Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="user">Gebruiker</Label>
                    <Select value={currentUser} onValueChange={setCurrentUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer gebruiker" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredUsers().map((user) => (
                          <SelectItem key={user.name} value={user.name}>
                            {user.name} {user.role === "admin" && "(Admin)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Selection */}
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative" ref={productSelectorRef}>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Alle categorieën" />
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
                            <Input
                              placeholder="Zoek product..."
                              value={productSearchQuery}
                              onChange={(e) => {
                                setProductSearchQuery(e.target.value)
                                setShowProductDropdown(true)
                              }}
                              onFocus={() => setShowProductDropdown(true)}
                              className="flex-1"
                            />
                          </div>
                        </div>

                        {showProductDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {getFilteredProducts().length > 0 ? (
                              getFilteredProducts().map((product) => (
                                <div
                                  key={product.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => handleProductSelect(product)}
                                >
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500 flex items-center gap-2">
                                    {product.qrcode && <span>QR: {product.qrcode}</span>}
                                    {product.categoryId && (
                                      <span>
                                        Categorie: {categories.find((c) => c.id === product.categoryId)?.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500">Geen producten gevonden</div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setQrScanMode("registration")
                          startQrScanner()
                        }}
                        variant="outline"
                        size="icon"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedProduct && (
                      <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                        ✅ Geselecteerd: {selectedProduct}
                      </div>
                    )}
                  </div>

                  {/* Location Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Locatie</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger>
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

                  {/* Purpose Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Doel</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger>
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

                  {/* QR Scan Result */}
                  {qrScanResult && (
                    <div className="space-y-2">
                      <Label>Gescande QR Code</Label>
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">{qrScanResult}</div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Bezig met registreren..." : "Registreer Product"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Registratie Geschiedenis</CardTitle>
                <CardDescription>Bekijk alle product registraties</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Input
                    placeholder="Zoek in geschiedenis..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                  />
                  <Select value={selectedHistoryUser} onValueChange={setSelectedHistoryUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle gebruikers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle gebruikers</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.name} value={user.name}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedHistoryLocation} onValueChange={setSelectedHistoryLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle locaties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle locaties</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>

                {/* Sort Options */}
                <div className="flex gap-2 mb-4">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Datum</SelectItem>
                      <SelectItem value="user">Gebruiker</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortBy === "date" ? (
                        <>
                          <SelectItem value="newest">Nieuwste eerst</SelectItem>
                          <SelectItem value="oldest">Oudste eerst</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="asc">A-Z</SelectItem>
                          <SelectItem value="desc">Z-A</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* History List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredRegistrations().length > 0 ? (
                    getFilteredRegistrations().map((registration) => (
                      <div key={registration.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Gebruiker:</span>
                            <div>{registration.user}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Product:</span>
                            <div>{registration.product}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Locatie:</span>
                            <div>{registration.location}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Doel:</span>
                            <div>{registration.purpose}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex justify-between">
                          <span>
                            {registration.date} om {registration.time}
                          </span>
                          {registration.qrcode && <span>QR: {registration.qrcode}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">Geen registraties gevonden</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gebruikers Beheer</CardTitle>
                <CardDescription>Beheer gebruikers en hun toegangsrechten</CardDescription>
              </CardHeader>
              <CardContent>
                {/* User Search */}
                <div className="mb-4">
                  <Input
                    placeholder="Zoek gebruikers..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                </div>

                {/* Add New User with Auth */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Nieuwe gebruiker toevoegen (met inlog-account)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <Input placeholder="Naam" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Wachtwoord (min. 6 tekens)"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                    <Select value={newUserLevel} onValueChange={setNewUserLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Gebruiker</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Badge Code (optioneel)"
                      value={newUserBadgeCode}
                      onChange={(e) => setNewUserBadgeCode(e.target.value)}
                    />
                  </div>
                  <Button onClick={addNewUserWithAuth} className="mt-2" disabled={isLoading}>
                    {isLoading ? "Bezig..." : "Toevoegen"}
                  </Button>
                </div>

                {/* Import/Export Section */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
                  <h3 className="font-medium mb-3">Import/Export Gebruikers</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={downloadUserTemplate} variant="outline" size="sm">
                      📄 Download Template
                    </Button>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportUsersExcel}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isLoading}
                      />
                      <Button variant="outline" size="sm" disabled={isLoading}>
                        📥 Import Excel
                      </Button>
                    </div>
                    <Button onClick={handleExportUsersExcel} variant="outline" size="sm">
                      📤 Export Excel
                    </Button>
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredUsers().length > 0 ? (
                    getFilteredUsers().map((user) => (
                      <div
                        key={user.name}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-4">
                            <span>Rol: {user.role === "admin" ? "Admin" : "Gebruiker"}</span>
                            {user.badgeCode && <span>Badge: {user.badgeCode}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditUser(user.name)} variant="outline" size="sm">
                            Bewerken
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(user.name)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">Geen gebruikers gevonden</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Beheer</CardTitle>
                <CardDescription>Beheer producten en hun QR codes</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Product Search */}
                <div className="mb-4">
                  <Input
                    placeholder="Zoek producten..."
                    value={productSearchFilter}
                    onChange={(e) => setProductSearchFilter(e.target.value)}
                  />
                </div>

                {/* Add New Product */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Nieuw product toevoegen</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <Input
                      placeholder="Product naam"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <div className="flex gap-1">
                      <Input
                        placeholder="QR Code (optioneel)"
                        value={newProductQrCode}
                        onChange={(e) => setNewProductQrCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          setQrScanMode("product-management")
                          startQrScanner()
                        }}
                        variant="outline"
                        size="icon"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Categorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen categorie</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addNewProduct}>Toevoegen</Button>
                  </div>
                </div>

                {/* Import/Export Section */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
                  <h3 className="font-medium mb-3">Import/Export & QR Codes</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportExcel}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm">
                        📥 Import CSV
                      </Button>
                    </div>
                    <Button onClick={handleExportExcel} variant="outline" size="sm">
                      📤 Export CSV
                    </Button>
                    <Button onClick={printAllQRCodes} variant="outline" size="sm">
                      🖨️ Print alle QR codes
                    </Button>
                    <Button onClick={exportQRCodesForLabelPrinter} variant="outline" size="sm">
                      🏷️ Export voor labelprinter
                    </Button>
                  </div>
                </div>

                {/* Products List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredProductsForManagement().length > 0 ? (
                    getFilteredProductsForManagement().map((product) => (
                      <div key={product.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500 space-y-1">
                              <div className="flex items-center gap-4">
                                {product.qrcode ? (
                                  <span className="text-green-600">QR: {product.qrcode}</span>
                                ) : (
                                  <span className="text-gray-400">Geen QR code</span>
                                )}
                                {product.categoryId && (
                                  <span>Categorie: {categories.find((c) => c.id === product.categoryId)?.name}</span>
                                )}
                              </div>
                              {product.attachmentUrl && (
                                <div>
                                  <a
                                    href={product.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    📎 {product.attachmentName}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Button onClick={() => handleEditProduct(product)} variant="outline" size="sm">
                              Bewerken
                            </Button>
                            {!product.qrcode && (
                              <Button onClick={() => generateQRCode(product)} variant="outline" size="sm">
                                QR Genereren
                              </Button>
                            )}
                            {product.qrcode && (
                              <Button onClick={() => printQRCode(product)} variant="outline" size="sm">
                                🖨️ Print QR
                              </Button>
                            )}
                            <div className="relative">
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleAttachmentUpload(product, e)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Button variant="outline" size="sm">
                                📎 PDF
                              </Button>
                            </div>
                            {product.attachmentUrl && (
                              <Button
                                onClick={() => handleRemoveAttachment(product)}
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                              >
                                🗑️
                              </Button>
                            )}
                            <Button
                              onClick={() => handleDeleteProduct(product.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              Verwijderen
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">Geen producten gevonden</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Categorieën Beheer</CardTitle>
                <CardDescription>Beheer product categorieën</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add New Category */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Nieuwe categorie toevoegen</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Categorie naam"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addNewCategory}>Toevoegen</Button>
                  </div>
                </div>

                {/* Categories List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-gray-500">
                            {products.filter((p) => p.categoryId === category.id).length} producten
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditCategory(category)} variant="outline" size="sm">
                            Bewerken
                          </Button>
                          <Button
                            onClick={() => handleDeleteCategory(category.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">Geen categorieën gevonden</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <CardTitle>Locaties Beheer</CardTitle>
                <CardDescription>Beheer beschikbare locaties</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add New Location */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Nieuwe locatie toevoegen</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Locatie naam"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addNewLocation}>Toevoegen</Button>
                  </div>
                </div>

                {/* Locations List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {locations.length > 0 ? (
                    locations.map((location) => (
                      <div
                        key={location}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{location}</div>
                          <div className="text-sm text-gray-500">
                            {registrations.filter((r) => r.location === location).length} registraties
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditLocation(location)} variant="outline" size="sm">
                            Bewerken
                          </Button>
                          <Button
                            onClick={() => handleDeleteLocation(location)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">Geen locaties gevonden</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purposes Tab */}
          <TabsContent value="purposes">
            <Card>
              <CardHeader>
                <CardTitle>Doelen Beheer</CardTitle>
                <CardDescription>Beheer beschikbare doelen</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add New Purpose */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-3">Nieuw doel toevoegen</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Doel naam"
                      value={newPurposeName}
                      onChange={(e) => setNewPurposeName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addNewPurpose}>Toevoegen</Button>
                  </div>
                </div>

                {/* Purposes List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {purposes.length > 0 ? (
                    purposes.map((purpose) => (
                      <div
                        key={purpose}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{purpose}</div>
                          <div className="text-sm text-gray-500">
                            {registrations.filter((r) => r.purpose === purpose).length} registraties
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditPurpose(purpose)} variant="outline" size="sm">
                            Bewerken
                          </Button>
                          <Button
                            onClick={() => handleDeletePurpose(purpose)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">Geen doelen gevonden</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Statistieken</CardTitle>
                <CardDescription>Overzicht van registratie statistieken</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const stats = getStatistics()
                  return (
                    <div className="space-y-6">
                      {/* Overview Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.totalRegistrations}</div>
                            <div className="text-sm text-gray-600">Totaal registraties</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.uniqueUsers}</div>
                            <div className="text-sm text-gray-600">Actieve gebruikers</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.uniqueProducts}</div>
                            <div className="text-sm text-gray-600">Gebruikte producten</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.todayRegistrations}</div>
                            <div className="text-sm text-gray-600">Vandaag</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Top Users */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Top 5 Gebruikers</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {stats.topUsers.map(([user, count], index) => (
                              <div key={user} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </span>
                                  <span>{user}</span>
                                </div>
                                <span className="font-medium">{count} registraties</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Top Products */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Top 5 Producten</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {stats.topProducts.map(([product, count], index) => (
                              <div key={product} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </span>
                                  <span className="truncate">{product}</span>
                                </div>
                                <span className="font-medium">{count} keer gebruikt</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialogs */}
        {showEditDialog && editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Product bewerken</h3>
              <div className="space-y-4">
                <div>
                  <Label>Product naam</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>QR Code</Label>
                  <Input
                    value={editingProduct.qrcode || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, qrcode: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categorie</Label>
                  <Select
                    value={editingProduct.categoryId || "none"}
                    onValueChange={(value) =>
                      setEditingProduct({ ...editingProduct, categoryId: value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen categorie</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSaveProduct} className="flex-1">
                  Opslaan
                </Button>
                <Button onClick={() => setShowEditDialog(false)} variant="outline" className="flex-1">
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {showEditCategoryDialog && editingCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Categorie bewerken</h3>
              <div className="space-y-4">
                <div>
                  <Label>Categorie naam</Label>
                  <Input
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSaveCategory} className="flex-1">
                  Opslaan
                </Button>
                <Button onClick={() => setShowEditCategoryDialog(false)} variant="outline" className="flex-1">
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {showEditUserDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Gebruiker bewerken</h3>
              <div className="space-y-4">
                <div>
                  <Label>Gebruikersnaam</Label>
                  <Input value={editingUser} onChange={(e) => setEditingUser(e.target.value)} />
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={editingUserRole} onValueChange={setEditingUserRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Gebruiker</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Badge Code</Label>
                  <Input
                    value={editingUserBadgeCode}
                    onChange={(e) => setEditingUserBadgeCode(e.target.value)}
                    placeholder="Optioneel"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSaveUser} className="flex-1" disabled={isLoading}>
                  {isLoading ? "Bezig..." : "Opslaan"}
                </Button>
                <Button onClick={() => setShowEditUserDialog(false)} variant="outline" className="flex-1">
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {showEditLocationDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Locatie bewerken</h3>
              <div className="space-y-4">
                <div>
                  <Label>Locatie naam</Label>
                  <Input value={editingLocation} onChange={(e) => setEditingLocation(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSaveLocation} className="flex-1">
                  Opslaan
                </Button>
                <Button onClick={() => setShowEditLocationDialog(false)} variant="outline" className="flex-1">
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {showEditPurposeDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Doel bewerken</h3>
              <div className="space-y-4">
                <div>
                  <Label>Doel naam</Label>
                  <Input value={editingPurpose} onChange={(e) => setEditingPurpose(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSavePurpose} className="flex-1">
                  Opslaan
                </Button>
                <Button onClick={() => setShowEditPurposeDialog(false)} variant="outline" className="flex-1">
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* QR Scanner Modal */}
        {showQrScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">QR Code Scanner</h3>
                <Button onClick={stopQrScanner} variant="outline" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center">
                <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="text-gray-500">
                    <QrCode className="h-12 w-12 mx-auto mb-2" />
                    <p>QR Scanner zou hier komen</p>
                    <p className="text-sm">Voer QR code handmatig in:</p>
                  </div>
                </div>
                <Input
                  placeholder="QR Code"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      const value = (e.target as HTMLInputElement).value
                      if (value) {
                        handleQrCodeDetected(value)
                        ;(e.target as HTMLInputElement).value = ""
                      }
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
