import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Sparkles, Star, Shuffle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FashionModelGallery from "./FashionModelGallery";
import { FashionModel } from "@/types/models";

interface FashionModelSelectorProps {
  selectedModel: FashionModel | null;
  onModelSelect: (model: FashionModel | null) => void;
  garmentCategory?: string;
  preferredGender?: string;
}

export default function FashionModelSelector({
  selectedModel,
  onModelSelect,
  garmentCategory,
  preferredGender
}: FashionModelSelectorProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const handleModelSelect = (model: FashionModel) => {
    onModelSelect(model);
    setIsGalleryOpen(false);
  };

  const handleClearSelection = () => {
    onModelSelect(null);
  };

  const handleRandomSelection = () => {
    // Will trigger auto-selection in gallery based on preferences
    setIsGalleryOpen(true);
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Select Model</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose from our curated collection of AI fashion models
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Model Display */}
        {selectedModel ? (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="relative">
                <img
                  src={selectedModel.thumbnailUrl || selectedModel.imageUrl}
                  alt={selectedModel.name}
                  className="w-full h-48 object-cover"
                  data-testid="selected-model-image"
                />
                {selectedModel.isFeatured && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="p-3 space-y-2">
                <div className="font-medium">{selectedModel.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedModel.gender} • {selectedModel.category}
                </div>
                {selectedModel.description && (
                  <div className="text-xs text-muted-foreground">
                    {selectedModel.description}
                  </div>
                )}
                
                {/* Tags */}
                {selectedModel.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedModel.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {selectedModel.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{selectedModel.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Model Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <div>Body Type: {selectedModel.bodyType}</div>
                  <div>Ethnicity: {selectedModel.ethnicity}</div>
                  {selectedModel.skinTone && (
                    <div>Skin Tone: {selectedModel.skinTone}</div>
                  )}
                  {selectedModel.hairStyle && (
                    <div>Hair: {selectedModel.hairStyle}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    data-testid="change-model"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Change Model
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Choose Fashion Model</DialogTitle>
                  </DialogHeader>
                  <FashionModelGallery
                    selectedModel={selectedModel}
                    onModelSelect={handleModelSelect}
                    garmentCategory={garmentCategory}
                    preferredGender={preferredGender}
                  />
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={handleClearSelection}
                data-testid="clear-model"
              >
                Use Auto-Selection
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* No Model Selected State */}
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="space-y-2">
                <p className="font-medium">AI Auto-Selection Active</p>
                <p className="text-sm text-muted-foreground">
                  Our AI will automatically choose the best model for your garment
                </p>
                {garmentCategory && (
                  <Badge variant="outline" className="mt-2">
                    {garmentCategory} Category
                  </Badge>
                )}
                {preferredGender && (
                  <Badge variant="outline" className="mt-2">
                    {preferredGender} Model
                  </Badge>
                )}
              </div>
            </div>

            {/* Selection Buttons */}
            <div className="space-y-2">
              <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full"
                    data-testid="browse-models"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Browse Model Gallery
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Choose Fashion Model</DialogTitle>
                  </DialogHeader>
                  <FashionModelGallery
                    selectedModel={selectedModel}
                    onModelSelect={handleModelSelect}
                    garmentCategory={garmentCategory}
                    preferredGender={preferredGender}
                  />
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleRandomSelection}
                data-testid="random-model"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Get Recommendation
              </Button>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p>• Models are professionally curated for optimal try-on results</p>
          <p>• AI automatically matches models to your garment type</p>
          <p>• All models are ethically sourced and consenting</p>
        </div>
      </CardContent>
    </Card>
  );
}