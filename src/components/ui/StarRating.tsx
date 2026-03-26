'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInteractiveProps {
  value: number;
  onChange: (rating: number) => void;
  readOnly?: false;
}

interface StarRatingReadOnlyProps {
  value: number;
  readOnly: true;
  count?: number;
  onChange?: never;
}

type StarRatingProps = StarRatingInteractiveProps | StarRatingReadOnlyProps;

export default function StarRating(props: StarRatingProps) {
  const { value, readOnly } = props;
  const [hovered, setHovered] = useState<number>(0);

  const displayValue = readOnly ? value : hovered || value;

  const handleClick = (star: number) => {
    if (!readOnly && props.onChange) {
      props.onChange(star);
    }
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayValue >= star;
        const halfFilled = !filled && readOnly && displayValue >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={`relative p-0.5 ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            {/* Background (empty) star */}
            <Star className="h-5 w-5 text-gray-300" />

            {/* Filled overlay */}
            {(filled || halfFilled) && (
              <span
                className="absolute inset-0.5 overflow-hidden"
                style={{ width: halfFilled ? '50%' : '100%' }}
              >
                <Star className="h-5 w-5 fill-warning text-warning" />
              </span>
            )}
          </button>
        );
      })}

      {readOnly && props.count !== undefined && (
        <span className="ml-1.5 text-sm text-text-secondary">
          {value.toFixed(1)} ({props.count})
        </span>
      )}
    </div>
  );
}
