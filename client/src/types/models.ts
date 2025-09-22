import { GenderType } from "@shared/schema";

export interface FashionModel {
  id: string;
  name: string;
  gender: GenderType;
  bodyType: string;
  ethnicity: string;
  age: number;
  category: string;
  imageUrl: string;
  thumbnailUrl?: string;
  description?: string;
  tags: string[];
  skinTone?: string;
  hairStyle?: string;
  isFeatured: boolean;
  isActive: boolean;
  usageCount: number;
}