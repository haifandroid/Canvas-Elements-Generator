
export enum AssetType {
  STICKER = 'Sticker',
  PNG_ELEMENT = 'PNG Element',
  GRAPHIC = 'Graphic',
  SHAPE_3D = '3D Shape',
  MOCKUP = 'Mockup',
  PHOTO = 'Photo',
  STAMP = 'Stamp',
  GIF = 'GIF (Motion)'
}

export interface GeneratedAsset {
  id: string;
  url: string;
  type: AssetType;
  prompt: string;
  timestamp: number;
  isVideo?: boolean;
}

export interface GenerationParams {
  prompt: string;
  type: AssetType;
}
