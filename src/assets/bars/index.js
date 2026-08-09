// Auto-generated: cleaned barbell nav frames, one per theme.
// Geometry is in fractions of the image (shaft = where the tabs sit).

import obsidianImg from './obsidian.webp';
import nightImg from './night.webp';
import oceanImg from './ocean.webp';
import forestImg from './forest.webp';
import carbonImg from './carbon.webp';
import crimsonImg from './crimson.webp';
import auroraImg from './aurora.webp';
import copperImg from './copper.webp';
import sandImg from './sand.webp';
import arcticImg from './arctic.webp';
import mintImg from './mint.webp';
import roseImg from './rose.webp';
import ivoryImg from './ivory.webp';
import lavenderImg from './lavender.webp';
import blushImg from './blush.webp';
import skyImg from './sky.webp';

export const BARS = {
  obsidian: { img: obsidianImg, ar: 4.176, sx0: 0.1442, sx1: 0.8545, sy0: 0.3081, sy1: 0.7647, accent: '#c9a96e', tab: '#9a7a3c' },
  night: { img: nightImg, ar: 4.383, sx0: 0.1521, sx1: 0.8466, sy0: 0.3215, sy1: 0.7758, accent: '#818cf8', tab: '#818cf8' },
  ocean: { img: oceanImg, ar: 4.251, sx0: 0.1553, sx1: 0.8441, sy0: 0.3285, sy1: 0.7695, accent: '#4f8ef7', tab: '#4f8ef7' },
  forest: { img: forestImg, ar: 4.276, sx0: 0.1584, sx1: 0.8389, sy0: 0.3314, sy1: 0.7703, accent: '#5cb85c', tab: '#3d9142' },
  carbon: { img: carbonImg, ar: 4.306, sx0: 0.1651, sx1: 0.8336, sy0: 0.3237, sy1: 0.7659, accent: '#e0e0e0', tab: '#2f2f36' },
  crimson: { img: crimsonImg, ar: 4.249, sx0: 0.1654, sx1: 0.8339, sy0: 0.3314, sy1: 0.7314, accent: '#e05050', tab: '#d93c3c' },
  aurora: { img: auroraImg, ar: 4.424, sx0: 0.171, sx1: 0.8283, sy0: 0.3561, sy1: 0.7537, accent: '#a855f7', tab: '#a855f7' },
  copper: { img: copperImg, ar: 4.485, sx0: 0.1689, sx1: 0.8277, sy0: 0.3667, sy1: 0.7576, accent: '#e07840', tab: '#d0662c' },
  sand: { img: sandImg, ar: 4.457, sx0: 0.1721, sx1: 0.8265, sy0: 0.3672, sy1: 0.7433, accent: '#8a6d3b', tab: '#8a6d3b' },
  arctic: { img: arcticImg, ar: 4.437, sx0: 0.1707, sx1: 0.8273, sy0: 0.3683, sy1: 0.7575, accent: '#2563eb', tab: '#2563eb' },
  mint: { img: mintImg, ar: 4.48, sx0: 0.1693, sx1: 0.8274, sy0: 0.3656, sy1: 0.7583, accent: '#059669', tab: '#059669' },
  rose: { img: roseImg, ar: 4.541, sx0: 0.1704, sx1: 0.8269, sy0: 0.367, sy1: 0.7584, accent: '#c94060', tab: '#c94060' },
  ivory: { img: ivoryImg, ar: 4.514, sx0: 0.171, sx1: 0.8249, sy0: 0.3647, sy1: 0.7568, accent: '#6b5c3e', tab: '#6b5c3e' },
  lavender: { img: lavenderImg, ar: 4.48, sx0: 0.1699, sx1: 0.8267, sy0: 0.3716, sy1: 0.7583, accent: '#7c3aed', tab: '#7c3aed' },
  blush: { img: blushImg, ar: 4.505, sx0: 0.1754, sx1: 0.8219, sy0: 0.3678, sy1: 0.7568, accent: '#e05080', tab: '#d63d70' },
  sky: { img: skyImg, ar: 4.523, sx0: 0.1817, sx1: 0.817, sy0: 0.3686, sy1: 0.7583, accent: '#0284c7', tab: '#0284c7' },
};

// master theme name -> bar asset
export const MASTER_BAR = {
  dark: 'carbon',
  obsidian: 'obsidian',
  ocean: 'ocean',
  forest: 'forest',
  slate: 'night',
  aurora: 'aurora',
  crimson: 'crimson',
  copper: 'copper',
  light: 'carbon',
  sand: 'sand',
  rose: 'rose',
  arctic: 'arctic',
  mint: 'mint',
  ivory: 'ivory',
  lavender: 'lavender',
  sky: 'sky',
};

export const barFor = (name, isClient) =>
  BARS[isClient ? (BARS[name] ? name : 'obsidian') : (MASTER_BAR[name] || 'carbon')];
