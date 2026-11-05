import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, LogOut, Shield, DollarSign } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const roleBadgeColor = {
    Admin: 'bg-red-100 text-red-800 border-red-200',
    Caixa: 'bg-amber-100 text-amber-800 border-amber-200',
    Garcom: 'bg-blue-100 text-blue-800 border-blue-200',
  }[user.role];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dailies" className="flex items-center space-x-3">
              <span className="text-2xl">🍔</span>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                Burger House <span className="text-amber-600 font-semibold text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Tools</span>
              </span>
            </Link>

            <nav className="flex space-x-2">
              <Link
                to="/dailies"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dailies')
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Escala & Diárias
              </Link>

              <Link
                to="/users"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/users')
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Funcionários
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-sm">
              <div className="text-right hidden sm:block">
                <div className="font-medium text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">@{user.preferred_username}</div>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeColor}`}
              >
                {isAdmin ? <Shield className="w-3 h-3 mr-1" /> : <DollarSign className="w-3 h-3 mr-0.5" />}
                {user.role}
              </span>
            </div>

            <button
              onClick={logout}
              title="Sair"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
