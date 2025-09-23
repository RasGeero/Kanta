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
        {/* Selected Model Display - Enhanced 9:16 Layout */}
        {selectedModel ? (
          <div className="space-y-4">
            <div className="w-full max-w-[300px] mx-auto">
              <div className="border rounded-lg overflow-hidden shadow-md">
                <div className="relative">
                  <img
                    src={selectedModel.thumbnailUrl || selectedModel.imageUrl}
                    alt={selectedModel.name}
                    className="w-full aspect-[9/16] object-cover"
                    data-testid="selected-model-image"
                  />
                  {selectedModel.isFeatured && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs shadow-sm">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  )}
                  
                  {/* Model Name Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="text-white font-medium text-sm">{selectedModel.name}</div>
                    <div className="text-white/80 text-xs">
                      {selectedModel.gender} • {selectedModel.category}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Compact Model Details */}
              <div className="p-3 space-y-3">
                
                {/* Tags */}
                {selectedModel.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedModel.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {selectedModel.tags.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{selectedModel.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Model Details - Compact Grid */}
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground pt-2 border-t">
                  <div className="font-medium">{selectedModel.bodyType}</div>
                  <div className="font-medium">{selectedModel.ethnicity}</div>
                  {selectedModel.skinTone && (
                    <div className="col-span-1">{selectedModel.skinTone}</div>
                  )}
                  {selectedModel.hairStyle && (
                    <div className="col-span-1">{selectedModel.hairStyle}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons - Enhanced Layout */}
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    data-testid="change-model"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Change
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
                className="flex-1"
                onClick={handleClearSelection}
                data-testid="clear-model"
              >
                <Shuffle className="h-4 w-4 mr-1" />
                Auto
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* No Model Selected State - Enhanced 9:16 Layout */}
            <div className="w-full max-w-[300px] mx-auto">
              <div className="aspect-[9/16] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-muted/20">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-3 text-center px-4">
                  <p className="font-medium text-sm">AI Auto-Selection Active</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Our AI will automatically choose the best model for your garment
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {garmentCategory && (
                      <Badge variant="outline" className="text-xs">
                        {garmentCategory}
                      </Badge>
                    )}
                    {preferredGender && (
                      <Badge variant="outline" className="text-xs">
                        {preferredGender}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Buttons - Enhanced Layout */}
            <div className="space-y-3">
              <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full"
                    size="lg"
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