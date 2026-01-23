import { ReactNode, useState, useEffect, useRef } from 'react';
import Settings from './Settings';
import Timers from './Timers';

interface LayoutProps {
  children: ReactNode;
  onGoHome?: () => void;
  flowName?: string;
  onRenameFlow?: (name: string) => void;
}

export default function Layout({ children, onGoHome, flowName, onRenameFlow }: LayoutProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(flowName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(flowName || '');
  }, [flowName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== flowName && onRenameFlow) {
      onRenameFlow(editValue.trim());
    } else {
      setEditValue(flowName || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(flowName || '');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="bg-card border-b border-card-04 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 
            className={`text-xl font-semibold tracking-tight ${onGoHome ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={onGoHome}
          >
            Bailey
          </h1>
          {flowName && (
            <>
              <span className="text-foreground/20 text-xl">/</span>
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className="bg-card border border-accent rounded px-2 py-1 text-sm font-medium focus:outline-none min-w-[200px]"
                />
              ) : (
                <span 
                  className="text-sm font-medium hover:bg-card-02 px-2 py-1 rounded cursor-text transition-colors"
                  onClick={() => setIsEditing(true)}
                  title="Click to rename"
                >
                  {flowName}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {flowName && <Timers />}
          {flowName && <Settings />}
        </div>
      </header>
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}

