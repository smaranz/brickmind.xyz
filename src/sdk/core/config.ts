/**
 * Optional platform API base URL used by generated SDK clients.
 */
const DEFAULT_PLATFORM_API_BASE = "";

export const PLATFORM_API_BASE =
	import.meta.env.VITE_PLATFORM_API_URL || DEFAULT_PLATFORM_API_BASE;

export const EXECUTE_APIS_BASE = `${PLATFORM_API_BASE}/execute-apis/v2`;
