import React from 'react';
import { motion } from 'framer-motion';

interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, selectedValue, onChange }) => {
  return (
    <div className="flex w-full rounded-full border border-slate-300 overflow-hidden bg-white h-12 relative">
      {options.map((option, index) => {
        const isActive = selectedValue === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              relative flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors z-10
              ${index !== options.length - 1 ? 'border-r border-slate-200' : ''}
              ${isActive ? 'text-[#F2FCFF]' : 'text-slate-600 hover:bg-slate-50'}
            `}
          >
            {/* Active Background Animation */}
            {isActive && (
              <motion.div
                layoutId="activeSegment"
                className="absolute inset-0 bg-[#01323F]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            {/* Content (Z-Index to sit above background) */}
            <span className="relative z-20 flex items-center gap-2">
                {option.icon}
                {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;