export const translations = {
  en: {
    // Navigation
    navTitle: "NagarSeva 🏙️",
    trackMyComplaint: "Track My Complaint",
    adminDashboard: "Admin Dashboard",
    publicMap: "Public Map",
    language: "Language",
    logout: "Logout",

    // Home/Submit Page
    submitComplaint: "Submit Complaint",
    uploadPhoto: "Upload Photo",
    uploadPhotoDesc: "Take a photo or upload from gallery (max 5MB)",
    aiAnalyzing: "AI is analyzing your photo…",
    category: "Category",
    severity: "Severity",
    low: "Low",
    medium: "Medium",
    high: "High",
    description: "Description",
    descriptionPlaceholder: "Describe the issue briefly…",
    ward: "Ward",
    selectWard: "Select Ward",
    locationAutoDetected:
      "📍 Location auto-detected — drag pin to correct if needed.",
    submitBtn: "Submit Complaint 🚀",
    complaintSubmitted: "Complaint Submitted Successfully!",
    complaintID: "Complaint ID",
    copy: "Copy",
    trackStatus: "Track Status",

    // Categories
    roadDamage: "Road Damage",
    waterSupply: "Water Supply",
    electricity: "Electricity",
    drainage: "Drainage",
    garbage: "Garbage",
    other: "Other",

    // Tracker Page
    trackComplaint: "Track Complaint",
    enterComplaintID: "Enter Complaint ID",
    search: "Search",
    submitted: "Submitted",
    assigned: "Assigned",
    inProgress: "In Progress",
    resolved: "Resolved",
    expectedResolution: "Expected resolution:",
    within24Hours: "within 24 hours",
    within48Hours: "within 48 hours",
    share: "Share",
    complaintDetails: "Complaint Details",
    location: "Location",
    submittedAt: "Submitted At",

    // Admin Dashboard
    totalPending: "Total Pending",
    inProgressCount: "In Progress",
    resolvedToday: "Resolved Today",
    avgResolutionTime: "Avg Resolution Time",
    liveMapView: "Live Map View",
    complaintsTable: "Complaints Table",
    all: "All",
    pending: "Pending",
    resolved: "Resolved",
    id: "ID",
    ward: "Ward",
    submittedDate: "Submitted",
    actions: "Actions",
    updateStatus: "Update Status",
    addNote: "Add Note",
    viewDetails: "View Details",
    aiInsights: "🤖 AI Insights",
    topComplaints: "Most Common Complaints This Week",
    topWards: "Top Wards with Most Complaints",
    recommendations: "Recommendations",

    // Public Map
    heatmap: "Civic Issues Heatmap 🏙️",
    poweredBy: "Powered by NagarSeva",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    allTime: "All Time",
    hotIssue: "Hot Issue 🔥",
    thisAffectsMeToo: "👍 This affects me too",
    topIssues: "Top Issues",

    // Auth
    login: "Login",
    email: "Email",
    password: "Password",
    loginBtn: "Sign In",
    adminEmail: "admin@nagarseva.in",
    adminPassword: "Admin@1234",
    loginError: "Invalid credentials",
    offlineMode:
      "⚠️ You're offline. Your complaint will be submitted once connection is restored.",

    // Feedback
    rateIssueResolution: "Was your issue resolved?",
    avgRating: "Average Rating",
    resolution: "Resolution",
    resolutionPhoto: "Resolution Photo",

    // Errors & Success
    success: "Success",
    error: "Error",
    loading: "Loading...",
    noData: "No data available",
    tryAgain: "Try Again",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    uploadPhoto: "Upload Photo",
    selectLocation: "Select Location",
    duplicateWarning:
      "A similar complaint was already reported nearby. Do you still want to submit?",
    yes: "Yes",
    no: "No",
  },
};

export const WARD_NAMES = [
  "Ward 1 - Vijay Nagar",
  "Ward 2 - Palasia",
  "Ward 3 - Chhoti Gwari",
  "Ward 4 - Musakhedi",
  "Ward 5 - MG Road",
  "Ward 6 - Geeta Bhawan",
  "Ward 7 - Navlakha",
  "Ward 8 - Khajrana",
  "Ward 9 - Banasthali",
  "Ward 10 - Rajwada",
];

export const COMPLAINT_CATEGORIES = [
  "Road Damage",
  "Water Supply",
  "Electricity",
  "Drainage",
  "Garbage",
  "Other",
];

export const SEVERITY_LEVELS = ["Low", "Medium", "High"];

export const INDORE_CENTER = {
  lat: 22.7196,
  lng: 75.8577,
};
