import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const CollapsibleCard = ({ 
  title, 
  children, 
  isExpanded: controlledExpanded, 
  onToggle,
  className = "",
  titleClassName = "",
  contentClassName = "",
  theme
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const handleToggle = onToggle || (() => setInternalExpanded(!internalExpanded));

  return (
    <div className={`${theme.card} ${theme.border} ${theme.ring} rounded-lg shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className={`${theme.header} ${theme.hover} cursor-pointer transition-colors flex items-center justify-between px-4 py-3 ${titleClassName}`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-600 rounded-sm"></div>
          </div>
          <span className="font-medium text-sm sm:text-base">{title}</span>
        </div>
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className={`${theme.background} border-t ${theme.border} ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard;
