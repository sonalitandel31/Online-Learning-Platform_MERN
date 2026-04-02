import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {

    const savedColor = localStorage.getItem("themeColor") || '#6f42c1';
    const savedLogo = localStorage.getItem("themeLogo") || null;

    const [primaryColor, setPrimaryColor] = useState(savedColor);
    const [logoUrl, setLogoUrl] = useState(savedLogo);

    useEffect(() => {
        document.documentElement.style.setProperty('--bs-primary', primaryColor);
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        localStorage.setItem("themeColor", primaryColor);
        if(logoUrl) localStorage.setItem("themeLogo", logoUrl);
    }, [primaryColor, logoUrl]);

    return (
        <ThemeContext.Provider value={{ primaryColor, setPrimaryColor, logoUrl, setLogoUrl }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);