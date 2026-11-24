import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Devuelve manejarError(error): si el backend respondió 401 (token vencido o inválido),
// cierra la sesión, vuelve al login y devuelve true. Si no, devuelve false.
export function useSesionVencida() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return useCallback(
        (error) => {
            if (error?.status !== 401) return false;
            logout();
            navigate('/login', { replace: true });
            return true;
        },
        [logout, navigate],
    );
}
