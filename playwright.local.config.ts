import config from './playwright.config';

// Exercise the local development server already running on port 3197.
export default { ...config, webServer: undefined };
