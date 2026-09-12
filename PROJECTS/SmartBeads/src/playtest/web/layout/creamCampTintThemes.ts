/** Cream-camp half-board wash presets — preview only until human locks one in DECISIONS. */



export type CreamCampTintThemeId = '1' | '2' | '3' | '4';



export type CreamCampTintStop = readonly [position: number, color: string];



export interface CreamCampTintTheme {

  id: CreamCampTintThemeId;

  label: string;

  /** Cream on left / black on right (most boards). */

  horizontalStops: readonly CreamCampTintStop[];

  /** Black on top / cream on bottom (6×4). */

  verticalStops: readonly CreamCampTintStop[];

}



export const CREAM_CAMP_TINT_THEMES: Record<CreamCampTintThemeId, CreamCampTintTheme> = {

  '1': {

    id: '1',

    label: 'Soft sage third',

    horizontalStops: [

      [0, 'rgba(255,245,220,0.14)'],

      [0.45, 'rgba(255,245,220,0)'],

      [1, 'rgba(0,0,0,0)'],

    ],

    verticalStops: [

      [0, 'rgba(0,0,0,0)'],

      [0.55, 'rgba(255,245,220,0)'],

      [1, 'rgba(255,245,220,0.14)'],

    ],

  },

  '2': {

    id: '2',

    label: 'Mist green third',

    horizontalStops: [

      [0, 'rgba(220,240,210,0.12)'],

      [0.5, 'rgba(220,240,210,0)'],

      [1, 'rgba(0,0,0,0)'],

    ],

    verticalStops: [

      [0, 'rgba(0,0,0,0)'],

      [0.58, 'rgba(220,240,210,0)'],

      [1, 'rgba(220,240,210,0.12)'],

    ],

  },

  '3': {

    id: '3',

    label: 'Warm parchment third',

    horizontalStops: [

      [0, 'rgba(255,242,215,0.20)'],

      [0.33, 'rgba(255,242,215,0.08)'],

      [0.45, 'rgba(255,242,215,0)'],

      [1, 'rgba(0,0,0,0)'],

    ],

    verticalStops: [

      [0, 'rgba(0,0,0,0)'],

      [0.55, 'rgba(255,242,215,0)'],

      [0.67, 'rgba(255,242,215,0.10)'],

      [1, 'rgba(255,242,215,0.20)'],

    ],

  },

  '4': {

    id: '4',

    label: 'Camp edge glow',

    horizontalStops: [

      [0, 'rgba(255,245,220,0.22)'],

      [0.15, 'rgba(255,245,220,0.10)'],

      [0.28, 'rgba(255,245,220,0)'],

      [1, 'rgba(0,0,0,0)'],

    ],

    verticalStops: [

      [0, 'rgba(0,0,0,0)'],

      [0.72, 'rgba(255,245,220,0)'],

      [0.85, 'rgba(255,245,220,0.10)'],

      [1, 'rgba(255,245,220,0.22)'],

    ],

  },

};



export function isCreamCampTintThemeId(value: string | null | undefined): value is CreamCampTintThemeId {

  return value === '1' || value === '2' || value === '3' || value === '4';

}



export function getCreamCampTintTheme(id: CreamCampTintThemeId): CreamCampTintTheme {

  return CREAM_CAMP_TINT_THEMES[id];

}



/** Locked — Soft sage third (human pick 2026-09). Preview picker removed. */
export function readCreamCampTintThemeId(): CreamCampTintThemeId {
  return '1';
}


