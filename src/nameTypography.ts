import { ProfileData } from './types';

export const NAME_FONTS = [
  { name: 'Oswald', family: '"Oswald", sans-serif', weight: 700, spacing: 0 },
  { name: 'Montserrat', family: '"Montserrat", sans-serif', weight: 900, spacing: 0 },
  { name: 'Playfair Display', family: '"Playfair Display", serif', weight: 700, spacing: 0 },
  { name: 'Inter', family: '"Inter", sans-serif', weight: 700, spacing: 0 },
  { name: 'Anton', family: '"Anton", sans-serif', weight: 400, spacing: 0.025 },
  { name: 'Bodoni Moda', family: '"Bodoni Moda", serif', weight: 700, spacing: 0 },
  { name: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', weight: 600, spacing: 0 },
  { name: 'Space Grotesk', family: '"Space Grotesk", sans-serif', weight: 700, spacing: 0 },
  { name: 'Barlow Condensed', family: '"Barlow Condensed", sans-serif', weight: 600, spacing: 0.01 },
  { name: 'DM Serif Display', family: '"DM Serif Display", serif', weight: 400, spacing: 0 },
];

export function getNameTypography(profile: ProfileData) {
  const font = NAME_FONTS.find(font => font.family === profile.nameFont) || NAME_FONTS[0];
  const defaultSize = (profile.name || 'NAME').trim().includes(' ') || (profile.name || 'NAME').length > 10 ? 52 : 61;
  return {
    font,
    size: Math.min(84, Math.max(32, profile.nameSize ?? defaultSize)),
    spacing: Math.min(0.12, Math.max(0, profile.nameSpacing ?? font.spacing)),
    defaultSize,
  };
}
