export interface ProfileData {
  name: string;
  nameFont?: string;
  nameItalic?: boolean;
  nameAtBottom?: boolean;
  contact: string;
  showContact: boolean;
  email: string;
  showEmail: boolean;
  agency: string;
  
  height: string;
  bust: string;
  waist: string;
  hips: string;
  shoes: string;
  hair: string;
  eyes: string;

  nationality: string;
  showNationality: boolean;
  residence: string;
  showResidence: boolean;
  experience: string;
  experience2?: string;
  experience3?: string;
  experience4?: string;
  showExperience: boolean;
}

export interface ImageData {
  id: string;
  originalUrl: string | null;
  croppedUrl: string | null;
  fitMode?: 'cover' | 'contain';
  exposure?: number;
  vibrance?: number;
}

export interface WatermarkData {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  font: string;
  imageUrl: string | null;
  opacity: number;
  size?: number;
}

export interface AppState {
  profile: ProfileData;
  watermark: WatermarkData;
  images: {
    main: ImageData;
    sub1: ImageData;
    sub2: ImageData;
    sub3: ImageData;
    sub4: ImageData;
  };
}
