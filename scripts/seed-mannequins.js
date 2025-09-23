#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Model data with corresponding image files
const modelsData = [
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
    hasTransparentBackground: true,
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
    hasTransparentBackground: true,
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
    hasTransparentBackground: true,
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
    hasTransparentBackground: true,
    isActive: true,
    sortOrder: 4,
    tags: ['classic', 'versatile', 'professional', 'studio']
  },
  {
    name: 'Executive Professional Model',
    imageFile: 'attached_assets/stock_images/professional_busines_cfabf1e6.jpg',
    gender: 'unisex',
    bodyType: 'average',
    ethnicity: 'diverse',
    ageRange: 'adult',
    pose: 'front',
    category: 'formal',
    height: 175,
    hasTransparentBackground: true,
    isActive: true,
    sortOrder: 5,
    tags: ['business', 'executive', 'formal', 'corporate']
  },
  {
    name: 'Business Professional Model',
    imageFile: 'attached_assets/stock_images/professional_busines_b344318f.jpg',
    gender: 'unisex',
    bodyType: 'average',
    ethnicity: 'diverse',
    ageRange: 'adult',
    pose: 'front',
    category: 'formal',
    height: 172,
    hasTransparentBackground: true,
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
    hasTransparentBackground: true,
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
    hasTransparentBackground: true,
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
    hasTransparentBackground: true,
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
    hasTransparentBackground: true,
    isActive: true,
    sortOrder: 10,
    tags: ['asian', 'professional', 'elegant', 'formal']
  }
];

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';

// Read session cookies for authentication
let sessionCookie = '';
try {
  const cookies = fs.readFileSync('cookies.txt', 'utf8');
  const sessionMatch = cookies.match(/connect\.sid\s+([^\s]+)/);
  if (sessionMatch) {
    sessionCookie = `connect.sid=${sessionMatch[1]}`;
  }
} catch (error) {
  console.error('❌ No session cookies found. Please log in first.');
  process.exit(1);
}

async function createModel(modelData) {
  try {
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Add image file
    const imagePath = path.resolve(modelData.imageFile);
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const imageStream = fs.createReadStream(imagePath);
    formData.append('image', imageStream);
    
    // Add other fields
    formData.append('name', modelData.name);
    formData.append('gender', modelData.gender);
    formData.append('bodyType', modelData.bodyType);
    formData.append('ethnicity', modelData.ethnicity);
    formData.append('ageRange', modelData.ageRange);
    formData.append('pose', modelData.pose);
    formData.append('category', modelData.category);
    formData.append('height', modelData.height.toString());
    formData.append('hasTransparentBackground', modelData.hasTransparentBackground.toString());
    formData.append('isActive', modelData.isActive.toString());
    formData.append('sortOrder', modelData.sortOrder.toString());
    formData.append('tags', JSON.stringify(modelData.tags));
    
    const response = await fetch(`${API_BASE}/api/fashion-models`, {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create model ${modelData.name}: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Created model: ${modelData.name}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to create model ${modelData.name}:`, error.message);
    throw error;
  }
}

async function seedModels() {
  console.log('🌱 Starting model seeding process...');
  console.log(`📊 Planning to create ${modelsData.length} models`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const modelData of modelsData) {
    try {
      await createModel(modelData);
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`Failed to seed ${modelData.name}:`, error.message);
    }
    
    // Add small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📈 Seeding Summary:');
  console.log(`✅ Successfully created: ${successCount} models`);
  console.log(`❌ Failed: ${failureCount} models`);
  console.log(`🎯 Total processed: ${successCount + failureCount} models`);
  
  if (failureCount > 0) {
    console.log('\n⚠️ Some models failed to create. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All models seeded successfully!');
    process.exit(0);
  }
}

// Run the seeding
seedModels().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});