import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from '/favicon.ico';
import { LayoutDashboard, Users, Wallet, Filter, Settings, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Clientes", icon: Users, path: "/contacts" },
  { title: "Cashback", icon: Wallet, path: "/cashback" },
  { title: "Marketing SAT", icon: Filter, path: "/sat-audience" },
  { title: "Configurações", icon: Settings, path: "/settings" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (window.innerWidth < 768) setCollapsed(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      navigate("/login");
    }
  };

  return (
    <aside className={`sticky top-0 flex h-screen flex-shrink-0 flex-col glass-sidebar text-white/85 transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
      <div className={`flex h-14 items-center gap-2 border-b border-white/10 ${collapsed ? "justify-center" : "px-4"}`}>
        <img src={logo} alt="" className="h-8 w-8 flex-shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
        {!collapsed && (
          <span className="text-base font-light tracking-tight text-white">
            <span className="font-bold text-emerald-300">ZAP</span> Cashback
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto py-3">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.title : undefined}
              aria-label={item.title}
              aria-current={isActive ? "page" : undefined}
              className={`relative mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${collapsed ? "justify-center" : ""} ${isActive
                ? "bg-white/15 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-white/15 backdrop-blur-md before:absolute before:-left-2 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-emerald-300"
                : "hover:bg-white/10 hover:text-white"}`}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        {!collapsed && user?.email && <p className="truncate px-3 pb-2 pt-1 text-xs text-white/55" title={user.email}>{user.email}</p>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : ""}`}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <><PanelLeftClose className="h-[18px] w-[18px]" /><span>Recolher</span></>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : ""}`}
          aria-label="Sair"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
