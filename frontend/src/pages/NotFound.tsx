import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#FEF3C7] px-4">
      <div className="text-center bg-white border border-gray-200 border-b-[3px] border-b-[#EAB308] p-8 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h1 className="text-6xl font-extrabold mb-4 text-[#DC2626]">404</h1>
        <p className="text-xl text-[#111827] font-semibold mb-3">Page not found</p>
        <p className="text-[#6B7280] mb-8">The page you're looking for doesn't exist.</p>
        <Link 
          to="/" 
          className="inline-block bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold py-3 px-6 rounded-lg shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition-all duration-200"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
