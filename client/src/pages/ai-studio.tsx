import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Save, 
  RotateCcw, 
  Wand2, 
  Image as ImageIcon,
  User,
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { productApi } from "@/services/api";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";

const aiStudioFormSchema = insertProductSchema.extend({
  garmentImage: z.instanceof(File).optional(),
  modelImage: z.instanceof(File).optional(),
});

type AIStudioFormData = z.infer<typeof aiStudioFormSchema>;

interface AIStudioResult {
  generatedImage: string;
  productTitle: string;
  suggestedCategory: string;
  suggestedDescription: string;
}

export default function AIStudio() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for the three panels
  const [garmentImage, setGarmentImage] = useState<File | null>(null);
  const [garmentImagePreview, setGarmentImagePreview] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [isLongTop, setIsLongTop] = useState(false);
  const [autoDetectGarmentType, setAutoDetectGarmentType] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIStudioResult | null>(null);

  // Mock seller ID - in production, get from authentication
  const sellerId = "seller-id-placeholder";

  const handleGarmentUpload = (file: File) => {
    setGarmentImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setGarmentImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleModelUpload = (file: File) => {
    setModelImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setModelImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAI = async () => {
    if (!garmentImage || !modelImage) {
      toast({
        title: "Missing Images",
        description: "Please upload both a garment and model image.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock AI result
      const mockResult: AIStudioResult = {
        generatedImage: "/api/placeholder/400/600", // This would be the actual generated image URL
        productTitle: `${category || 'Stylish'} Garment`,
        suggestedCategory: category || 'Shirts',
        suggestedDescription: `Beautiful ${category?.toLowerCase() || 'garment'} perfect for any occasion. High-quality material with excellent fit.`,
      };
      
      setAiResult(mockResult);
      
      toast({
        title: "AI Generation Complete",
        description: "Your try-on result is ready!",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save to draft mutation
  const saveToDraftMutation = useMutation({
    mutationFn: async () => {
      if (!aiResult || !garmentImage) {
        throw new Error("Missing required data");
      }

      const formData = new FormData();
      formData.append('sellerId', sellerId);
      formData.append('title', aiResult.productTitle);
      formData.append('description', aiResult.suggestedDescription);
      formData.append('category', aiResult.suggestedCategory);
      formData.append('condition', 'excellent');
      formData.append('price', '0'); // Will be set by seller later
      formData.append('status', 'draft'); // Mark as draft for seller to complete later
      formData.append('image', garmentImage);
      
      return productApi.createProduct(formData);
    },
    onSuccess: () => {
      toast({
        title: "Saved to Drafts",
        description: "Product has been saved to your seller dashboard.",
      });
      
      // Invalidate products cache to refresh seller dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/sellers', sellerId, 'products'] });
      
      // Navigate back to seller dashboard
      setLocation('/seller-dashboard');
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save product draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveToDraft = () => {
    saveToDraftMutation.mutate();
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
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/seller-dashboard')}
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Studio</h1>
            <p className="text-muted-foreground">Generate professional product photos with AI try-on technology</p>
          </div>
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
                      className="w-full h-48 object-cover rounded-lg mx-auto"
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
                  <SelectItem value="Top">Top</SelectItem>
                  <SelectItem value="Bottom">Bottom</SelectItem>
                  <SelectItem value="Full-body">Full-body</SelectItem>
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

        {/* Panel 2: Select Model */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Select Model</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Model Image */}
            <div>
              <Label>Upload Model Image</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                {modelImagePreview ? (
                  <div className="space-y-4">
                    <img 
                      src={modelImagePreview} 
                      alt="Model preview" 
                      className="w-full h-48 object-cover rounded-lg mx-auto"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setModelImage(null);
                        setModelImagePreview(null);
                      }}
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <>
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Upload a clear photo of the model
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleModelUpload(file);
                        }}
                        className="hidden"
                        id="model-upload"
                        data-testid="model-upload"
                      />
                      <label htmlFor="model-upload">
                        <Button type="button" variant="outline" asChild>
                          <span>Choose Image</span>
                        </Button>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Model Controls */}
            <div className="space-y-4">
              <Button 
                variant="secondary" 
                className="w-full"
                disabled={!modelImage}
                data-testid="generate-ai-model"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Generate AI Model
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                AI will process and normalize the model image for better try-on results
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateAI}
              disabled={!garmentImage || !modelImage || isGenerating}
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
          </CardContent>
        </Card>

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
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Your AI-generated try-on result will appear here
                </p>
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
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={aiResult.generatedImage} 
                    alt="AI try-on result" 
                    className="w-full h-64 object-cover"
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
                    disabled={saveToDraftMutation.isPending}
                    className="w-full"
                    data-testid="save-to-draft"
                  >
                    {saveToDraftMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save to Product Draft
                      </>
                    )}
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