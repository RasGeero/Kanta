import { useState } from "react";
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Save, 
  RotateCcw, 
  Wand2, 
  Image as ImageIcon,
  User,
  Sparkles,
  Shirt,
  TrendingUp,
  Crown
} from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { aiProcessing } from "@/services/ai-processing";
import { productApi } from "@/services/api";
import FashionModelSelector from "@/components/ai-studio/FashionModelSelector";
import { FashionModel } from "@/types/models";

interface AIStudioResult {
  generatedImage: string;
  productTitle: string;
  suggestedCategory: string;
  suggestedDescription: string;
  productId?: string;
}

export default function AIStudio() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // State for the three panels
  const [garmentImage, setGarmentImage] = useState<File | null>(null);
  const [garmentImagePreview, setGarmentImagePreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<FashionModel | null>(null);
  const [category, setCategory] = useState<string>("");
  const [isLongTop, setIsLongTop] = useState(false);
  const [autoDetectGarmentType, setAutoDetectGarmentType] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIStudioResult | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  // Mock seller ID - in production, get from authentication
  const sellerId = "seller-id-placeholder";

  // Mutation for creating product
  const createProductMutation = useMutation({
    mutationFn: (formData: FormData) => productApi.createProduct(formData),
    onSuccess: (product) => {
      setCurrentProductId(product.id);
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product Created",
        description: "Draft product has been created successfully.",
      });
      
      // If a model is already selected, update the product with it
      if (selectedModel && aiResult) {
        updateProductModelMutation.mutate({
          productId: product.id,
          modelId: selectedModel.id,
          aiPreviewUrl: aiResult.generatedImage
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Product Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create draft product.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating product model
  const updateProductModelMutation = useMutation({
    mutationFn: ({ productId, modelId, aiPreviewUrl }: { 
      productId: string; 
      modelId: string; 
      aiPreviewUrl?: string; 
    }) => productApi.updateProductModel(productId, modelId, aiPreviewUrl),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Update the preview with the server-returned Cloudinary URL if available
      if (updatedProduct.aiPreviewUrl && aiResult) {
        setAiResult({
          ...aiResult,
          generatedImage: updatedProduct.aiPreviewUrl
        });
      }
      
      toast({
        title: "Model Updated",
        description: "Fashion model selection has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update model selection.",
        variant: "destructive",
      });
    },
  });

  const handleGarmentUpload = (file: File) => {
    setGarmentImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setGarmentImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle model selection change
  const handleModelSelect = (model: FashionModel | null) => {
    setSelectedModel(model);
    
    // If we have a current product and a model is selected, update the product
    if (currentProductId && model) {
      updateProductModelMutation.mutate({
        productId: currentProductId,
        modelId: model.id,
        aiPreviewUrl: aiResult?.generatedImage
      });
    }
  };


  const handleGenerateAI = async () => {
    if (!garmentImage) {
      toast({
        title: "Missing Garment Image",
        description: "Please upload a garment image to process.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Missing Category",
        description: "Please select a garment category.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Determine gender preference based on selected model or category
      const genderPreference = selectedModel?.gender || 'unisex';
      
      // Use real AI processing service
      const result = await aiProcessing.processProductImage(
        garmentImage,
        category,
        genderPreference
      );
      
      if (result.success && result.processedImageUrl) {
        const aiResult: AIStudioResult = {
          generatedImage: result.processedImageUrl,
          productTitle: `${category || 'Stylish'} Garment`,
          suggestedCategory: category || 'Shirts',
          suggestedDescription: `Beautiful ${category?.toLowerCase() || 'garment'} perfect for any occasion. High-quality material with excellent fit.`,
        };
        
        setAiResult(aiResult);
        
        // Create a draft product in the database
        const formData = new FormData();
        formData.append('image', garmentImage);
        formData.append('title', aiResult.productTitle);
        formData.append('description', aiResult.suggestedDescription);
        formData.append('category', aiResult.suggestedCategory);
        formData.append('condition', 'excellent');
        formData.append('price', '0'); // Placeholder price
        formData.append('sellerId', sellerId);
        formData.append('status', 'draft');
        formData.append('gender', genderPreference);
        
        // Create the product
        createProductMutation.mutate(formData);
        
        toast({
          title: "AI Processing Complete",
          description: result.message,
        });
      } else {
        throw new Error(result.message || 'AI processing failed');
      }
    } catch (error) {
      console.error('AI processing error:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDraft = () => {
    if (!aiResult || !garmentImage) {
      toast({
        title: "Missing Data",
        description: "Please ensure you have completed the AI generation process.",
        variant: "destructive",
      });
      return;
    }

    // Convert the File to a Data URL for localStorage storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const garmentImageDataUrl = e.target?.result as string;
      
      // Create a data object to pass to the seller dashboard
      const aiGeneratedData = {
        title: aiResult.productTitle,
        description: aiResult.suggestedDescription,
        category: aiResult.suggestedCategory,
        condition: 'excellent',
        garmentImageDataUrl: garmentImageDataUrl,
        garmentImageName: garmentImage.name,
        garmentImageType: garmentImage.type,
        generatedImage: aiResult.generatedImage,
        isFromAiStudio: true
      };

      // Store the AI-generated data in localStorage for the seller dashboard to pick up
      localStorage.setItem('aiStudioDraft', JSON.stringify(aiGeneratedData));

      toast({
        title: "Ready for Details",
        description: "Complete your product details in the form.",
      });

      // Navigate back to seller dashboard with a flag to open the product form
      setLocation('/seller-dashboard?openForm=true');
    };
    
    reader.readAsDataURL(garmentImage);
  };

  const handleDownloadResult = () => {
    if (!aiResult) return;
    
    // Create a download link for the generated image
    const link = document.createElement('a');
    link.href = aiResult.generatedImage;
    link.download = `ai-studio-result-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Your AI-generated image is downloading.",
    });
  };

  const handleRunAgain = () => {
    setAiResult(null);
    setIsGenerating(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setLocation('/seller-dashboard')}
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Studio</h1>
          <p className="text-muted-foreground">Generate professional product photos with AI try-on technology</p>
        </div>
      </div>

      {/* Three Panel Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Panel 1: Select Garment */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Select Garment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Garment Image */}
            <div>
              <Label>Upload Garment Image</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                {garmentImagePreview ? (
                  <div className="space-y-4">
                    <img 
                      src={garmentImagePreview} 
                      alt="Garment preview" 
                      className="w-32 h-48 object-cover rounded-lg mx-auto"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGarmentImage(null);
                        setGarmentImagePreview(null);
                      }}
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Upload a clear photo of your garment
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleGarmentUpload(file);
                        }}
                        className="hidden"
                        id="garment-upload"
                        data-testid="garment-upload"
                      />
                      <label htmlFor="garment-upload">
                        <Button type="button" variant="outline" asChild>
                          <span>Choose Image</span>
                        </Button>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="garment-category-select">
                  <SelectValue placeholder="Select garment category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Top">
                    <div className="flex items-center space-x-2">
                      <Shirt className="h-4 w-4" />
                      <span>Top</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Bottom">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Bottom</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Full-body">
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4" />
                      <span>Full-body</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="long-top">Long Top</Label>
                <Switch 
                  id="long-top" 
                  checked={isLongTop} 
                  onCheckedChange={setIsLongTop}
                  data-testid="long-top-toggle"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-detect">Auto Detect Garment Type</Label>
                <Switch 
                  id="auto-detect" 
                  checked={autoDetectGarmentType} 
                  onCheckedChange={setAutoDetectGarmentType}
                  data-testid="auto-detect-toggle"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel 2: Select Fashion Model */}
        <FashionModelSelector
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
          garmentCategory={category}
          preferredGender={category === 'Top' ? 'unisex' : 'unisex'} // Could enhance based on garment category
        />

        {/* Panel 3: Result */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>Result</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!aiResult && !isGenerating && (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Your AI-generated try-on result will appear here
                </p>
                
                {/* Generate Button */}
                <Button
                  onClick={handleGenerateAI}
                  disabled={!garmentImage || !category || isGenerating}
                  className="w-full"
                  size="lg"
                  data-testid="generate-try-on"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Try-On
                    </>
                  )}
                </Button>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  AI is generating your try-on result...
                </p>
              </div>
            )}

            {aiResult && (
              <div className="space-y-4">
                {/* Generated Image */}
                <div className="border rounded-lg overflow-hidden flex justify-center">
                  <img 
                    src={aiResult.generatedImage} 
                    alt="AI try-on result" 
                    className="w-48 h-64 object-cover"
                    data-testid="ai-result-image"
                  />
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold">{aiResult.productTitle}</h4>
                  <p className="text-sm text-muted-foreground">
                    Category: {aiResult.suggestedCategory}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {aiResult.suggestedDescription}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={handleDownloadResult}
                    variant="outline" 
                    className="w-full"
                    data-testid="download-result"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Result
                  </Button>
                  
                  <Button 
                    onClick={handleSaveToDraft}
                    className="w-full"
                    data-testid="save-to-draft"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Complete Product Details
                  </Button>
                  
                  <Button 
                    onClick={handleRunAgain}
                    variant="secondary" 
                    className="w-full"
                    data-testid="run-again"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Run Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}