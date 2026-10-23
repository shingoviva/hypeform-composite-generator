import { AppState } from './types';

export const SECOND_PAGE_IDS = Array.from({ length: 8 }, (_, index) => `page2-${index + 1}`);

export function enableSecondPage(state: AppState, enabled: boolean): AppState {
  const images = { ...state.images };
  if (enabled) for (const id of SECOND_PAGE_IDS) images[id] ??= { id, originalUrl: null, croppedUrl: null };
  return { ...state, secondPageEnabled: enabled, images };
}
