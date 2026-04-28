import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db, storage, isFirebaseConfigured } from "../services/firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

const LOCAL_COMPLAINTS_KEY = "nagarseva_mock_complaints";

const getFallbackComplaints = () => {
  try {
    const raw = localStorage.getItem(LOCAL_COMPLAINTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((complaint) => ({
      ...complaint,
      createdAt:
        typeof complaint.createdAt === "string"
          ? new Date(complaint.createdAt)
          : complaint.createdAt,
      updatedAt:
        typeof complaint.updatedAt === "string"
          ? new Date(complaint.updatedAt)
          : complaint.updatedAt,
    }));
  } catch (error) {
    console.warn("Unable to read fallback complaints:", error);
    return [];
  }
};

const setFallbackComplaints = (complaints) => {
  try {
    localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(complaints));
  } catch (error) {
    console.warn("Unable to save fallback complaints:", error);
  }
};

const saveFallbackComplaint = (complaint) => {
  const existing = getFallbackComplaints();
  setFallbackComplaints([...existing, complaint]);
};

const findFallbackComplaint = (complaintID) => {
  return getFallbackComplaints().find(
    (complaint) => complaint.complaintID === complaintID,
  );
};

const updateFallbackComplaint = (complaintID, updateData) => {
  const complaints = getFallbackComplaints();
  const index = complaints.findIndex(
    (complaint) => complaint.complaintID === complaintID,
  );

  if (index === -1) {
    throw new Error("Complaint not found");
  }

  const updated = {
    ...complaints[index],
    ...updateData,
    updatedAt: updateData.updatedAt || complaints[index].updatedAt,
  };

  complaints[index] = updated;
  setFallbackComplaints(complaints);
  return updated;
};

/**
 * Generate unique complaint ID
 */
export const generateComplaintID = () => {
  const randomNum = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `NS-${new Date().getFullYear()}-${randomNum}`;
};

/**
 * Submit a new complaint
 */
export const submitComplaint = async (complaintData, imageFile) => {
  try {
    let photoURL = null;
    const complaintID = generateComplaintID();

    // Upload image to Firebase Storage if provided
    if (imageFile && isFirebaseConfigured) {
      const storageRef = ref(
        storage,
        `complaints/${complaintID}/${imageFile.name}`,
      );
      await uploadBytes(storageRef, imageFile);
      photoURL = await getDownloadURL(storageRef);
    }

    // Create complaint document
    const complaint = {
      ...complaintData,
      complaintID,
      photoURL,
      status: "pending",
      createdAt: isFirebaseConfigured ? Timestamp.now() : new Date(),
      updatedAt: isFirebaseConfigured ? Timestamp.now() : new Date(),
      votes: 0,
      ratings: [],
      averageRating: 0,
      resolutionPhotoURL: null,
      notes: [],
    };

    if (!isFirebaseConfigured) {
      const fallbackComplaint = {
        ...complaint,
        documentID: complaintID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveFallbackComplaint(fallbackComplaint);
      return fallbackComplaint;
    }

    const docRef = await addDoc(collection(db, "complaints"), complaint);
    complaint.documentID = docRef.id;
    return complaint;
  } catch (error) {
    console.error("Error submitting complaint:", error);
    if (!isFirebaseConfigured) {
      const fallbackComplaint = {
        ...complaintData,
        complaintID: generateComplaintID(),
        photoURL: null,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        votes: 0,
        ratings: [],
        averageRating: 0,
        resolutionPhotoURL: null,
        notes: [],
      };
      saveFallbackComplaint(fallbackComplaint);
      return fallbackComplaint;
    }
    throw error;
  }
};

/**
 * Get complaint by ID
 */
export const getComplaintByID = async (complaintID) => {
  try {
    if (!isFirebaseConfigured) {
      const complaint = findFallbackComplaint(complaintID);
      return complaint
        ? { ...complaint, documentID: complaint.complaintID }
        : null;
    }

    const q = query(
      collection(db, "complaints"),
      where("complaintID", "==", complaintID),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { ...doc.data(), documentID: doc.id };
  } catch (error) {
    console.error("Error fetching complaint:", error);
    throw error;
  }
};

/**
 * Get all complaints with filters
 */
export const getComplaints = async (filters = {}) => {
  try {
    if (!isFirebaseConfigured) {
      let fallback = getFallbackComplaints();

      if (filters.status) {
        fallback = fallback.filter((complaint) => complaint.status === filters.status);
      }
      if (filters.category) {
        fallback = fallback.filter((complaint) => complaint.category === filters.category);
      }
      if (filters.ward) {
        fallback = fallback.filter((complaint) => complaint.ward === filters.ward);
      }

      fallback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return fallback.slice(0, filters.limit || undefined);
    }

    let constraints = [];

    if (filters.status) {
      constraints.push(where("status", "==", filters.status));
    }

    if (filters.category) {
      constraints.push(where("category", "==", filters.category));
    }

    if (filters.ward) {
      constraints.push(where("ward", "==", filters.ward));
    }

    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(collection(db, "complaints"), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      documentID: doc.id,
    }));
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return getFallbackComplaints();
  }
};

