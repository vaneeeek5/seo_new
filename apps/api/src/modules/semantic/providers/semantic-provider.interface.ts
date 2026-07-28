export interface ISemanticProvider {
  /**
   * Fetches similar LSI keywords and search phrases for a given base keyword.
   * @param baseKeyword Root seed keyword / topic
   * @param projectId Project ID to load dynamic encrypted integration credentials
   * @param regionId Yandex Wordstat Region ID (e.g. 225 for Russia, 1 for Moscow)
   */
  getSimilarKeywords(baseKeyword: string, projectId?: string, regionId?: number): Promise<string[]>;

  /**
   * Fetches monthly search volumes for a list of keywords.
   * @param keywords Array of keywords to query
   * @param projectId Project ID to load dynamic encrypted integration credentials
   * @param regionId Yandex Wordstat Region ID (e.g. 225 for Russia, 1 for Moscow)
   */
  getSearchVolume(keywords: string[], projectId?: string, regionId?: number): Promise<Record<string, number>>;
}
