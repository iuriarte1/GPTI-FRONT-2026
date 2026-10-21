import React from 'react';

export default function Navbar() {
    return (
        <nav className="flex justify-between items-center py-5 px-8 max-w-7xl mx-auto border-b border-blue-100 w-full">
            <div className="text-2xl font-extrabold text-blue-700 tracking-tighter flex items-center gap-2">
                <span className="text-yellow-400 text-3xl">❇️</span>
                NutriCart <span className="text-gray-400 font-medium text-lg ml-1"></span>
            </div>
            <div className="hidden sm:flex space-x-6 items-center">
                <button className="text-gray-600 font-semibold hover:text-blue-700 transition">
                    Crear Sesión
                </button>
                <button className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 hover:shadow-lg transition-all duration-200">
                    Iniciar Sesión
                </button>
            </div>
        </nav>
    );
}