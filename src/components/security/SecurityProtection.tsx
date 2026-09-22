import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface SecurityProtectionProps {
  session?: any;
}

export default function SecurityProtection({ session }: SecurityProtectionProps) {
  const [isObscured, setIsObscured] = useState(false);

  useEffect(() => {
    // 1. Disable Right Click (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Common Screenshot & Developer Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Print Screen Key
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText(''); // Attempt to clear clipboard
        setIsObscured(true);
        setTimeout(() => setIsObscured(false), 2000);
      }
      
      const key = e.key.toLowerCase();

      // Mac Screenshot shortcuts (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5)
      // Windows Snipping Tool (Win+Shift+S)
      if (
        (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5')) ||
        (e.metaKey && e.shiftKey && key === 's')
      ) {
        setIsObscured(true);
        // keep obscured longer for snipping tools
        setTimeout(() => setIsObscured(false), 3500);
      }

      // DevTools & Copy shortcuts (F12, Ctrl+Shift+I, Ctrl+C, etc)
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'c' || key === 'j')) ||
        (e.metaKey && e.altKey && (key === 'i' || key === 'c' || key === 'j')) ||
        (e.ctrlKey && (key === 'u' || key === 's' || key === 'p' || key === 'c' || key === 'x')) ||
        (e.metaKey && (key === 'u' || key === 's' || key === 'p' || key === 'c' || key === 'x'))
      ) {
        e.preventDefault();
      }
    };

    // 3. Obscure screen when window loses focus (Stops OS Snipping Tools)
    const handleBlur = () => setIsObscured(true);
    const handleFocus = () => setIsObscured(false);
    
    // Aggressively check visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsObscured(true);
      }
    };

    // If mouse leaves the HTML document completely (e.g. going up to browser extensions or OS menus)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        setIsObscured(true);
      }
    };
    
    // Un-obscure on mouse enter if it was just a mouse out
    const handleMouseEnter = () => {
      if (document.hasFocus() && !document.hidden) {
        setIsObscured(false);
      }
    };
    
    // 4. Prevent drag and drop
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  if (!isObscured) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center text-center p-8 backdrop-blur-3xl">
      <ShieldAlert className="w-24 h-24 mb-6 text-red-500 animate-pulse" />
      <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-4 text-white tracking-tight">
        Security Protection Active
      </h1>
      <p className="text-lg text-slate-300 max-w-lg font-mono">
        Screen capturing, background execution, and copying are restricted on this platform to protect copyrighted materials. 
        <br/><br/>
        Please return focus to this window to continue reading.
      </p>
      
      {session?.user?.email && (
        <div className="mt-8 px-4 py-2 bg-slate-900 border border-slate-800 rounded-full font-mono text-xs text-slate-500">
          Session tracked: {session.user.email}
        </div>
      )}
    </div>
  );
}
