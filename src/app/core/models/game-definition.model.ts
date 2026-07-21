export interface GameDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  controls: string[];
  isAvailable: boolean;
}
