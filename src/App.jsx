import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import AppHome from './components/AppHome'
import PerfilPage from './components/PerfilPage'
import ConfigMenuPage from './components/ConfigMenuPage'
import MenuGeneradoPage from './components/MenuGeneradoPage'
import ProtectedRoute from './components/ProtectedRoute'
import RutaGestor from './components/RutaGestor'
import GestorRecetasPage from './components/GestorRecetasPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <PerfilPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <ConfigMenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menus/:id"
          element={
            <ProtectedRoute>
              <MenuGeneradoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestor"
          element={
            <RutaGestor>
              <GestorRecetasPage />
            </RutaGestor>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
