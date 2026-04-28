import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { getComplaints } from "../utils/firebaseUtils";
import {
  loadGoogleMapsScript,
  initializeMap,
  createHeatmapLayer,
  getMarkerIcon,
  addMarker,
} from "../utils/googleMaps";
import { INDORE_CENTER } from "../constants/translations";

const PublicHeatmapPage = () => {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState("7"); // days
  const [heatmapLayer, setHeatmapLayer] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Load complaints
  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await getComplaints({ limit: 500 });

        // Filter by date range
        const now = new Date();
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

        const filtered = data.filter((c) => {
          const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt);
          return createdAt >= daysAgo;
        });

        setComplaints(filtered);
      } catch (err) {
        console.error("Error loading complaints:", err);
      }
      setLoading(false);
    };

    loadComplaints();
  }, [dateRange]);

  // Initialize map and heatmap
  useEffect(() => {
    const initMapAndHeatmap = async () => {
      try {
        await loadGoogleMapsScript();

        if (mapRef.current && !mapInstanceRef.current) {
          mapInstanceRef.current = initializeMap(
            "heatmapContainer",
            INDORE_CENTER,
            12,
          );
        }

        // Filter complaints
        let filteredComplaints = complaints;
        if (selectedCategory !== "all") {
          filteredComplaints = complaints.filter(
            (c) => c.category === selectedCategory,
          );
        }

        // Prepare heatmap data
        const heatmapData = filteredComplaints.map((c) => ({
          lat: c.latitude,
          lng: c.longitude,
          weight: c.severity === "High" ? 3 : c.severity === "Medium" ? 2 : 1,
        }));

        // Remove old heatmap layer if exists
        if (heatmapLayer) {
          heatmapLayer.setMap(null);
        }

        // Create new heatmap
        if (heatmapData.length > 0 && mapInstanceRef.current) {
          const newHeatmap = createHeatmapLayer(
            mapInstanceRef.current,
            heatmapData,
          );
          setHeatmapLayer(newHeatmap);
        }

        // Add markers for hot issues (5+ votes)
        const hotIssues = filteredComplaints.filter((c) => c.votes >= 5);
        hotIssues.forEach((complaint) => {
          addMarker(
            mapInstanceRef.current,
            complaint.latitude,
            complaint.longitude,
            complaint.complaintID,
            "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
            `<div class="p-3 bg-white rounded-lg shadow-lg border">
              <p class="font-bold text-slate-900">${complaint.complaintID} 🔥</p>
              <p class="text-slate-600">${complaint.category}</p>
              <p class="text-xs text-slate-500">👍 ${complaint.votes} votes</p>
            </div>`,
          );
        });
      } catch (err) {
        console.error("Map initialization error:", err);
      }
    };

    if (!loading && complaints.length > 0) {
      initMapAndHeatmap();
    }
  }, [complaints, selectedCategory, loading, heatmapLayer]);

  // Get top issues
  const topIssues = complaints
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, 3);

  const categories = [
    "all",
    "Road Damage",
    "Water Supply",
    "Electricity",
    "Drainage",
    "Garbage",
    "Other",
  ];

  // Calculate stats
  const totalComplaints = complaints.length;
  const mostCommonCategory =
    complaints.length > 0
      ? Object.entries(
          complaints.reduce((acc, c) => {
            acc[c.category] = (acc[c.category] || 0) + 1;
            return acc;
          }, {}),
        ).sort(([, a], [, b]) => b - a)[0]?.[0]
      : "-";

  return (
    <div className="bg-surface-soft">
      <div className="container-default px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.32em] text-secondary">
            Public Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-poppins font-extrabold text-tertiary">
            {t("heatmap")} 🗺️
          </h1>
          <p className="mt-4 text-secondary leading-relaxed">
            {t("poweredBy")}
          </p>
        </div>

        {/* Filters */}
        <div className="surface-card rounded-[2rem] bg-white p-8 mb-10 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)]">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block font-bold text-tertiary mb-3">
                Category Filter
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-[1.75rem] border border-tertiary bg-surface-soft px-5 py-4 text-sm text-primary shadow-sm transition focus:border-tertiary focus:ring-[rgba(45,212,191,0.18)] focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-tertiary mb-3">
                Time Period
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full rounded-[1.75rem] border border-tertiary bg-surface-soft px-5 py-4 text-sm text-primary shadow-sm transition focus:border-tertiary focus:ring-[rgba(45,212,191,0.18)] focus:outline-none"
              >
                <option value="7">{t("last7Days")}</option>
                <option value="30">{t("last30Days")}</option>
                <option value="365">{t("allTime")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.45fr] items-start">
          {/* Map */}
          <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-tertiary mb-2">
                Interactive Heatmap
              </h2>
              <p className="text-sm text-secondary">
                Visual representation of complaint density and severity
              </p>
            </div>

            {loading ? (
              <div className="w-full h-96 bg-surface-soft rounded-[1.5rem] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-tertiary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-lg font-bold text-tertiary">
                    {t("loading")}
                  </p>
                </div>
              </div>
            ) : (
              <div
                id="heatmapContainer"
                ref={mapRef}
                className="w-full h-96 rounded-[1.5rem] border border-tertiary shadow-sm"
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Top Issues */}
            <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-3xl">🏆</div>
                <div>
                  <h2 className="text-xl font-bold text-tertiary">
                    {t("topIssues")}
                  </h2>
                  <p className="text-sm text-secondary">
                    Most upvoted complaints
                  </p>
                </div>
              </div>

              {topIssues.length > 0 ? (
                <div className="space-y-4">
                  {topIssues.map((issue, idx) => (
                    <div
                      key={issue.documentID}
                      className="rounded-[1.5rem] border border-tertiary bg-surface-soft p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="font-mono font-bold text-tertiary text-sm">
                          {issue.complaintID}
                        </span>
                        {issue.votes >= 5 && (
                          <span className="text-xl">🔥</span>
                        )}
                      </div>
                      <p className="text-slate-900 font-medium mb-2">
                        {issue.category}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                        <span>👍</span>
                        <span className="font-bold">{issue.votes || 0}</span>
                        <span>votes</span>
                      </div>
                      <button
                        onClick={() =>
                          (window.location.href = `/track?id=${issue.complaintID}`)
                        }
                        className="w-full primary-button text-xs"
                      >
                        View Details →
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-slate-500">{t("noData")}</p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-3xl">📊</div>
                <div>
                  <h2 className="text-xl font-bold text-tertiary">Legend</h2>
                  <p className="text-sm text-secondary">
                    Understanding the map
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm text-slate-700">
                    High severity (weight: 3)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-slate-700">
                    Medium severity (weight: 2)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm text-slate-700">
                    Low severity (weight: 1)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600"></div>
                  <span className="text-sm text-slate-700">
                    Hot issue (5+ votes)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] text-center border-l-4 border-tertiary">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-2">
              Total Complaints
            </p>
            <p className="text-4xl font-bold text-tertiary">
              {totalComplaints}
            </p>
          </div>

          <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] text-center border-l-4 border-tertiary">
            <div className="text-4xl mb-4">🏷️</div>
            <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-2">
              Most Common Category
            </p>
            <p className="text-xl font-bold text-tertiary">
              {mostCommonCategory}
            </p>
          </div>

          <div className="surface-card rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.2)] text-center border-l-4 border-tertiary">
            <div className="text-4xl mb-4">🔥</div>
            <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-2">
              Most Upvoted Issue
            </p>
            <p className="text-xl font-bold text-tertiary">
              {topIssues[0]?.complaintID || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicHeatmapPage;
