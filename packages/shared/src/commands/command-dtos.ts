export interface CreateProjectDto {
  name: string;
  domain: string;
  organizationId: string;
  targetRegion?: string;
  language?: string;
}

export interface CollectSemanticDto {
  projectId: string;
  seedKeywords: string[];
  depth?: number;
  regionId?: number;
}

export interface GenerateContentPlanDto {
  projectId: string;
  clusterIds?: string[];
  targetArticlesCount?: number;
}

export interface GenerateArticleDto {
  projectId: string;
  topic: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  targetWordCount?: number;
}
