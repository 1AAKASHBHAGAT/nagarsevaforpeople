import { db } from "../services/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { INDORE_CENTER, WARD_NAMES } from "../constants/translations";

// Generate random coordinates within Indore (3km radius)
const getRandomCoordinates = (centerLat, centerLng, radiusKm = 3) => {
  const radius = radiusKm / 111; // Convert km to degrees (approx)
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radius;

  return {
    latitude: centerLat + distance * Math.cos(angle),
    longitude: centerLng + distance * Math.sin(angle),
  };
};

// Mock complaint data
const generateMockComplaints = () => {
  const categories = [
    "Road Damage",
    "Water Supply",
    "Electricity",
    "Drainage",
    "Garbage",
  ];

  const descriptions = {
    "Road Damage": "Large pothole affecting traffic",
    "Water Supply": "No water supply for 3 days",
    Electricity: "Broken streetlight not working",
    Drainage: "Blocked drain causing water stagnation",
    Garbage: "Uncollected garbage pile",
  };

  const statuses = ["pending", "assigned", "inProgress", "resolved"];

  const complaints = [];
  for (let i = 0; i < 15; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const severity = i < 3 ? "High" : i < 8 ? "Medium" : "Low"; // 3 High, 5 Medium, 7 Low

    const coords = getRandomCoordinates(INDORE_CENTER.lat, INDORE_CENTER.lng);
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    complaints.push({
      complaintID: `NS-${new Date().getFullYear()}-${String(i + 1).padStart(5, "0")}`,
      category,
      severity,
      description: descriptions[category],
      latitude: coords.latitude,
      longitude: coords.longitude,
      ward: WARD_NAMES[Math.floor(Math.random() * WARD_NAMES.length)],
      status,
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      ),
      updatedAt: Timestamp.now(),
      votes: Math.floor(Math.random() * 10),
      ratings: [],
      averageRating: Math.random() * 5,
      photoURL: `https://via.placeholder.com/400x300?text=${category}`,
      resolutionPhotoURL:
        status === "resolved"
          ? "https://via.placeholder.com/400x300?text=Resolved"
          : null,
      notes: [],
    });
  }

  return complaints;
};

/**
 * Seed initial data to Firebase (only if using real Firebase)
 * Falls back to localStorage mock data if Firebase is not configured
 */
export const seedInitialData = async () => {
  try {
    const mockComplaints = generateMockComplaints();

    // Try to add to Firebase
    try {
      for (const complaint of mockComplaints) {
        await addDoc(collection(db, "complaints"), complaint);
      }
      console.log("✅ Seeded data to Firebase");
    } catch (fbError) {
      console.warn(
        "⚠️ Firebase not configured, using localStorage mock data",
        fbError.message,
      );
      // Fallback to localStorage
      localStorage.setItem(
        "nagarseva_mock_complaints",
        JSON.stringify(mockComplaints),
      );
    }
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};

/**
 * Get mock complaints from localStorage (fallback)
 */
export const getMockComplaints = () => {
  try {
    const data = localStorage.getItem("nagarseva_mock_complaints");
    return data ? JSON.parse(data) : generateMockComplaints();
  } catch (error) {
    return generateMockComplaints();
  }
};
