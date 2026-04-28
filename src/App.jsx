import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from "./components/Layout";
import SubmitComplaintPage from "./pages/SubmitComplaintPage";
import ComplaintTrackerPage from "./pages/ComplaintTrackerPage";
import AdminDashboard from "./pages/AdminDashboard";
import PublicHeatmapPage from "./pages/PublicHeatmapPage";
import { seedInitialData } from "./utils/seedData";
import "./index.css";

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><SubmitComplaintPage /></PageTransition>} />
        <Route path="/track" element={<PageTransition><ComplaintTrackerPage /></PageTransition>} />
        <Route path="/complaint/:id" element={<PageTransition><ComplaintTrackerPage /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/map" element={<PageTransition><PublicHeatmapPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
};

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

function App() {
  useEffect(() => {
    // Seed initial data if not already done
    const hasSeed = localStorage.getItem("nagarseva_seeded");
    if (!hasSeed) {
      seedInitialData();
      localStorage.setItem("nagarseva_seeded", "true");
    }
  }, []);

  return (
    <Router>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </Router>
  );
}

export default App;
