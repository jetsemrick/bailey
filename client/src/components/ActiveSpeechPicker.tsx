import { SPEECH_COLUMNS, type SpeechColumn } from '../db/types';

interface ActiveSpeechPickerProps {
  activeSpeech: SpeechColumn;
  onChange: (speech: SpeechColumn) => void;
}

export default function ActiveSpeechPicker({ activeSpeech, onChange }: ActiveSpeechPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-foreground/50">Active Speech</span>
      <div
        className="flex shrink-0 overflow-hidden rounded border border-card-04 text-[10px]"
        role="group"
        aria-label="Choose active speech column"
      >
        {SPEECH_COLUMNS.map((speech, index) => (
          <button
            key={speech}
            type="button"
            aria-pressed={activeSpeech === speech}
            onClick={() => onChange(speech)}
            className={`px-1.5 py-0.5 font-medium transition-colors ${
              index === 0 ? '' : 'border-l border-card-04'
            } ${
              activeSpeech === speech
                ? 'bg-accent/15 text-accent'
                : 'bg-card-02 text-foreground/60 hover:bg-card-03 hover:text-foreground'
            }`}
          >
            {speech}
          </button>
        ))}
      </div>
    </div>
  );
}
