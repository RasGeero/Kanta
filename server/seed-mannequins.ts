import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { storage } from './storage.js';
import type { InsertFashionModel } from '@shared/schema';

// Helper function to upload buffer to Cloudinary (copied from routes.ts)
async function uploadToCloudinary(buffer: Buffer, options: {
  folder?: string;
  public_id?: string;
  format?: string;
} = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'image' as const,
      folder: options.folder || 'models',
      public_id: options.public_id || undefined,
      format: options.format || 'jpg',
      overwrite: true,
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('No result from Cloudinary upload'));
        }
      }
    ).end(buffer);
  });
}

// Fashion model data with corresponding image files
const modelsData: Array<Omit<InsertFashionModel, 'imageUrl' | 'cloudinaryPublicId'> & { imageFile: string }> = [
  {
    name: 'Elena - Professional Female Model',
    imageFile: 'attached_assets/stock_images/female_fashion_model_87f5c94a.jpg',
    gender: 'women',
    bodyType: 'slim',
    ethnicity: 'caucasian',
    ageRange: 'adult',
    pose: 'front',
    category: 'general',
    height: 175,
    hasTransparentBackground: false, // Stock images don't have transparent backgrounds
    isActive: true,
    sortOrder: 1,
    tags: ['professional', 'studio', 'elegant', 'fashion']
  },
  {
    name: 'Sophie - Elegant Female Model',
    imageFile: 'attached_assets/stock_images/female_fashion_model_913f4f31.jpg',
    gender: 'women',
    bodyType: 'average',
    ethnicity: 'caucasian',
    ageRange: 'adult',
    pose: 'front',
    category: 'formal',
    height: 170,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 2,
    tags: ['elegant', 'formal', 'professional', 'classic']
  },
  {
    name: 'Marcus - Athletic Male Model',
    imageFile: 'attached_assets/stock_images/male_fashion_model_s_9cd40a09.jpg',
    gender: 'men',
    bodyType: 'athletic',
    ethnicity: 'caucasian',
    ageRange: 'adult',
    pose: 'front',
    category: 'casual',
    height: 185,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 3,
    tags: ['athletic', 'casual', 'modern', 'fitness']
  },
  {
    name: 'David - Classic Male Model',
    imageFile: 'attached_assets/stock_images/male_fashion_model_s_aadb2d9f.jpg',
    gender: 'men',
    bodyType: 'average',
    ethnicity: 'caucasian',
    ageRange: 'adult',
    pose: 'front',
    category: 'general',
    height: 180,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 4,
    tags: ['classic', 'versatile', 'professional', 'studio']
  },
  {
    name: 'Business Executive Model',
    imageFile: 'attached_assets/stock_images/professional_busines_cfabf1e6.jpg',
    gender: 'unisex',
    bodyType: 'average',
    ethnicity: 'diverse',
    ageRange: 'adult',
    pose: 'front',
    category: 'formal',
    height: 175,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 5,
    tags: ['business', 'executive', 'formal', 'corporate']
  },
  {
    name: 'Corporate Professional Model',
    imageFile: 'attached_assets/stock_images/professional_busines_b344318f.jpg',
    gender: 'unisex',
    bodyType: 'average',
    ethnicity: 'diverse',
    ageRange: 'adult',
    pose: 'front',
    category: 'formal',
    height: 172,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 6,
    tags: ['business', 'professional', 'corporate', 'formal']
  },
  {
    name: 'Ava - African American Fashion Model',
    imageFile: 'attached_assets/stock_images/african_american_fas_f7577898.jpg',
    gender: 'women',
    bodyType: 'average',
    ethnicity: 'african',
    ageRange: 'adult',
    pose: 'front',
    category: 'general',
    height: 173,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 7,
    tags: ['diverse', 'fashion', 'elegant', 'modern']
  },
  {
    name: 'Zara - African American Professional',
    imageFile: 'attached_assets/stock_images/african_american_fas_c183cb1a.jpg',
    gender: 'women',
    bodyType: 'average',
    ethnicity: 'african',
    ageRange: 'adult',
    pose: 'front',
    category: 'formal',
    height: 168,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 8,
    tags: ['professional', 'diverse', 'elegant', 'formal']
  },
  {
    name: 'Yuki - Asian Fashion Model',
    imageFile: 'attached_assets/stock_images/asian_fashion_model__bd36f481.jpg',
    gender: 'women',
    bodyType: 'slim',
    ethnicity: 'asian',
    ageRange: 'adult',
    pose: 'front',
    category: 'general',
    height: 165,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 9,
    tags: ['asian', 'fashion', 'modern', 'versatile']
  },
  {
    name: 'Mei - Asian Professional Model',
    imageFile: 'attached_assets/stock_images/asian_fashion_model__81d27656.jpg',
    gender: 'women',
    bodyType: 'average',
    ethnicity: 'asian',
    ageRange: 'adult',
    pose: 'front',
    category: 'formal',
    height: 162,
    hasTransparentBackground: false,
    isActive: true,
    sortOrder: 10,
    tags: ['asian', 'professional', 'elegant', 'formal']
  }
];

async function seedModels() {
  try {
    console.log('🌱 Starting fashion model seeding process...');
    console.log(`📊 Planning to create ${modelsData.length} fashion models`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const modelData of modelsData) {
      try {
        console.log(`📤 Processing ${modelData.name}...`);
        
        // Read image file
        const imagePath = join(process.cwd(), modelData.imageFile);
        const imageBuffer = readFileSync(imagePath);
        
        // Upload to Cloudinary
        const publicId = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const imageUrl = await uploadToCloudinary(imageBuffer, {
          folder: 'models',
          public_id: publicId,
          format: 'jpg'
        });
        
        // Create model record
        const model: InsertFashionModel = {
          ...modelData,
          imageUrl,
          cloudinaryPublicId: publicId
        };
        
        const createdModel = await storage.createFashionModel(model);
        console.log(`✅ Created fashion model: ${modelData.name} - ${imageUrl}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to create fashion model ${modelData.name}:`, error);
        failureCount++;
      }
      
      // Add small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📈 Seeding Summary:');
    console.log(`✅ Successfully created: ${successCount} fashion models`);
    console.log(`❌ Failed: ${failureCount} fashion models`);
    console.log(`🎯 Total processed: ${successCount + failureCount} fashion models`);
    
    if (failureCount > 0) {
      console.log('\n⚠️ Some fashion models failed to create. Check the errors above.');
      return false;
    } else {
      console.log('\n🎉 All fashion models seeded successfully!');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    return false;
  }
}

// Export for use in other files
export { seedModels };

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  seedModels()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}