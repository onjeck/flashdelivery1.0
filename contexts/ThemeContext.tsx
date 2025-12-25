
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'cartoon' | 'corporate' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

// Definição das Variáveis CSS para cada tema
const themes: Record<ThemeType, React.CSSProperties> = {
  cartoon: {
    '--color-primary': '#FFCE54',   // Amarelo
    '--color-secondary': '#4FC1E9', // Azul Claro
    '--color-accent': '#A0D468',    // Verde
    '--color-danger': '#ED5565',    // Vermelho
    '--color-bg': '#F0F4F8',        // Fundo Claro
    '--color-surface': '#FFFFFF',   // Fundo de Cards
    '--color-text': '#000000',      // Texto Principal
    '--color-text-inv': '#FFFFFF',  // Texto Invertido
    '--color-border': '#000000',    // Cor da Borda
    '--border-width': '2px',        // Espessura Borda (geral)
    '--border-width-lg': '4px',     // Espessura Borda (destaque)
    '--radius-sm': '0.5rem',
    '--radius-md': '0.75rem',
    '--radius-lg': '1rem',
    '--radius-xl': '1.5rem',
    '--shadow-custom': '4px 4px 0px 0px var(--color-border)',
    '--font-display': '"Titan One", cursive',
    '--font-body': '"Nunito", sans-serif',
  } as any,
  corporate: {
    '--color-primary': '#2563EB',   // Royal Blue
    '--color-secondary': '#64748B', // Slate
    '--color-accent': '#10B981',    // Emerald
    '--color-danger': '#EF4444',    // Red
    '--color-bg': '#F1F5F9',        // Slate 100
    '--color-surface': '#FFFFFF',   // White
    '--color-text': '#1E293B',      // Slate 800
    '--color-text-inv': '#FFFFFF',
    '--color-border': '#CBD5E1',    // Slate 300
    '--border-width': '1px',
    '--border-width-lg': '1px',
    '--radius-sm': '0.25rem',
    '--radius-md': '0.375rem',
    '--radius-lg': '0.5rem',
    '--radius-xl': '0.75rem',
    '--shadow-custom': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '--font-display': '"Inter", sans-serif',
    '--font-body': '"Inter", sans-serif',
  } as any,
  dark: {
    '--color-primary': '#F59E0B',   // Amber
    '--color-secondary': '#3B82F6', // Blue
    '--color-accent': '#34D399',    // Emerald
    '--color-danger': '#F87171',    // Red
    '--color-bg': '#111827',        // Gray 900
    '--color-surface': '#1F2937',   // Gray 800
    '--color-text': '#F3F4F6',      // Gray 100
    '--color-text-inv': '#111827',
    '--color-border': '#374151',    // Gray 700
    '--border-width': '1px',
    '--border-width-lg': '1px',
    '--radius-sm': '0.25rem',
    '--radius-md': '0.5rem',
    '--radius-lg': '0.75rem',
    '--radius-xl': '1rem',
    '--shadow-custom': '0 4px 6px -1px rgb(0 0 0 / 0.5)',
    '--font-display': '"Inter", sans-serif',
    '--font-body': '"Inter", sans-serif',
  } as any
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('cartoon');

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as ThemeType | null;
    if (saved && Object.keys(themes).includes(saved)) {
      setTheme(saved);
    }
  }, []);

  // Save theme to localStorage and apply styles whenever theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    const themeVars = themes[theme];
    
    // Inject variables into :root
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
