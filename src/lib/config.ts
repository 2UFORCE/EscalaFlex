import { Briefcase, Home, Plane, Sparkles, Repeat } from 'lucide-react';
import { SHIFT_TYPES, ShiftType } from './schedule';
import React from 'react';

export const SHIFT_CONFIG: Record<ShiftType, { icon: React.ElementType; className: string }> = {
  [SHIFT_TYPES.WORK]:     { icon: Briefcase, className: 'bg-sky-200 text-sky-800' },
  [SHIFT_TYPES.OFF]:      { icon: Home,      className: 'bg-gray-200 text-gray-700' },
  [SHIFT_TYPES.VACATION]: { icon: Plane,     className: 'bg-green-200 text-green-800' },
  [SHIFT_TYPES.SWAP]:     { icon: Repeat,    className: 'bg-yellow-200 text-yellow-800' },
  [SHIFT_TYPES.OTHER]:    { icon: Sparkles,  className: 'bg-purple-200 text-purple-800' },
};
