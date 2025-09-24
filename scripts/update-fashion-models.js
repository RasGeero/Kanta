const fs = require('fs');
const path = require('path');

// Function to upload image to Cloudinary and get URL
async function uploadImageToCloudinary(imagePath, publicId) {
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  
  const imageStream = fs.createReadStream(imagePath);
  formData.append('image', imageStream);
  formData.append('public_id', publicId);
  formData.append('folder', 'fashion-models');
  
  const response = await fetch('http://localhost:5000/api/upload-image', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  const result = await response.json();
  return result.secure_url;
}

// Fashion model updates
const modelUpdates = [
  {
    id: 'a0ea1077-0330-4639-a971-461798339c4c', // Sophia
    imagePath: 'attached_assets/stock_images/full_body_fashion_mo_9c5a0862.jpg',
    publicId: 'sophia-elegant-model'
  },
  {
    id: 'c003e0a4-a852-47b2-a35b-48a74f9fca6a', // Zara
    imagePath: 'attached_assets/stock_images/full_body_fashion_mo_7a65e739.jpg',
    publicId: 'zara-casual-model'
  },
  {
    id: 'e5a69b7d-0a4a-4edb-b3f5-33fc83a47b14', // Maya
    imagePath: 'attached_assets/stock_images/full_body_fashion_mo_bf767612.jpg',
    publicId: 'maya-evening-model'
  },
  {
    id: 'db45a69b-4781-45ef-9f22-fa7b917acee0', // Marcus
    imagePath: 'attached_assets/stock_images/full_body_fashion_mo_dc9c6415.jpg',
    publicId: 'marcus-professional-model'
  },
  {
    id: 'af5db9f9-3296-43bf-8d87-0dcd2e49e01e', // David
    imagePath: 'attached_assets/stock_images/full_body_fashion_mo_9433affd.jpg',
    publicId: 'david-athletic-model'
  },
  {
    id: '30e18d4f-3d8b-4bae-823f-420ededb5233', // Alex
    imagePath: 'attached_assets/stock_images/full_body_fashion_mo_16ca18ba.jpg',
    publicId: 'alex-unisex-model'
  }
];

async function updateFashionModels() {
  try {
    console.log('🔄 Starting fashion model image updates...');
    
    for (const model of modelUpdates) {
      try {
        console.log(`📤 Processing model ID: ${model.id}...`);
        
        // Check if file exists
        const imagePath = path.resolve(model.imagePath);
        if (!fs.existsSync(imagePath)) {
          console.error(`❌ Image file not found: ${imagePath}`);
          continue;
        }
        
        // Upload image to Cloudinary via our API
        console.log(`📡 Uploading ${model.imagePath}...`);
        const imageUrl = await uploadImageToCloudinary(imagePath, model.publicId);
        console.log(`✅ Uploaded: ${imageUrl}`);
        
        // Update database via SQL
        const updateQuery = `
          UPDATE fashion_models 
          SET image_url = $1, cloudinary_public_id = $2, updated_at = NOW() 
          WHERE id = $3
        `;
        
        console.log(`💾 Updating database record for ${model.id}...`);
        // For now, we'll output the SQL command to run manually
        console.log(`SQL Command: UPDATE fashion_models SET image_url = '${imageUrl}', cloudinary_public_id = '${model.publicId}', updated_at = NOW() WHERE id = '${model.id}';`);
        
      } catch (error) {
        console.error(`❌ Failed to update model ${model.id}:`, error.message);
      }
    }
    
    console.log('🎉 Fashion model update process completed!');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  }
}

updateFashionModels();