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
  small?: boolean;
  onChange?: never;
}

type StarRatingProps = StarRatingInteractiveProps | StarRatingReadOnlyProps;

export default function StarRating(props: StarRatingProps) {
  const { value, readOnly } = props;
  const small = readOnly && (props as StarRatingReadOnlyProps).small;
  const [hovered, setHovered] = useState<number>(0);

  const displayValue = hovered || value;
  const starSize = small ? 'h-3.5 w-3.5' : 'h-5 w-5';

  const handleClick = (star: number) => {
    if (!readOnly && props.onChange) {
      props.onChange(star);
    }
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayValue >= star;
        const halfFilled = !filled && !hovered && displayValue >= star - 0.5;

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
            <Star className={`${starSize} text-gray-300`} />

            {/* Filled overlay */}
            {(filled || halfFilled) && (
              <span
                className="absolute inset-0.5 overflow-hidden"
                style={{ width: halfFilled ? '50%' : '100%' }}
              >
                <Star className={`${starSize} fill-warning text-warning`} />
              </span>
            )}
          </button>
        );
      })}

      {readOnly && props.count !== undefined && (
        <span className="ml-1 text-xs text-text-muted">
          ({props.count})
        </span>
      )}
    </div>
  );
}
