import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'light' | 'dark' | 'gold' | 'executive' | 'classic' | 'vibrant' | 'sky-glass';
export type SidebarStyle = 'modern-list' | 'colored-cards' | 'compact';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  sidebarStyle: SidebarStyle;
  setSidebarStyle: (style: SidebarStyle) => void;
  isDark: boolean;
  isGold: boolean;
  toggleDarkMode: () => void;
}

const THEME_STORAGE_KEY = 'cement_erp_theme_mode';
const SIDEBAR_STORAGE_KEY = 'cement_erp_sidebar_style';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    if (
      saved === 'light' ||
      saved === 'dark' ||
      saved === 'gold' ||
      saved === 'executive' ||
      saved === 'classic' ||
      saved === 'vibrant' ||
      saved === 'sky-glass'
    ) {
      return saved;
    }
    return 'light';
  });

  const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyle>(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved === 'modern-list' || saved === 'colored-cards' || saved === 'compact') {
      return saved;
    }
    return 'modern-list';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const setSidebarStyle = (newStyle: SidebarStyle) => {
    setSidebarStyleState(newStyle);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, newStyle);
  };

  const isDark = theme === 'dark' || theme === 'gold' || theme === 'executive';
  const isGold = theme === 'gold';

  const toggleDarkMode = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('sky-glass');
    } else if (theme === 'sky-glass') {
      setTheme('gold');
    } else {
      setTheme('dark');
    }
  };

  useEffect(() => {
    const body = document.body;
    const docEl = document.documentElement;

    // Clean previous theme classes
    body.classList.remove(
      'theme-light',
      'theme-dark',
      'theme-gold',
      'theme-executive',
      'theme-classic',
      'theme-vibrant',
      'theme-sky-glass',
      'dark',
      'gold',
      'sidebar-mode-list',
      'sidebar-mode-cards',
      'sidebar-mode-compact'
    );
    docEl.classList.remove('dark', 'gold', 'theme-sky-glass');

    // Add current theme classes
    body.classList.add(`theme-${theme}`);
    body.setAttribute('data-theme', theme);
    docEl.setAttribute('data-theme', theme);
    body.setAttribute('data-sidebar-style', sidebarStyle);
    docEl.setAttribute('data-sidebar-style', sidebarStyle);

    if (theme === 'dark') {
      body.classList.add('dark');
      docEl.classList.add('dark');
    } else if (theme === 'gold') {
      body.classList.add('dark', 'gold');
      docEl.classList.add('dark', 'gold');
    } else if (theme === 'executive') {
      body.classList.add('dark');
      docEl.classList.add('dark');
    } else if (theme === 'sky-glass') {
      body.classList.add('theme-sky-glass');
      docEl.classList.add('theme-sky-glass');
    }

    // Add sidebar style class
    if (sidebarStyle === 'modern-list') {
      body.classList.add('sidebar-mode-list');
    } else if (sidebarStyle === 'colored-cards') {
      body.classList.add('sidebar-mode-cards');
    } else if (sidebarStyle === 'compact') {
      body.classList.add('sidebar-mode-compact');
    }
  }, [theme, sidebarStyle]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        sidebarStyle,
        setSidebarStyle,
        isDark,
        isGold,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
