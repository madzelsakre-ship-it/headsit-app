import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Package, ShoppingCart, Radio, BarChart2, LogOut } from 'lucide-react'
const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/produits', icon: Package, label: 'Produits' },
  { to: '/commandes', icon: ShoppingCart, label: 'Commandes' },
  { to: '/live', icon: Radio, label: 'Live' },
  { to: '/rapports', icon: BarChart2, label: 'Rapports' },
]
export default function Layout() {
  const { boutique, logout } = useAuth()
  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <aside style={{ width:220, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'20px 0', position:'fixed', top:0, left:0, bottom:0, zIndex:100 }}>
        <div style={{ padding:'0 20px 20px', borderBottom:'1px solid var(--border)', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:600, fontSize:16 }}>H</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Headsit</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>{boutique?.nom || 'Ma boutique'}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'0 10px' }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to==='/'}
              style={({ isActive }) => ({ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, marginBottom:2, color: isActive ? 'var(--accent)' : 'var(--muted)', background: isActive ? 'var(--accent-light)' : 'transparent', fontWeight: isActive ? 500 : 400, transition:'all .15s', textDecoration:'none' })}>
              <Icon size={18}/><span style={{ fontSize:13 }}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border)' }}>
          <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, width:'100%', background:'none', border:'none', color:'var(--muted)', fontSize:13, cursor:'pointer' }}>
            <LogOut size={18}/> Déconnexion
          </button>
        </div>
      </aside>
      <main style={{ marginLeft:220, flex:1, minHeight:'100vh' }}><Outlet/></main>
    </div>
  )
}