/**
 * Update complaint status
 */
export const updateComplaintStatus = async (
  complaintID,
  newStatus,
  note = null,
) => {
  try {
    if (!isFirebaseConfigured) {
      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
      };
      if (note) {
        const complaint = findFallbackComplaint(complaintID);
        const existingNotes = complaint?.notes || [];
        updateData.notes = [
          ...existingNotes,
          { text: note, timestamp: new Date() },
        ];
      }
      updateFallbackComplaint(complaintID, updateData);
      return true;
    }

    const q = query(
      collection(db, "complaints"),
      where("complaintID", "==", complaintID),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Complaint not found");
    }

    const docRef = doc(db, "complaints", snapshot.docs[0].id);
    const updateData = {
      status: newStatus,
      updatedAt: Timestamp.now(),
    };

    if (note) {
      const existingNotes = snapshot.docs[0].data().notes || [];
      updateData.notes = [
        ...existingNotes,
        { text: note, timestamp: Timestamp.now() },
      ];
    }

    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating complaint:", error);
    throw error;
  }
};

/**
 * Upload resolution photo
 */
export const uploadResolutionPhoto = async (complaintID, photoFile) => {
  try {
    if (!isFirebaseConfigured) {
      const photoURL = `fallback-resolutions/${complaintID}/${photoFile.name}`;
      updateFallbackComplaint(complaintID, {
        resolutionPhotoURL: photoURL,
        updatedAt: new Date(),
      });
      return photoURL;
    }

    const storageRef = ref(
      storage,
      `resolutions/${complaintID}/${photoFile.name}`,
    );
    await uploadBytes(storageRef, photoFile);
    const photoURL = await getDownloadURL(storageRef);

    const q = query(
      collection(db, "complaints"),
      where("complaintID", "==", complaintID),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Complaint not found");
    }

    const docRef = doc(db, "complaints", snapshot.docs[0].id);
    await updateDoc(docRef, {
      resolutionPhotoURL: photoURL,
      updatedAt: Timestamp.now(),
    });

    return photoURL;
  } catch (error) {
    console.error("Error uploading resolution photo:", error);
    throw error;
  }
};

/**
 * Add feedback/rating to complaint
 */
export const addComplaintRating = async (complaintID, rating) => {
  try {
    if (!isFirebaseConfigured) {
      const complaint = findFallbackComplaint(complaintID);
      if (!complaint) {
        throw new Error("Complaint not found");
      }
      const ratings = complaint.ratings || [];
      const updatedRatings = [...ratings, rating];
      const averageRating =
        updatedRatings.reduce((a, b) => a + b, 0) / updatedRatings.length;
      updateFallbackComplaint(complaintID, {
        ratings: updatedRatings,
        averageRating,
        updatedAt: new Date(),
      });
      return averageRating;
    }

    const q = query(
      collection(db, "complaints"),
      where("complaintID", "==", complaintID),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Complaint not found");
    }

    const complaintData = snapshot.docs[0].data();
    const ratings = complaintData.ratings || [];
    ratings.push(rating);

    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const docRef = doc(db, "complaints", snapshot.docs[0].id);
    await updateDoc(docRef, {
      ratings,
      averageRating,
      updatedAt: Timestamp.now(),
    });

    return averageRating;
  } catch (error) {
    console.error("Error adding rating:", error);
    throw error;
  }
};

