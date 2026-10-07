import { AppState } from './types';

export const DEFAULT_STATE: AppState = {
  profile: {
    name: 'ALEXA VERMONT',
    nameFont: '"Oswald", sans-serif',
    contact: '+1 (123) 456-7890',
    showContact: true,
    email: 'ALEXA@EMAIL.COM',
    showEmail: true,
    agency: 'VIVA AGENCY',
    height: '178',
    bust: '84',
    waist: '60',
    hips: '89',
    shoes: '24.5',
    hair: 'Black',
    eyes: 'Brown',
    nationality: 'American',
    showNationality: false,
    residence: 'Tokyo',
    showResidence: false,
    experience: 'Vogue, Harper\'s Bazaar',
    showExperience: false,
  },
  watermark: {
    enabled: false,
    type: 'text',
    text: '',
    font: '"Oswald", sans-serif',
    imageUrl: null,
    opacity: 50,
    size: 100,
  },
  images: {
    main: { id: 'main', originalUrl: null, croppedUrl: null },
    sub1: { id: 'sub1', originalUrl: null, croppedUrl: null },
    sub2: { id: 'sub2', originalUrl: null, croppedUrl: null },
    sub3: { id: 'sub3', originalUrl: null, croppedUrl: null },
    sub4: { id: 'sub4', originalUrl: null, croppedUrl: null },
  },
};

const buildDemoAssetUrl = (filename: string) => `${import.meta.env.BASE_URL}demo/${filename}`;

const buildDemoImage = (filename: string) => {
  const url = buildDemoAssetUrl(filename);
  return {
    originalUrl: url,
    croppedUrl: url,
    fitMode: 'cover' as const,
  };
};

const KATE_DEMO_STATE: AppState = {
  profile: {
    name: 'KATE SANADA',
    nameFont: '"Oswald", sans-serif',
    contact: '+81 90-4172-6843',
    showContact: true,
    email: 'KATE@VIVA-AGENCY.COM',
    showEmail: true,
    agency: 'VIVA AGENCY',
    height: '178',
    bust: '81',
    waist: '60',
    hips: '88',
    shoes: '25.5',
    hair: 'Dark Brown',
    eyes: 'Brown',
    nationality: 'Japanese-American',
    showNationality: true,
    residence: 'Tokyo / New York',
    showResidence: true,
    experience: 'Tokyo Fashion Week',
    experience2: 'Beauty Test Shoots',
    experience3: 'Showroom Presentations',
    experience4: 'Editorial Casting',
    showExperience: true,
  },
  watermark: {
    enabled: false,
    type: 'text',
    text: 'VIVA AGENCY',
    font: '"Oswald", sans-serif',
    imageUrl: null,
    opacity: 42,
    size: 100,
  },
  images: {
    main: { id: 'main', ...buildDemoImage('kate-1.png') },
    sub1: { id: 'sub1', ...buildDemoImage('kate-2.png') },
    sub2: { id: 'sub2', ...buildDemoImage('kate-3.png') },
    sub3: { id: 'sub3', ...buildDemoImage('kate-4.png') },
    sub4: { id: 'sub4', ...buildDemoImage('kate-5.png') },
  },
};

const KATE_PROFILE_ONLY_STATE: AppState = {
  ...KATE_DEMO_STATE,
  images: {
    main: { id: 'main', originalUrl: null, croppedUrl: null },
    sub1: { id: 'sub1', originalUrl: null, croppedUrl: null },
    sub2: { id: 'sub2', originalUrl: null, croppedUrl: null },
    sub3: { id: 'sub3', originalUrl: null, croppedUrl: null },
    sub4: { id: 'sub4', originalUrl: null, croppedUrl: null },
  },
};

const KATE_REFRESH_PROFILE = {
  name: 'KATE SANADA',
  nameFont: '"Oswald", sans-serif',
  contact: '+81 90-6421-3805',
  showContact: true,
  email: 'KATE@VIVA-AGENCY.TOKYO',
  showEmail: true,
  agency: 'VIVA AGENCY',
  height: '178',
  bust: '80',
  waist: '59',
  hips: '87',
  shoes: '25.5',
  hair: 'Dark Brown',
  eyes: 'Brown',
  nationality: 'Japanese',
  showNationality: true,
  residence: 'Tokyo / Paris',
  showResidence: true,
  experience: 'Editorial Test Shoots',
  experience2: 'Tokyo Fashion Week',
  experience3: 'Beauty Campaign Castings',
  experience4: 'Showroom Presentations',
  showExperience: true,
};

