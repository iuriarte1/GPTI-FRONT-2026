import { createContext, useContext, useState } from 'react';
import * as authApi from '../api/auth';

const STORAGE_KEY = 'nutricart_session';

const AuthContext = createContext(null);

function leerSesion() {
    try {
        const guardada = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (guardada?.token && guardada?.user) return guardada;
    } catch {
        // Sesión corrupta o localStorage no disponible: se parte sin sesión.
    }
    return { token: null, user: null };
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(leerSesion);

    async function login(email, password) {
        const { access_token, user } = await authApi.login(email, password);
        const nueva = { token: access_token, user };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
        } catch {
            // Si no se puede guardar, la sesión dura solo mientras la pestaña esté abierta.
        }
        setSession(nueva);
        return user;
    }

    function logout() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Nada que limpiar.
        }
        setSession({ token: null, user: null });
    }

    function updateUser(parcial) {
        setSession((actual) => {
            if (!actual.user) return actual;
            const nueva = { ...actual, user: { ...actual.user, ...parcial } };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
            } catch {
                // Si no se puede guardar, el cambio dura solo mientras la pestaña esté abierta.
            }
            return nueva;
        });
    }

    return (
        <AuthContext.Provider value={{ user: session.user, token: session.token, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return context;
}
