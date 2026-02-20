import { endpoints } from "../endpoints";
import { stageBackendApiService } from "../http";

interface GenreResponse {
  responseMessage: string;
  data: {
   genres:Array<{ 
    id: number;
    name: string;}>
  }
}
interface subGenreResponse {
  responseMessage: string;
  data: {
   subGenres:Array<{ 
    _id: number;
    name: string;}>
  }
}
interface themeResponse {
  responseMessage: string;
  data: {
   theme:Array<{ 
    _id: number;
    name: string;}>
  }
}
interface moodResponse {
  responseMessage: string;
  data: {
   mood:Array<{ 
    _id: number;
    name: string;}>
  }
}
interface descriptorTagResponse {
  responseMessage: string;
  data: {
    descriptorTag:Array<{ 
    _id: number;
    name: string;}>
  }
}
export const categoriesApi = {
  getGenres: () => 
    stageBackendApiService.get<GenreResponse>(endpoints.categories.getGenres),
    
  getSubGenres: () => 
    stageBackendApiService.get<subGenreResponse>(endpoints.categories.getSubGenres),
    
  getThemes: () => 
    stageBackendApiService.get<themeResponse>(endpoints.categories.getThemes),
    
  getMoods: () => 
    stageBackendApiService.get<moodResponse>(endpoints.categories.getMoods),
    
  getDescriptorTags: () => 
    stageBackendApiService.get<descriptorTagResponse>(endpoints.categories.getDescriptorTags),
}; 