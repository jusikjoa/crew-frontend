'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 초기 테마 로드 (localStorage 또는 시스템 설정)
    const savedTheme = localStorage.getItem('theme');
    let shouldBeDark = false;
    
    if (savedTheme) {
      shouldBeDark = savedTheme === 'dark';
    } else {
      // 시스템 설정 확인
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // state 업데이트
    setIsDark(shouldBeDark);
    
    // DOM 즉시 업데이트 - html 요소에 직접 클래스 추가/제거
    const htmlElement = document.documentElement;
    if (shouldBeDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    
    setMounted(true);
    
    console.log('Initial theme loaded:', { 
      savedTheme, 
      shouldBeDark,
      hasDarkClass: htmlElement.classList.contains('dark'),
      htmlClasses: htmlElement.className
    });
  }, []);

  const toggleTheme = () => {
    // 현재 state를 기반으로 토글
    const newIsDark = !isDark;
    
    // state 업데이트
    setIsDark(newIsDark);
    
    // DOM 즉시 업데이트 - html 요소에 직접 클래스 추가/제거
    const htmlElement = document.documentElement;
    if (newIsDark) {
      htmlElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      htmlElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // 디버깅용 로그
    console.log('Theme toggled:', { 
      wasDark: isDark, 
      nowDark: newIsDark,
      hasDarkClass: htmlElement.classList.contains('dark'),
      htmlClasses: htmlElement.className,
      computedStyle: window.getComputedStyle(htmlElement).color
    });
  };

  // 클라이언트에서만 렌더링 (SSR 하이드레이션 불일치 방지)
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
