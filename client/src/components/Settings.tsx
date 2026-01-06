import { useState, useEffect } from 'react';

const FONT_SIZE_KEY = 'bailey-font-size';
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 24;
const COLUMN_COLORS_KEY = 'bailey-column-colors';
const DEFAULT_COLUMN_COLORS = true;

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [columnColors, setColumnColors] = useState(DEFAULT_COLUMN_COLORS);

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved) {
      const size = parseInt(saved, 10);
      if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
        setFontSize(size);
        document.documentElement.style.setProperty('--cell-font-size', `${size}px`);
      }
    } else {
      document.documentElement.style.setProperty('--cell-font-size', `${DEFAULT_FONT_SIZE}px`);
    }

    const savedColors = localStorage.getItem(COLUMN_COLORS_KEY);
    if (savedColors !== null) {
      const enabled = savedColors === 'true';
      setColumnColors(enabled);
      document.documentElement.style.setProperty('--column-colors-enabled', enabled ? '1' : '0');
    } else {
      document.documentElement.style.setProperty('--column-colors-enabled', DEFAULT_COLUMN_COLORS ? '1' : '0');
    }
  }, []);

  const handleFontSizeChange = (size: number) => {
    const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
    setFontSize(clampedSize);
    localStorage.setItem(FONT_SIZE_KEY, clampedSize.toString());
    document.documentElement.style.setProperty('--cell-font-size', `${clampedSize}px`);
  };

  const handleColumnColorsChange = (enabled: boolean) => {
    setColumnColors(enabled);
    localStorage.setItem(COLUMN_COLORS_KEY, enabled.toString());
    document.documentElement.style.setProperty('--column-colors-enabled', enabled ? '1' : '0');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded hover:bg-card-02 transition-colors"
        title="Settings"
        aria-label="Open settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 min-w-[320px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-card-02 transition-colors"
                aria-label="Close settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Font Size: {fontSize}px
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    value={fontSize}
                    onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFontSizeChange(fontSize - 1)}
                      disabled={fontSize <= MIN_FONT_SIZE}
                      className="px-3 py-1 bg-card-02 rounded hover:bg-card-03 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      aria-label="Decrease font size"
                    >
                      −
                    </button>
                    <button
                      onClick={() => handleFontSizeChange(DEFAULT_FONT_SIZE)}
                      className="px-3 py-1 bg-card-02 rounded hover:bg-card-03 transition-colors text-sm"
                      aria-label="Reset font size"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => handleFontSizeChange(fontSize + 1)}
                      disabled={fontSize >= MAX_FONT_SIZE}
                      className="px-3 py-1 bg-card-02 rounded hover:bg-card-03 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      aria-label="Increase font size"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnColors}
                    onChange={(e) => handleColumnColorsChange(e.target.checked)}
                    className="w-4 h-4 rounded border-card-04 text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  <span className="text-sm font-medium">
                    Color code columns (blue for aff, red for neg)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

