import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { esGestor } from '../constants/roles';

// Solo deja pasar a gestores y administradores. Sin sesión va al login; un consumidor vuelve a su panel.
export default function RutaGestor({ children }) {
    const { token, user } = useAuth();

    if (!token) return <Navigate to="/login" replace />;
    if (!esGestor(user)) return <Navigate to="/app" replace />;

    return children;
}
