import { useState, useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAiTutorAccess } from "@/hooks/useAiTutorAccess";
import { AiTutorPopup } from "./AiTutorPopup";

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = "ai-tutor-button-position";

export function AiTutorButton() {
  const { aiTutorEnabled } = useAppSettings();
  const { hasAccess } = useAiTutorAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  // Initialize position - top right corner
  useEffect(() => {
    const initPosition = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const savedPosition = JSON.parse(saved);
          setPosition(savedPosition);
        } catch {
          // Invalid saved position, use default (top right)
          const defaultX = window.innerWidth - 100;
          const defaultY = 80;
          setPosition({ x: defaultX, y: defaultY });
        }
      } else {
        // Default position: top right
        const defaultX = window.innerWidth - 100;
        const defaultY = 80;
        setPosition({ x: defaultX, y: defaultY });
      }
    };

    initPosition();
    
    // Update position on window resize
    const handleResize = () => {
      setPosition(prev => {
        const buttonWidth = 56;
        const buttonHeight = 56;
        let newX = prev.x;
        let newY = prev.y;
        
        // Keep within bounds
        newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight));
        
        return { x: newX, y: newY };
      });
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Save position when it changes
  useEffect(() => {
    if (position.x > 0 || position.y > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    if (aiTutorEnabled && hasAccess) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
      setIsOpen(false);
    }
  }, [aiTutorEnabled, hasAccess]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    
    draggedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      draggedRef.current = true;
      const buttonWidth = 56;
      const buttonHeight = 56;
      
      let newX = e.clientX - dragStartRef.current.x;
      let newY = e.clientY - dragStartRef.current.y;

      // Keep button within viewport bounds
      newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only toggle if not dragged
    if (!draggedRef.current) {
      setIsOpen(!isOpen);
    }
    // Reset drag flag after a short delay
    setTimeout(() => {
      draggedRef.current = false;
    }, 100);
  };

  if (!shouldRender) return null;

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-40 select-none"
        size="icon"
        aria-label="Tutor IA"
      >
        <Bot className="h-6 w-6" />
      </Button>

      <AiTutorPopup 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        buttonPosition={position}
      />
    </>
  );
}
