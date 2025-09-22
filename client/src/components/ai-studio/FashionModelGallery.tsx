import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Search, Filter, Star, TrendingUp, Users, Crown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FashionModel } from "@/types/models";

interface FashionModelGalleryProps {
  selectedModel: FashionModel | null;
  onModelSelect: (model: FashionModel) => void;
  garmentCategory?: string;
  preferredGender?: string;
}

export default function FashionModelGallery({ 
  selectedModel, 
  onModelSelect, 
  garmentCategory,
  preferredGender 
}: FashionModelGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>(preferredGender || "all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");

  // Fetch fashion models from API with proper query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (genderFilter !== 'all') params.append('gender', genderFilter);
    if (categoryFilter !== 'all') params.append('category', categoryFilter);
    params.append('active', 'true');
    return params.toString();
  };

  const { data: models = [], isLoading, error } = useQuery<FashionModel[]>({
    queryKey: [`/api/fashion-models?${buildQueryString()}`],
  });

  // Get recommended models for quick selection
  const buildRecommendedQueryString = () => {
    const params = new URLSearchParams();
    if (garmentCategory) params.append('garmentCategory', garmentCategory);
    if (preferredGender) params.append('gender', preferredGender);
    return params.toString();
  };

  const { data: recommendedModels = [] } = useQuery<FashionModel[]>({
    queryKey: [`/api/fashion-models/recommended?${buildRecommendedQueryString()}`],
    enabled: true // Always enabled, let backend handle empty recommendations
  });

  // Auto-select recommended model if none selected and we have recommendations
  useEffect(() => {
    if (!selectedModel && recommendedModels.length > 0) {
      onModelSelect(recommendedModels[0]);
    }
  }, [recommendedModels, selectedModel, onModelSelect]);

  const filteredModels = models.filter(model => {
    // Text search
    const matchesSearch = searchQuery === "" || 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Gender filter (client-side backup for instant UI feedback)
    const matchesGender = genderFilter === 'all' || model.gender === genderFilter;
    
    // Category filter (client-side backup for instant UI feedback)
    const matchesCategory = categoryFilter === 'all' || model.category === categoryFilter;
    
    return matchesSearch && matchesGender && matchesCategory;
  });

  const FeaturedSection = () => {
    const featuredModels = filteredModels.filter(model => model.isFeatured).slice(0, 3);
    
    if (featuredModels.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          Featured Models
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {featuredModels.map((model) => (
            <ModelCard key={model.id} model={model} size="small" />
          ))}
        </div>
      </div>
    );
  };

  const RecommendedSection = () => {
    if (recommendedModels.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-blue-500" />
          Recommended for You
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {recommendedModels.slice(0, 4).map((model) => (
            <ModelCard key={model.id} model={model} size="medium" showRecommended />
          ))}
        </div>
      </div>
    );
  };

  const ModelCard = ({ 
    model, 
    size = "medium", 
    showRecommended = false 
  }: { 
    model: FashionModel; 
    size?: "small" | "medium" | "large";
    showRecommended?: boolean;
  }) => {
    const isSelected = selectedModel?.id === model.id;
    const sizeClasses = {
      small: "aspect-[3/4] h-24",
      medium: "aspect-[3/4] h-32", 
      large: "aspect-[3/4] h-40"
    };

    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
            : 'hover:shadow-md hover:scale-105'
        }`}
        onClick={() => onModelSelect(model)}
        data-testid={`fashion-model-${model.id}`}
      >
        <CardContent className="p-0 relative">
          <div className={`${sizeClasses[size]} relative overflow-hidden rounded-t-lg`}>
            <img
              src={model.thumbnailUrl || model.imageUrl}
              alt={model.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* Overlay badges */}
            <div className="absolute top-1 left-1 right-1 flex justify-between items-start">
              {model.isFeatured && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {showRecommended && (
                <Badge variant="default" className="text-xs ml-auto">
                  <Star className="h-3 w-3 mr-1" />
                  Best Match
                </Badge>
              )}
            </div>

            {/* Usage indicator */}
            {model.usageCount > 10 && (
              <div className="absolute bottom-1 right-1">
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Popular
                </Badge>
              </div>
            )}
          </div>

          {/* Model info */}
          <div className="p-2">
            <div className="text-xs font-medium truncate">{model.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {model.gender} • {model.category}
            </div>
            
            {size !== "small" && model.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {model.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {model.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{model.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load fashion models</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="model-search"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger data-testid="gender-filter">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="women">Women</SelectItem>
              <SelectItem value="men">Men</SelectItem>
              <SelectItem value="unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger data-testid="category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="athletic">Athletic</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Models Gallery */}
      <ScrollArea className="h-96">
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[3/4] h-32" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <RecommendedSection />
              <FeaturedSection />
              
              {/* All Models */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  All Models ({filteredModels.length})
                </h3>
                
                {filteredModels.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No models found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredModels.map((model) => (
                      <ModelCard key={model.id} model={model} size="medium" />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Selected Model Info */}
      {selectedModel && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Selected Model</h4>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <img
              src={selectedModel.thumbnailUrl || selectedModel.imageUrl}
              alt={selectedModel.name}
              className="w-12 h-16 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{selectedModel.name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedModel.gender} • {selectedModel.category}
              </div>
              {selectedModel.description && (
                <div className="text-xs text-muted-foreground truncate">
                  {selectedModel.description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}