/**
 * Increment votes on a complaint
 */
export const upvoteComplaint = async (complaintID) => {
  try {
    if (!isFirebaseConfigured) {
      const complaint = findFallbackComplaint(complaintID);
      if (!complaint) {
        throw new Error("Complaint not found");
      }
      const updatedComplaint = updateFallbackComplaint(complaintID, {
        votes: (complaint.votes || 0) + 1,
        updatedAt: new Date(),
      });
      return updatedComplaint.votes;
    }

    const q = query(
      collection(db, "complaints"),
      where("complaintID", "==", complaintID),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Complaint not found");
    }

    const docRef = doc(db, "complaints", snapshot.docs[0].id);
    const currentVotes = snapshot.docs[0].data().votes || 0;

    await updateDoc(docRef, {
      votes: currentVotes + 1,
      updatedAt: Timestamp.now(),
    });

    return currentVotes + 1;
  } catch (error) {
    console.error("Error upvoting complaint:", error);
    throw error;
  }
};

/**
 * Check for duplicate complaints nearby
 */
export const checkDuplicateComplaint = async (
  category,
  lat,
  lng,
  radiusMeters = 100,
) => {
  try {
    const allComplaints = await getComplaints();

    const nearby = allComplaints.filter((complaint) => {
      if (complaint.category !== category) return false;

      // Check if created in last 24 hours
      const createdAt =
        complaint.createdAt?.toDate?.() || new Date(complaint.createdAt);
      const dayAgo = new Date();
      dayAgo.setHours(dayAgo.getHours() - 24);

      if (createdAt < dayAgo) return false;

      // Check distance
      const distance = calculateDistance(
        lat,
        lng,
        complaint.latitude,
        complaint.longitude,
      );
      return distance <= radiusMeters;
    });

    return nearby.length > 0 ? nearby[0] : null;
  } catch (error) {
    console.error("Error checking duplicates:", error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Convert to meters
};

/**
 * Get statistics for dashboard
 */
export const getComplaintStats = async () => {
  try {
    const complaints = await getComplaints({ limit: 1000 });

    const stats = {
      total: complaints.length,
      pending: complaints.filter((c) => c.status === "pending").length,
      inProgress: complaints.filter((c) => c.status === "inProgress").length,
      resolved: complaints.filter((c) => c.status === "resolved").length,
      categories: {},
      wards: {},
      avgResolutionTime: 0,
    };

    // Count by category
    complaints.forEach((c) => {
      stats.categories[c.category] = (stats.categories[c.category] || 0) + 1;
      stats.wards[c.ward] = (stats.wards[c.ward] || 0) + 1;
    });

    // Calculate avg resolution time
    const resolvedComplaints = complaints.filter(
      (c) => c.status === "resolved" && c.createdAt && c.updatedAt,
    );
    if (resolvedComplaints.length > 0) {
      const avgTime =
        resolvedComplaints.reduce((sum, c) => {
          const created = c.createdAt?.toDate?.() || new Date(c.createdAt);
          const updated = c.updatedAt?.toDate?.() || new Date(c.updatedAt);
          return sum + (updated - created) / (1000 * 60 * 60); // Convert to hours
        }, 0) / resolvedComplaints.length;
      stats.avgResolutionTime = Math.round(avgTime);
    }

    return stats;
  } catch (error) {
    console.error("Error getting stats:", error);
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      categories: {},
      wards: {},
      avgResolutionTime: 0,
    };
  }
};
