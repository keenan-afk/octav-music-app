import React from 'react';

/**
 * Octav Signature Geometric Logo
 * Precision-crafted 2D geometric SVG mark:
 * A sleek, tilted bold emerald oval ring cleanly sliced diagonally down the center
 * by a sharp negative-space slit, forming two dynamic interlocking crescent blades.
 *
 * @param {number|string} size - Pixel size or CSS width/height for the emblem
 * @param {boolean} showWordmark - Whether to display "Octav" typography beside the emblem
 * @param {string} color - Primary brand color (defaults to #1ED760)
 * @param {string} className - Additional CSS classes
 */
export function OctavLogo({
  size = 28,
  showWordmark = false,
  color = '#1ED760',
  className = '',
  wordmarkClassName = '',
}) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* 2D Geometric Emerald Mark */}
      <svg
        viewBox="0 0 512 512"
        width={pixelSize}
        height={pixelSize}
        className="shrink-0 transition-transform duration-200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Octav Logo"
      >
        {/* Upper-Left Crescent Blade */}
        <path
          fill={color}
          d="M 346.8,77.0 L 363.5,77.3 L 382.0,80.8 L 396.0,86.3 L 407.3,94.0 L 269.5,231.8 L 309.8,181.5 L 327.8,155.0 L 332.3,147.0 L 331.5,145.8 L 316.0,143.3 L 303.5,143.8 L 292.0,145.8 L 275.5,150.8 L 256.0,159.8 L 241.5,168.3 L 226.0,179.3 L 210.0,192.8 L 195.3,207.5 L 183.8,221.0 L 164.8,249.5 L 157.3,265.0 L 151.3,282.5 L 148.3,298.5 L 148.3,313.0 L 150.3,323.0 L 154.0,331.8 L 182.0,311.8 L 216.5,282.8 L 217.3,283.5 L 99.5,400.3 L 92.3,390.5 L 88.3,382.5 L 82.8,362.0 L 81.8,341.0 L 85.8,313.0 L 95.3,282.5 L 109.8,251.0 L 121.8,230.5 L 140.8,203.5 L 160.8,180.0 L 184.0,156.8 L 209.5,135.3 L 240.5,113.8 L 272.0,96.8 L 297.0,86.8 L 322.5,79.8 L 346.8,77.0 Z"
        />
        {/* Lower-Right Crescent Blade */}
        <path
          fill={color}
          d="M 410.8,114.0 L 417.8,123.0 L 423.8,135.5 L 426.8,146.0 L 428.8,160.5 L 427.3,188.0 L 418.8,221.0 L 405.8,251.0 L 383.8,287.5 L 361.3,317.0 L 331.5,348.8 L 299.0,376.8 L 270.5,396.8 L 237.0,415.3 L 204.5,428.3 L 188.0,432.8 L 170.5,435.8 L 144.0,436.3 L 130.5,434.3 L 120.0,431.3 L 109.0,426.3 L 101.8,421.0 L 237.0,285.8 L 237.8,286.5 L 219.3,308.5 L 199.3,336.0 L 181.3,364.5 L 179.8,367.5 L 180.5,368.8 L 192.0,370.8 L 205.0,370.8 L 218.0,368.8 L 235.0,363.8 L 246.0,359.3 L 268.0,347.3 L 284.5,335.8 L 301.5,321.3 L 313.8,309.0 L 329.8,290.0 L 341.3,273.0 L 349.8,257.5 L 356.8,240.5 L 360.8,225.5 L 362.3,215.5 L 361.8,198.0 L 357.8,184.5 L 356.5,182.8 L 355.5,183.3 L 318.0,211.3 L 287.0,237.8 L 285.3,238.0 L 410.8,114.0 Z"
        />
      </svg>

      {/* Wordmark Typography */}
      {showWordmark && (
        <span
          className={`font-extrabold tracking-tighter text-white font-sans ${
            wordmarkClassName || 'text-xl leading-none'
          }`}
        >
          Octav
        </span>
      )}
    </div>
  );
}

export default OctavLogo;