const KATE_REFRESH_WATERMARK = {
  enabled: false,
  type: 'text' as const,
  text: 'VIVA AGENCY',
  font: '"Oswald", sans-serif',
  imageUrl: null,
  opacity: 34,
  size: 100,
};

const KATE_REFRESH_FULL_IMAGES = {
  main: { id: 'main', ...buildDemoImage('kate-refresh-1.png') },
  sub1: { id: 'sub1', ...buildDemoImage('kate-refresh-2.png'), fitMode: 'contain' as const },
  sub2: { id: 'sub2', ...buildDemoImage('kate-refresh-3.png') },
  sub3: { id: 'sub3', ...buildDemoImage('kate-refresh-4.png') },
  sub4: { id: 'sub4', ...buildDemoImage('kate-refresh-5.png') },
};

const EMPTY_IMAGES = {
  main: { id: 'main', originalUrl: null, croppedUrl: null },
  sub1: { id: 'sub1', originalUrl: null, croppedUrl: null },
  sub2: { id: 'sub2', originalUrl: null, croppedUrl: null },
  sub3: { id: 'sub3', originalUrl: null, croppedUrl: null },
  sub4: { id: 'sub4', originalUrl: null, croppedUrl: null },
};

const KATE_REFRESH_DEMO_STATE: AppState = {
  profile: KATE_REFRESH_PROFILE,
  watermark: KATE_REFRESH_WATERMARK,
  images: KATE_REFRESH_FULL_IMAGES,
};

const KATE_REFRESH_BASICS_STATE: AppState = {
  ...KATE_REFRESH_DEMO_STATE,
  profile: {
    ...KATE_REFRESH_PROFILE,
    nationality: '',
    showNationality: false,
    residence: '',
    showResidence: false,
    experience: '',
    experience2: '',
    experience3: '',
    experience4: '',
    showExperience: false,
  },
  images: EMPTY_IMAGES,
};

const KATE_REFRESH_PROFILE_ONLY_STATE: AppState = {
  ...KATE_REFRESH_DEMO_STATE,
  images: EMPTY_IMAGES,
};

const KATE_REFRESH_PRIMARY_STATE: AppState = {
  ...KATE_REFRESH_DEMO_STATE,
  images: {
    ...EMPTY_IMAGES,
    main: { id: 'main', ...buildDemoImage('kate-refresh-1.png') },
    sub1: { id: 'sub1', ...buildDemoImage('kate-refresh-2.png'), fitMode: 'contain' as const },
  },
};

const KATE_REFRESH_WATERMARK_STATE: AppState = {
  ...KATE_REFRESH_DEMO_STATE,
  watermark: {
    enabled: true,
    type: 'image',
    text: '',
    font: '"Oswald", sans-serif',
    imageUrl: buildDemoAssetUrl('viva-agency-logo.png'),
    opacity: 48,
    size: 100,
  },
};

const KATE_REFRESH_TEXT_WATERMARK_STATE: AppState = {
  ...KATE_REFRESH_DEMO_STATE,
  watermark: {
    enabled: true,
    type: 'text',
    text: 'VIVA AGENCY',
    font: '"Oswald", sans-serif',
    imageUrl: null,
    opacity: 34,
    size: 100,
  },
};

export const getInitialAppState = (): AppState => {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return DEFAULT_STATE;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'kate-profile') {
    return KATE_PROFILE_ONLY_STATE;
  }
  if (params.get('demo') === 'kate') {
    return KATE_DEMO_STATE;
  }
  if (params.get('demo') === 'kate-refresh-profile') {
    return KATE_REFRESH_PROFILE_ONLY_STATE;
  }
  if (params.get('demo') === 'kate-refresh-basics') {
    return KATE_REFRESH_BASICS_STATE;
  }
  if (params.get('demo') === 'kate-refresh-primary') {
    return KATE_REFRESH_PRIMARY_STATE;
  }
  if (params.get('demo') === 'kate-refresh-watermark') {
    return KATE_REFRESH_WATERMARK_STATE;
  }
  if (params.get('demo') === 'kate-refresh-text-watermark') {
    return KATE_REFRESH_TEXT_WATERMARK_STATE;
  }
  if (params.get('demo') === 'kate-refresh') {
    return KATE_REFRESH_DEMO_STATE;
  }

  return DEFAULT_STATE;
};
