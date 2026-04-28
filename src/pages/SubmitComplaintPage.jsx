import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useLanguage } from "../hooks/useLanguage";
import useGeolocation from "../hooks/useGeolocation";
import { analyzeComplaintImage } from "../utils/geminiAI";
import {
  loadGoogleMapsScript,
  initializeMap,
  addDraggableMarker,
  getAddressFromCoordinates,
  getCoordinatesFromAddress,
} from "../utils/googleMaps";
import {
  submitComplaint,
  checkDuplicateComplaint,
} from "../utils/firebaseUtils";
import {
  WARD_NAMES,
  COMPLAINT_CATEGORIES,
  SEVERITY_LEVELS,
  INDORE_CENTER,
} from "../constants/translations";

const SubmitComplaintPage = () => {
  const { t } = useLanguage();
  const { location, loading: geoLoading } = useGeolocation();

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const [formData, setFormData] = useState({
    category: "Other",
    severity: "Medium",
    description: "",
    ward: "",
    latitude: INDORE_CENTER.lat,
    longitude: INDORE_CENTER.lng,
  });

  const [address, setAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [userAdjustedLocation, setUserAdjustedLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Update address when location changes
  async function updateAddressFromCoordinates(lat, lng) {
    try {
      const addr = await getAddressFromCoordinates(lat, lng);
      setAddress(addr);
    } catch (err) {
      console.error("Error fetching address:", err);
    }
  }

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        if (mapRef.current && !mapInstanceRef.current) {
          mapInstanceRef.current = initializeMap(
            "submitComplaintMap",
            { lat: formData.latitude, lng: formData.longitude },
            14,
          );
          markerRef.current = addDraggableMarker(
            mapInstanceRef.current,
            formData.latitude,
            formData.longitude,
            (newPos) => {
              setUserAdjustedLocation(true);
              setFormData((prev) => ({
                ...prev,
                latitude: newPos.lat,
                longitude: newPos.lng,
              }));
              updateAddressFromCoordinates(newPos.lat, newPos.lng);
            },
          );
        }
      } catch (err) {
        console.error("Map initialization error:", err);
      }
    };

    initMap();
  }, [formData.latitude, formData.longitude]);

  const applyDeviceLocation = () => {
    if (!location) {
      setError(
        "Device location is unavailable. Please enter the incident address manually.",
      );
      return;
    }

    setUserAdjustedLocation(false);
    setFormData((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    updateAddressFromCoordinates(location.latitude, location.longitude);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.panTo({
        lat: location.latitude,
        lng: location.longitude,
      });
      markerRef.current.setPosition({
        lat: location.latitude,
        lng: location.longitude,
      });
    }
    setError(null);
  };

  const handleAddressSearch = async () => {
    if (!manualAddress) {
      setError("Please enter an incident address or nearby landmark.");
      return;
    }

    try {
      const coords = await getCoordinatesFromAddress(manualAddress);
      if (!coords) {
        setError(
          "Could not find that address. Please try a nearby landmark or street name.",
        );
        return;
      }

      setUserAdjustedLocation(true);
      setFormData((prev) => ({
        ...prev,
        latitude: coords.lat,
        longitude: coords.lng,
      }));
      updateAddressFromCoordinates(coords.lat, coords.lng);

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.panTo({ lat: coords.lat, lng: coords.lng });
        markerRef.current.setPosition({ lat: coords.lat, lng: coords.lng });
      }
      setError(null);
    } catch (err) {
      setError("Unable to find the address. Please try a different location.");
      console.error("Address search error:", err);
    }
  };

  // Update location when geolocation is available
  useEffect(() => {
    if (!location || geoLoading || userAdjustedLocation) {
      return;
    }

    const timer = setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
      updateAddressFromCoordinates(location.latitude, location.longitude);

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.panTo({
          lat: location.latitude,
          lng: location.longitude,
        });
        markerRef.current.setPosition({
          lat: location.latitude,
          lng: location.longitude,
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [location, geoLoading, userAdjustedLocation]);

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (evt) => {
      setImagePreview(evt.target?.result);
    };
    reader.readAsDataURL(file);

    // Analyze with Gemini
    setAnalyzing(true);
    try {
      const analysis = await analyzeComplaintImage(file);
      if (analysis.success) {
        setAiAnalysis(analysis);
        setFormData((prev) => ({
          ...prev,
          category: analysis.category,
          severity: analysis.severity,
          description: analysis.description,
        }));
        setError(null);
      } else {
        setError(analysis.error || "Failed to analyze image");
      }
    } catch (err) {
      setError("Error analyzing image. Please try again.");
      console.error("Analysis error:", err);
    }
    setAnalyzing(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      setError("Please upload a photo first");
      return;
    }

    if (!formData.ward) {
      setError("Please select a ward");
      return;
    }

    // Check for duplicates
    const duplicate = await checkDuplicateComplaint(
      formData.category,
      formData.latitude,
      formData.longitude,
    );

    if (duplicate) {
      setDuplicateWarning(duplicate);
      return;
    }

    setSubmitting(true);
    try {
      const complaint = await submitComplaint(formData, imageFile);
      setSuccess(complaint);
      setFormData({
        category: "Other",
        severity: "Medium",
        description: "",
        ward: "",
        latitude: INDORE_CENTER.lat,
        longitude: INDORE_CENTER.lng,
      });
      setImageFile(null);
      setImagePreview(null);
      setAiAnalysis(null);
      setError(null);
      setDuplicateWarning(null);
    } catch (err) {
      setError("Failed to submit complaint. Please try again.");
      console.error("Submission error:", err);
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="surface-card rounded-[2rem] bg-white p-10 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.3)]">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-tertiary">
              Complaint Received
            </p>
            <h2 className="mt-3 text-4xl font-poppins font-extrabold text-tertiary">
              {t("complaintSubmitted")}
            </h2>
            <p className="mt-3 text-secondary">
              Our municipal team has received your report and will act quickly.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {t("complaintID")}
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {success.complaintID}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(success.complaintID);
                  alert("Copied to clipboard!");
                }}
                className="mt-5 primary-button"
              >
                {t("copy")}
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {t("category")}
                </p>
                <p className="mt-3 text-lg font-bold text-blue-700">
                  {success.category}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {t("severity")}
                </p>
                <p className="mt-3 text-lg font-bold text-slate-900">
                  {success.severity}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href={`/track?id=${success.complaintID}`}
              className="inline-flex rounded-full bg-cyan-600 px-7 py-3 text-sm font-bold text-white hover:bg-cyan-700 transition"
            >
              {t("trackStatus")} →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-default px-4 py-10">
      <div className="mb-10 rounded-[2rem] border border-tertiary bg-surface-soft p-8 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.18)]">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-tertiary">
              Official municipal grievance service
            </p>
            <h1 className="mt-3 text-4xl font-poppins font-extrabold text-tertiary">
              Report civic issues with confidence.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-secondary leading-7">
              Capture a photo, pinpoint the location, and submit your complaint
              instantly. Track status updates in Hindi or English and stay
              informed until the issue is resolved.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="hero-pill">Photo-based filing</span>
              <span className="hero-pill">Location auto-detect</span>
              <span className="hero-pill">Real-time tracking</span>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="hero-card p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-secondary">
                Why NagarSeva?
              </p>
              <p className="mt-3 text-lg font-semibold text-tertiary">
                Modern civic service experience for every resident.
              </p>
              <p className="mt-3 text-sm text-secondary">
                Submit issues in seconds and monitor progress transparently
                until resolution.
              </p>
            </div>
            <div className="hero-card p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-secondary">
                Trusted by city residents
              </p>
              <p className="mt-3 text-lg font-semibold text-tertiary">
                AI-backed classification
              </p>
              <p className="mt-3 text-sm text-secondary">
                Our intelligent assistant helps classify your issue accurately
                and quickly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-[1.75rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {duplicateWarning && (
        <div className="mb-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 text-sm text-slate-900">
          <p className="mb-4">
            ⚠️ {t("duplicateWarning")}
            <br />
            <span className="text-xs text-slate-500">
              ({duplicateWarning.complaintID})
            </span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => {
                setDuplicateWarning(null);
                handleSubmit({ preventDefault: () => {} });
              }}
              className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-600 transition"
            >
              {t("yes")}
            </button>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-300 transition"
            >
              {t("no")}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
        <motion.section
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="surface-card rounded-[2rem] bg-white/90 p-10 shadow-[0_25px_60px_-35px_rgba(26,115,232,0.3)] relative"
        >
          {/* Subtle glow effect behind card */}
          <div
            className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-100 to-transparent opacity-50"
            style={{ transform: "translateZ(-10px)" }}
          />

          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500">
                Citizen Report
              </p>
              <h1 className="mt-3 text-4xl font-poppins font-extrabold text-slate-900">
                {t("submitComplaint")} 📸
              </h1>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Ready to report
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-center">
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto h-64 w-full max-w-2xl rounded-[1.5rem] object-cover shadow-xl"
                  />
                  <label className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
                    {t("edit")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer rounded-[2rem] border-2 border-dashed border-slate-300 bg-white px-8 py-16 transition hover:border-blue-400 hover:bg-slate-50">
                  <div className="text-6xl">📷</div>
                  <p className="mt-6 text-xl font-semibold text-slate-900">
                    {t("uploadPhoto")}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {t("uploadPhotoDesc")}
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {analyzing && (
              <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  <p>{t("aiAnalyzing")}</p>
                </div>
              </div>
            )}

            {aiAnalysis && aiAnalysis.success && (
              <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50 p-5">
                <h3 className="font-bold text-blue-700">🤖 AI Suggestion</h3>
                <p className="mt-2 text-slate-700">{aiAnalysis.description}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  {t("category")}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  {t("severity")}
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {SEVERITY_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, severity: level }))
                      }
                      className={`rounded-[1.75rem] px-4 py-3 text-sm font-semibold transition ${
                        formData.severity === level
                          ? level === "High"
                            ? "bg-red-600 text-white"
                            : level === "Medium"
                              ? "bg-amber-400 text-slate-950"
                              : "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {level === "High"
                        ? "🔴"
                        : level === "Medium"
                          ? "🟡"
                          : "🟢"}{" "}
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                {t("ward")}
              </label>
              <select
                value={formData.ward}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, ward: e.target.value }))
                }
                className="w-full rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                required
              >
                <option value="">{t("selectWard")}</option>
                {WARD_NAMES.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                {t("description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value.slice(0, 200),
                  }))
                }
                placeholder={t("descriptionPlaceholder")}
                maxLength={200}
                className="h-40 w-full rounded-[1.75rem] border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm transition focus:border-blue-500 focus:ring-blue-100 focus:outline-none resize-none"
              />
              <p className="mt-3 text-xs text-slate-500">
                {formData.description.length}/200
              </p>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                📍 {t("selectLocation")}
              </label>
              <p className="mb-2 text-sm text-slate-500">
                {t("locationAutoDetected")}
              </p>
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Enter incident address or landmark"
                  className="w-full rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm transition focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="rounded-[1.75rem] bg-blue-600 px-5 py-4 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  Set location
                </button>
              </div>
              <button
                type="button"
                onClick={applyDeviceLocation}
                className="mb-4 inline-flex items-center justify-center rounded-[1.75rem] bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Use current device location
              </button>
              <p className="mb-4 text-sm text-slate-500">
                If you are reporting from home/office, type the incident address
                or drag the pin to the correct spot.
              </p>
              <div
                id="submitComplaintMap"
                ref={mapRef}
                className="h-72 rounded-[2rem] border border-slate-200 shadow-sm"
              />
              {address && (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  📍 {address}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || analyzing || !imageFile}
              className={`w-full rounded-[1.75rem] py-4 text-base font-semibold text-white transition ${
                submitting || analyzing || !imageFile
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95"
              }`}
            >
              {submitting ? "Submitting..." : t("submitBtn")}
            </button>
          </form>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="min-w-0 rounded-[2rem] bg-slate-950/95 p-8 text-white shadow-[0_25px_70px_-35px_rgba(15,23,42,0.45)] border border-slate-800 overflow-hidden"
        >
          <p className="inline-flex rounded-full bg-tertiary/20 px-4 py-2 text-xs uppercase tracking-[0.32em] text-cyan-100 shadow-sm">
            NagarSeva Highlights
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight break-words">
            Modern civic grievance solution
          </h2>
          <p className="mt-4 text-slate-300 leading-7 max-w-full break-words">
            Built for Indian municipalities with fast reporting, AI-powered
            classification, and realtime service tracking.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/95 p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.36)]">
              <p className="font-semibold text-cyan-200 text-lg leading-tight break-words">
                AI Classification
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300 break-words">
                Gemini suggests category and severity from your photo instantly.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/95 p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.36)]">
              <p className="font-semibold text-cyan-200 text-lg leading-tight break-words">
                Geo-tagged Reports
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300 break-words">
                Location pinning ensures municipal teams know exactly where help
                is needed.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/95 p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.36)]">
              <p className="font-semibold text-cyan-200 text-lg leading-tight break-words">
                Citizen-first UX
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300 break-words">
                Simple mobile-friendly forms built for quick reporting.
              </p>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
};

export default SubmitComplaintPage;
