export type MarketplaceGithubSourceConfig = {
  type: "github";
  repo: string;
};

export type MarketplacePathSourceConfig = {
  type: "path";
  path: string;
};

export type MarketplaceSourceConfig = MarketplaceGithubSourceConfig | MarketplacePathSourceConfig;

export type MarketplaceConfig = {
  sources?: MarketplaceSourceConfig[];
};
