import { FashionModel } from "@/types/models";

export interface AIProcessingResult {
  success: boolean;
  processedImageUrl?: string;
  originalImageUrl: string;
  message: string;
}

export const aiProcessing = {
  // Remove background using Remove.bg API
  removeBackground: async (imageFile: File | string): Promise<AIProcessingResult> => {
    try {
      console.log('Processing background removal with Remove.bg API...');
      
      // Make actual API call to Remove.bg through our backend
      const formData = new FormData();
      
      if (imageFile instanceof File) {
        formData.append('image', imageFile);
        formData.append('type', 'file');
      } else {
        formData.append('image_url', imageFile);
        formData.append('type', 'url');
      }
      
      const response = await fetch('/api/ai/remove-background', {
        method: 'POST',
        body: formData,
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error - invalid response format');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Background removal failed');
      }

      if (!result.success) {
        throw new Error(result.message || 'Background removal failed');
      }
      
      const originalUrl = imageFile instanceof File ? URL.createObjectURL(imageFile) : imageFile;
      
      return {
        success: true,
        processedImageUrl: result.processedImageUrl,
        originalImageUrl: originalUrl,
        message: 'Background removed successfully',
      };
    } catch (error) {
      console.error('Remove.bg processing error:', error);
      const originalUrl = imageFile instanceof File ? URL.createObjectURL(imageFile) : imageFile;
      
      return {
        success: false,
        originalImageUrl: originalUrl,
        message: error instanceof Error ? error.message : 'Background removal failed. Using original image.',
      };
    }
  },

  // Apply mannequin overlay using Fashn.ai
  applyMannequinOverlay: async (
    backgroundRemovedImageUrl: string,
    garmentType: 'dress' | 'shirt' | 'pants' | 'jacket' | 'other' = 'other',
    mannequinGender: 'male' | 'female' | 'unisex' = 'unisex',
    fashionModel?: FashionModel | null
  ): Promise<AIProcessingResult> => {
    try {
      console.log('Processing mannequin overlay with Fashn.ai API...', {
        garmentType,
        mannequinGender,
        fashionModel: fashionModel ? `${fashionModel.name} (${fashionModel.id})` : 'none',
      });
      
      // Check if Fashn.ai API key is available
      const response = await fetch('/api/ai/model-overlay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: backgroundRemovedImageUrl,
          garmentType,
          modelGender: mannequinGender,
          fashionModel: fashionModel ? {
            id: fashionModel.id,
            name: fashionModel.name,
            imageUrl: fashionModel.imageUrl,
            gender: fashionModel.gender,
            bodyType: fashionModel.bodyType,
            ethnicity: fashionModel.ethnicity,
            category: fashionModel.category
          } : null,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Mannequin overlay API returned non-JSON response');
        return {
          success: true,
          processedImageUrl: backgroundRemovedImageUrl,
          originalImageUrl: backgroundRemovedImageUrl,
          message: 'Background removal completed. Virtual try-on service temporarily unavailable.',
        };
      }

      const result = await response.json();
      
      // Always treat mannequin overlay as optional - if it fails, return background-removed image
      if (!response.ok || !result.success) {
        console.warn('Mannequin overlay failed:', result.message);
        return {
          success: true,
          processedImageUrl: backgroundRemovedImageUrl,
          originalImageUrl: backgroundRemovedImageUrl,
          message: result.message || 'Background removal completed. Virtual try-on temporarily unavailable.',
        };
      }
      
      return {
        success: true,
        processedImageUrl: result.processedImageUrl || backgroundRemovedImageUrl,
        originalImageUrl: backgroundRemovedImageUrl,
        message: 'Virtual try-on completed successfully',
      };
    } catch (error) {
      console.warn('Mannequin overlay processing error:', error);
      
      // Return background-removed image as fallback
      return {
        success: true,
        processedImageUrl: backgroundRemovedImageUrl,
        originalImageUrl: backgroundRemovedImageUrl,
        message: 'Background removal completed. Virtual try-on temporarily unavailable.',
      };
    }
  },

  // Complete AI processing pipeline
  processProductImage: async (
    imageFile: File,
    productCategory: string,
    productGender: string,
    fashionModel?: FashionModel | null
  ): Promise<AIProcessingResult> => {
    try {
      console.log('Starting complete AI processing pipeline...');
      
      // Step 1: Remove background
      const backgroundRemovalResult = await aiProcessing.removeBackground(imageFile);
      
      if (!backgroundRemovalResult.success || !backgroundRemovalResult.processedImageUrl) {
        return backgroundRemovalResult;
      }
      
      // Step 2: Apply mannequin overlay
      const garmentType = mapCategoryToGarmentType(productCategory);
      const mannequinGender = mapGenderToMannequinType(productGender);
      
      const mannequinResult = await aiProcessing.applyMannequinOverlay(
        backgroundRemovalResult.processedImageUrl,
        garmentType,
        mannequinGender,
        fashionModel
      );
      
      return {
        success: mannequinResult.success,
        processedImageUrl: mannequinResult.processedImageUrl || backgroundRemovalResult.processedImageUrl,
        originalImageUrl: URL.createObjectURL(imageFile),
        message: mannequinResult.success 
          ? 'AI processing completed successfully'
          : 'AI processing partially completed. Using background-removed image.',
      };
    } catch (error) {
      console.error('Complete AI processing error:', error);
      
      return {
        success: false,
        originalImageUrl: URL.createObjectURL(imageFile),
        message: 'AI processing failed. Using original image.',
      };
    }
  },

  // Check processing status for long-running operations
  checkProcessingStatus: async (processingId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result?: AIProcessingResult;
  }> => {
    try {
      // In production, check actual processing status
      console.log('Checking AI processing status:', processingId);
      
      // Simulate status check
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        status: 'completed',
        progress: 100,
        result: {
          success: true,
          processedImageUrl: `https://processed.kantamanto.com/${processingId}.jpg`,
          originalImageUrl: `https://original.kantamanto.com/${processingId}.jpg`,
          message: 'Processing completed successfully',
        },
      };
    } catch (error) {
      console.error('Status check error:', error);
      return { status: 'failed' };
    }
  },
};

// Helper functions
function mapCategoryToGarmentType(category: string): 'dress' | 'shirt' | 'pants' | 'jacket' | 'other' {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('dress')) return 'dress';
  if (categoryLower.includes('shirt') || categoryLower.includes('top')) return 'shirt';
  if (categoryLower.includes('pants') || categoryLower.includes('trouser')) return 'pants';
  if (categoryLower.includes('jacket') || categoryLower.includes('coat')) return 'jacket';
  
  return 'other';
}

function mapGenderToMannequinType(gender: string): 'male' | 'female' | 'unisex' {
  const genderLower = gender.toLowerCase();
  
  if (genderLower.includes('men') || genderLower === 'male') return 'male';
  if (genderLower.includes('women') || genderLower === 'female') return 'female';
  
  return 'unisex';
}
