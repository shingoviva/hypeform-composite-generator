import React from 'react';
import {
  getProtectedExposureTable,
  getVibranceAmount
} from '../imageAdjustments';

interface ImageAdjustmentFilterProps {
  key?: React.Key;
  id: string;
  exposure?: number;
  vibrance?: number;
}

export default function ImageAdjustmentFilter({
  id,
  exposure,
  vibrance
}: ImageAdjustmentFilterProps) {
  const exposureTable = getProtectedExposureTable(exposure);
  const saturation = getVibranceAmount(vibrance);

  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      className="absolute pointer-events-none"
    >
      <defs>
        <filter
          id={id}
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer>
            <feFuncR type="table" tableValues={exposureTable} />
            <feFuncG type="table" tableValues={exposureTable} />
            <feFuncB type="table" tableValues={exposureTable} />
            <feFuncA type="identity" />
          </feComponentTransfer>
          <feColorMatrix type="saturate" values={String(saturation)} />
        </filter>
      </defs>
    </svg>
  );
}
