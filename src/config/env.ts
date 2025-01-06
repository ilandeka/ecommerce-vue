interface EnvironmentConfig {
  apiUrl: string;
  timeout: number;
}

const developmentConfig: EnvironmentConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 15000 // 15 seconds
};

const productionConfig: EnvironmentConfig = {
  apiUrl: import.meta.env.VITE_API_URL,
  timeout: 30000 // 30 seconds
};

export const config: EnvironmentConfig =
  import.meta.env.PROD ? productionConfig : developmentConfig;
