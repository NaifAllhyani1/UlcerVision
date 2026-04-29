import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-medical-700 font-semibold text-lg">
              <span className="text-2xl">🩺</span>
              DFU Management
            </Link>
            <Link
              to="/"
              className="text-slate-600 hover:text-medical-600 transition"
            >
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="text-slate-600 hover:text-medical-600 transition"
              >
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-600 hover:text-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
