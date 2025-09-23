import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Sparkles, Shuffle, Eye, X } from "lucide-react";
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
    <div className="space-y-4">
      {/* Panel Title */}
      <div className="flex items-center space-x-2">
        <User className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Select Model</h3>
      </div>
      
      <div className="space-y-6">
        {/* Borderless Thumbnail Display */}
        {selectedModel ? (
          <div className="space-y-4">
            <div className="w-full">
              <div className="relative">
                <img
                  src={selectedModel.thumbnailUrl || selectedModel.imageUrl}
                  alt={selectedModel.name}
                  className="w-full aspect-[2/3] object-cover rounded-lg"
                  data-testid="selected-model-image"
                />
                {/* Model Name Overlay - Bottom Left */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                    <div className="text-white text-sm font-medium truncate">
                      {selectedModel.name} - {selectedModel.gender} Model
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Simplified */}
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
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
                size="sm"
                onClick={handleClearSelection}
                data-testid="clear-model"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* No Model Selected State */}
            <div className="w-full">
              <div className="aspect-[2/3] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-muted/10">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2 text-center px-4">
                  <p className="font-medium text-sm">AI Auto-Selection</p>
                  <p className="text-xs text-muted-foreground">
                    Best model will be chosen automatically
                  </p>
                </div>
              </div>
            </div>

            {/* Selection Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    data-testid="browse-models"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Browse
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
                size="sm"
                onClick={handleRandomSelection}
                data-testid="random-model"
              >
                <Shuffle className="h-4 w-4 mr-1" />
                Random
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}