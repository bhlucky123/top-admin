export type UserType = "ADMIN" | "DEALER" | "AGENT";

const productionApiBaseUrl = "https://alfarah.in";

interface Config {
  apiBaseUrl: string;
  build: boolean;
}

export const config: Config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || productionApiBaseUrl,
  build: true
};
