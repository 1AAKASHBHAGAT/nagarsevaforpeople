import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../hooks/useLanguage";
import {
  getComplaintByID,
  addComplaintRating,
  upvoteComplaint,
} from "../utils/firebaseUtils";
import {
  loadGoogleMapsScript,
  initializeMap,
  addMarker,
  getMarkerIcon,
} from "../utils/googleMaps";
import { SEVERITY_LEVELS } from "../constants/translations";

const ComplaintTrackerPage = () => {
  const { t } = useLanguage();
  const [complaintID, setComplaintID] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "";
  });

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Fetch complaint
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!complaintID.trim()) {
      setError("Please enter a complaint ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getComplaintByID(complaintID);
      if (data) {
        setComplaint(data);
        setShowRating(data.status === "resolved");
        setHasVoted(false);
      } else {
        setError("Complaint not found");
        setComplaint(null);
      }
    } catch (err) {
      setError("Error fetching complaint");
      console.error(err);
    }
    setLoading(false);
  };

  // Initialize map when complaint is loaded
  useEffect(() => {
    if (complaint && mapRef.current && !mapInstanceRef.current) {
      const initMap = async () => {
        try {
          await loadGoogleMapsScript();
          mapInstanceRef.current = initializeMap(
            "trackerMap",
            {
              lat: complaint.latitude,
              lng: complaint.longitude,
            },
            16,
          );

          addMarker(
            mapInstanceRef.current,
            complaint.latitude,
            complaint.longitude,
            complaint.complaintID,
            getMarkerIcon(complaint.status),
            `<div class="p-3 bg-white rounded-lg shadow-lg border border-tertiary">
              <p class="font-bold text-tertiary">${complaint.complaintID}</p>
              <p class="text-primary">${complaint.category}</p>
              <p class="text-xs text-secondary">${complaint.address || "Location"}</p>
            </div>`,
          );
        } catch (err) {
          console.error("Map error:", err);
        }
      };
      initMap();
    }
  }, [complaint]);

  const getStatusIndex = () => {
    const statuses = ["pending", "assigned", "inProgress", "resolved"];
    return statuses.indexOf(complaint?.status) || 0;
  };

  const statusLabels = [
    t("submitted"),
    t("assigned"),
    t("inProgress"),
    t("resolved"),
  ];
  const statusIndex = complaint ? getStatusIndex() : 0;

  const handleRating = async () => {
    if (rating > 0) {
      try {
        await addComplaintRating(complaint.complaintID, rating);
        alert(`Thanks for rating ${rating} stars!`);
        setShowRating(false);
        setRating(0);
      } catch (err) {
        alert("Error submitting rating. Please try again.");
      }
    }
  };

  const handleUpvote = async () => {
    if (!hasVoted) {
      try {
        const newVotes = await upvoteComplaint(complaint.complaintID);
        setComplaint((prev) => ({ ...prev, votes: newVotes }));
        setHasVoted(true);
        alert("Thanks for your support! 👍");
      } catch (err) {
        alert("Error upvoting. Please try again.");
      }
    }
  };

  return (
    <div className="container-default px-4 py-8 bg-surface-soft">
      {error && (
        <div className="mb-6 rounded-[1.75rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_0.8fr]">
        <section className="surface-card rounded-[2rem] bg-white p-10 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)]">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-secondary">
                Complaint Tracker
              </p>
              <h1 className="mt-3 text-4xl font-poppins font-extrabold text-tertiary">
                {t("trackComplaint")} 🔍
              </h1>
            </div>
            <div className="badge-pill">Track Status</div>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="mb-8 rounded-[2rem] border border-tertiary bg-surface-soft p-6"
          >
            <div className="flex gap-3 flex-col lg:flex-row">
              <input
                type="text"
                value={complaintID}
                onChange={(e) => setComplaintID(e.target.value.toUpperCase())}
                placeholder={t("enterComplaintID")}
                className="flex-1 rounded-[1.75rem] border border-tertiary bg-white px-5 py-4 text-sm text-primary shadow-sm transition focus:border-tertiary focus:ring-[rgba(45,212,191,0.18)] focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full lg:w-auto primary-button disabled:opacity-50"
              >
                {loading ? "Searching..." : t("search")}
              </button>
            </div>
          </form>

          {complaint && (
            <div className="space-y-8">
              {/* Status Timeline */}
              <div className="rounded-[2rem] border border-tertiary bg-surface-soft p-8">
                <h2 className="mb-6 text-xl font-bold text-tertiary">
                  📊 Complaint Status
                </h2>
                <div className="flex items-center justify-between gap-4">
                  {statusLabels.map((label, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center flex-1 max-w-24"
                    >
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg transition shadow-lg ${
                          idx <= statusIndex ? "bg-tertiary" : "bg-surface-soft"
                        }`}
                      >
                        {idx <= statusIndex ? "✓" : idx + 1}
                      </div>
                      <p className="text-xs text-secondary mt-3 text-center leading-tight">
                        {label}
                      </p>
                      {idx < statusLabels.length - 1 && (
                        <div
                          className={`h-1 w-full mx-2 mt-4 rounded transition ${
                            idx < statusIndex
                              ? "bg-tertiary"
                              : "bg-surface-soft"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Complaint Details */}
              <div className="rounded-[2rem] border border-tertiary bg-white p-8">
                <h2 className="mb-6 text-xl font-bold text-tertiary">
                  {t("complaintDetails")}
                </h2>

                <div className="grid gap-6 md:grid-cols-2 mb-8">
                  <div className="rounded-[1.75rem] border border-tertiary bg-surface-soft p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                      {t("complaintID")}
                    </p>
                    <p className="mt-3 font-mono font-bold text-tertiary text-lg">
                      {complaint.complaintID}
                    </p>
                  </div>
                  <div className="rounded-[1.75rem] border border-tertiary bg-surface-soft p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                      {t("category")}
                    </p>
                    <p className="mt-3 font-bold text-primary">
                      {complaint.category}
                    </p>
                  </div>
                  <div className="rounded-[1.75rem] border border-tertiary bg-surface-soft p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                      {t("severity")}
                    </p>
                    <p className="mt-3 font-bold text-primary">
                      {complaint.severity}
                    </p>
                  </div>
                  <div className="rounded-[1.75rem] border border-tertiary bg-surface-soft p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                      {t("ward")}
                    </p>
                    <p className="mt-3 font-bold text-primary">
                      {complaint.ward}
                    </p>
                  </div>
                </div>

                {/* Photos */}
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                  {complaint.photoURL && (
                    <div className="rounded-[2rem] border border-tertiary bg-surface-soft p-6">
                      <p className="text-sm font-semibold text-tertiary mb-4">
                        📷 Original Photo
                      </p>
                      <img
                        src={complaint.photoURL}
                        alt="Complaint"
                        className="w-full rounded-[1.5rem] shadow-lg"
                      />
                    </div>
                  )}

                  {complaint.resolutionPhotoURL && (
                    <div className="rounded-[2rem] border border-tertiary bg-surface-soft p-6">
                      <p className="text-sm font-semibold text-tertiary mb-4">
                        ✅ Resolution Photo
                      </p>
                      <img
                        src={complaint.resolutionPhotoURL}
                        alt="Resolution"
                        className="w-full rounded-[1.5rem] shadow-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Map */}
                <div className="rounded-[2rem] border border-tertiary bg-surface-soft p-6 mb-8">
                  <p className="text-sm font-semibold text-tertiary mb-4">
                    {t("location")}
                  </p>
                  <div
                    id="trackerMap"
                    ref={mapRef}
                    className="h-72 rounded-[1.5rem] border border-tertiary shadow-sm"
                  />
                  {complaint.address && (
                    <div className="mt-4 rounded-3xl border border-tertiary bg-white p-4 text-sm text-primary">
                      📍 {complaint.address}
                    </div>
                  )}
                </div>

                {/* Description */}
                {complaint.description && (
                  <div className="rounded-[2rem] border border-tertiary bg-surface-soft p-6 mb-8">
                    <p className="text-sm font-semibold text-tertiary mb-3">
                      {t("description")}
                    </p>
                    <p className="text-primary leading-relaxed">
                      {complaint.description}
                    </p>
                  </div>
                )}

                {/* Timeline */}
                <div className="rounded-[2rem] border border-tertiary bg-surface-soft p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-3">
                    Timeline
                  </p>
                  <p className="text-sm text-primary">
                    <span className="font-semibold">{t("submittedAt")}:</span>{" "}
                    {complaint.createdAt?.toDate?.().toLocaleString() ||
                      new Date().toLocaleString()}
                  </p>
                  {complaint.updatedAt && (
                    <p className="text-sm text-primary mt-2">
                      <span className="font-semibold">Last Updated:</span>{" "}
                      {complaint.updatedAt?.toDate?.().toLocaleString() ||
                        new Date().toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Estimated Resolution */}
                <div className="mt-6 rounded-[1.75rem] border border-tertiary bg-surface-soft p-5">
                  <p className="text-sm font-semibold text-tertiary mb-2">
                    {t("expectedResolution")}
                  </p>
                  <p className="text-primary">
                    {complaint.severity === "High"
                      ? t("within24Hours")
                      : t("within48Hours")}
                  </p>
                </div>
              </div>

              {/* Rating Section */}
              {showRating && (
                <div className="rounded-[2rem] border border-tertiary bg-surface-soft p-8">
                  <h2 className="text-xl font-bold text-tertiary mb-6">
                    {t("rateIssueResolution")}
                  </h2>
                  <div className="flex gap-2 justify-center mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-4xl transition hover:scale-110 ${rating >= star ? "opacity-100" : "opacity-30"}`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <button
                      onClick={handleRating}
                      className="w-full primary-button"
                    >
                      {t("save")} Rating
                    </button>
                  )}
                </div>
              )}

              {/* Share Button */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/track?id=${complaint.complaintID}`;
                  navigator.clipboard.writeText(url);
                  alert("Share link copied to clipboard!");
                }}
                className="w-full primary-button"
              >
                {t("share")} 🔗
              </button>
            </div>
          )}

          {!complaint && !error && !loading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-secondary text-lg">
                Enter a complaint ID to track its status
              </p>
            </div>
          )}
        </section>

        <aside className="rounded-[2rem] bg-white p-8 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.12)] border border-tertiary">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">
            Community Support
          </p>
          <h2 className="mt-4 text-3xl font-bold text-tertiary">
            Help us prioritize
          </h2>
          <p className="mt-4 text-secondary leading-7">
            If this issue affects you too, show your support by upvoting.
            Popular complaints get faster attention from municipal teams.
          </p>

          {complaint && (
            <div className="mt-8 space-y-6">
              <div className="rounded-[1.75rem] bg-surface-soft p-6 text-center border border-tertiary">
                <p className="text-2xl mb-2">👍</p>
                <p className="font-semibold text-tertiary mb-2">
                  Community Votes
                </p>
                <p className="text-3xl font-bold text-tertiary mb-4">
                  {complaint.votes || 0}
                </p>
                <button
                  onClick={handleUpvote}
                  disabled={hasVoted}
                  className="w-full primary-button disabled:opacity-50"
                >
                  {hasVoted ? "Voted!" : t("thisAffectsMeToo")}
                </button>
              </div>

              <div className="rounded-[1.75rem] border border-tertiary bg-surface-soft p-5">
                <p className="font-semibold text-tertiary">Why Vote?</p>
                <p className="mt-2 text-sm text-secondary">
                  Higher votes signal urgency to municipal authorities and help
                  prioritize resolution.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-tertiary bg-surface-soft p-5">
                <p className="font-semibold text-tertiary">Track Progress</p>
                <p className="mt-2 text-sm text-secondary">
                  Get notified when your complaint status changes. Resolution
                  photos are uploaded when issues are fixed.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ComplaintTrackerPage;
