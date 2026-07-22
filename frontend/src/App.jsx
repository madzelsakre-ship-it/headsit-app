import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Produits from './pages/Produits'
import Commandes from './pages/Commandes'
import Live from './pages/Live'
import Rapports from './pages/Rapports'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding:40, color:'var(--muted)' }}>Chargement...</div>
  return user ? children : <Navigate to="/login" replace/>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="/" element={<PrivateRoute><Layout/></PrivateRoute>}>
            <Route index element={<Dashboard/>}/>
            <Route path="produits" element={<Produits/>}/>
            <Route path="commandes" element={<Commandes/>}/>
            <Route path="live" element={<Live/>}/>
            <Route path="rapports" element={<Rapports/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
