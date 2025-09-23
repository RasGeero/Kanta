import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Star, Users, Crown, Grid, List, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const [bodyTypeFilter, setBodyTypeFilter] = useState<string>("all");
  const [ethnicityFilter, setEthnicityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"featured" | "popularity" | "name" | "recent">("featured");
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Smart defaults: Update filters when garment category changes
  useEffect(() => {
    if (garmentCategory) {
      // Auto-set category filter based on garment category
      const categoryMapping: Record<string, string> = {
        'dress': 'formal',
        'shirt': 'fashion', 
        'pants': 'fashion',
        'jacket': 'fashion',
        'activewear': 'athletic',
        'formal': 'formal'
      };
      const suggestedCategory = categoryMapping[garmentCategory.toLowerCase()] || 'all';
      setCategoryFilter(suggestedCategory);
    }
  }, [garmentCategory]);

  // Update gender filter when preferred gender changes
  useEffect(() => {
    if (preferredGender && preferredGender !== genderFilter) {
      setGenderFilter(preferredGender);
    }
  }, [preferredGender]);

  // Fetch fashion models from API with proper query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
    if (genderFilter !== 'all') params.append('gender', genderFilter);
    if (categoryFilter !== 'all') params.append('category', categoryFilter);
    params.append('active', 'true');
    return params.toString();
  };

  const { data: models = [], isLoading, error } = useQuery({
    queryKey: [`/api/fashion-models?${buildQueryString()}`],
    select: (res: any) => res?.data || [] as FashionModel[]
  });

  // Get recommended models for quick selection
  const buildRecommendedQueryString = () => {
    const params = new URLSearchParams();
    if (garmentCategory) params.append('garmentType', garmentCategory);
    if (preferredGender) params.append('gender', preferredGender);
    return params.toString();
  };

  const { data: recommendedModels = [] } = useQuery({
    queryKey: [`/api/fashion-models/recommended?${buildRecommendedQueryString()}`],
    enabled: Boolean(garmentCategory && preferredGender), // Only when both params are available
    select: (res: any) => res?.data || [] as FashionModel[]
  });

  // Auto-select recommended model if none selected and we have recommendations
  // Note: Primary auto-selection happens in AI Studio when category changes
  // This is backup auto-selection for when gallery is opened directly
  useEffect(() => {
    if (!selectedModel && recommendedModels.length > 0 && garmentCategory) {
      onModelSelect(recommendedModels[0]);
    }
  }, [recommendedModels, selectedModel, onModelSelect, garmentCategory]);

  // Enhanced filtering and sorting with useMemo for performance
  const filteredAndSortedModels = useMemo(() => {
    let filtered = models.filter((model: FashionModel) => {
      // Text search
      const matchesSearch = debouncedSearchQuery === "" || 
        model.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        model.tags.some((tag: string) => tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

      // Gender filter (client-side backup for instant UI feedback)
      const matchesGender = genderFilter === 'all' || model.gender === genderFilter;

      // Category filter (client-side backup for instant UI feedback)
      const matchesCategory = categoryFilter === 'all' || model.category === categoryFilter;

      // Body type filter
      const matchesBodyType = bodyTypeFilter === 'all' || model.bodyType === bodyTypeFilter;

      // Ethnicity filter
      const matchesEthnicity = ethnicityFilter === 'all' || model.ethnicity === ethnicityFilter;

      return matchesSearch && matchesGender && matchesCategory && matchesBodyType && matchesEthnicity;
    });

    // Sort the filtered results
    filtered.sort((a: FashionModel, b: FashionModel) => {
      switch (sortBy) {
        case 'featured':
          // Featured models first, then by usage
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return (b.usage || 0) - (a.usage || 0);
        case 'popularity':
          return (b.usage || 0) - (a.usage || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          // Sort by id (assuming newer IDs are higher/more recent)
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [models, debouncedSearchQuery, genderFilter, categoryFilter, bodyTypeFilter, ethnicityFilter, sortBy]);

  // Get unique filter options from loaded models
  const filterOptions = useMemo(() => {
    const bodyTypes = Array.from(new Set(models.map((m: FashionModel) => m.bodyType))).filter(Boolean) as string[];
    const ethnicities = Array.from(new Set(models.map((m: FashionModel) => m.ethnicity))).filter(Boolean) as string[];
    return { bodyTypes: bodyTypes.sort(), ethnicities: ethnicities.sort() };
  }, [models]);

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchQuery("");
    setGenderFilter("all");
    setCategoryFilter("all");
    setBodyTypeFilter("all");
    setEthnicityFilter("all");
    setSortBy("featured");
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== "" || genderFilter !== "all" || categoryFilter !== "all" || 
                          bodyTypeFilter !== "all" || ethnicityFilter !== "all";

  const FeaturedSection = () => {
    const featuredModels = filteredAndSortedModels.filter((model: FashionModel) => model.isFeatured).slice(0, 3);

    if (featuredModels.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          Featured Models
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {featuredModels.map((model: FashionModel) => (
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
          {recommendedModels.slice(0, 4).map((model: FashionModel) => (
            <ModelCard key={model.id} model={model} size="medium" showRecommended />
          ))}
        </div>
      </div>
    );
  };

  const ListModelCard = ({ model }: { model: FashionModel }) => {
    const isSelected = selectedModel?.id === model.id;

    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
            : 'hover:shadow-md'
        }`}
        onClick={() => onModelSelect(model)}
        data-testid={`fashion-model-list-${model.id}`}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-24 relative overflow-hidden rounded-lg flex-shrink-0">
              <img
                src={model.thumbnailUrl || model.imageUrl}
                alt={model.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{model.name}</h4>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3" />
                    {model.gender} • {model.category}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {model.ethnicity} • {model.bodyType} build
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 ml-2">
                  {model.tags.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {model.tags.length} tag{model.tags.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>
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
      small: "aspect-[2/3] h-24",
      medium: "aspect-[2/3] h-32", 
      large: "aspect-[2/3] h-40"
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

          </div>

          {/* Model info */}
          <div className="p-2">
            <div className="text-xs font-medium truncate">{model.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {model.gender} • {model.category}
            </div>

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
            placeholder="Search models by name or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="model-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Basic Filters */}
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

        {/* Control Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
              data-testid="toggle-advanced-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                  {[searchQuery, genderFilter, categoryFilter, bodyTypeFilter, ethnicityFilter]
                    .filter(f => f && f !== "all").length}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-2"
                data-testid="clear-filters"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32" data-testid="sort-filter">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="popularity">Popular</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>

            <ToggleGroup 
              value={viewMode} 
              onValueChange={(value: any) => value && setViewMode(value)}
              type="single"
              className="border rounded-md"
            >
              <ToggleGroupItem value="gallery" size="sm" data-testid="gallery-view">
                <Grid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" size="sm" data-testid="list-view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
            <Select value={bodyTypeFilter} onValueChange={setBodyTypeFilter}>
              <SelectTrigger data-testid="bodytype-filter">
                <SelectValue placeholder="Body Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Body Types</SelectItem>
                {filterOptions.bodyTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ethnicityFilter} onValueChange={setEthnicityFilter}>
              <SelectTrigger data-testid="ethnicity-filter">
                <SelectValue placeholder="Ethnicity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ethnicities</SelectItem>
                {filterOptions.ethnicities.map((ethnicity: string) => (
                  <SelectItem key={ethnicity} value={ethnicity}>{ethnicity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Models Gallery */}
      <ScrollArea className="h-96">
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[2/3] h-32" />
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
                  All Models ({filteredAndSortedModels.length})
                </h3>

                {filteredAndSortedModels.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No models found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-2">
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : viewMode === "gallery" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredAndSortedModels.map((model: FashionModel) => (
                      <ModelCard key={model.id} model={model} size="medium" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAndSortedModels.map((model: FashionModel) => (
                      <ListModelCard key={model.id} model={model} />
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
              <div className="text-xs text-muted-foreground truncate">
                {selectedModel.ethnicity} • {selectedModel.bodyType} build
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}