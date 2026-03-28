import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") || "";

if (apiBaseUrl && typeof window !== "undefined") {
	const originalFetch = window.fetch.bind(window);

	const resolveApiUrl = (input: string): string => {
		if (!input.startsWith("/api")) {
			return input;
		}

		return `${apiBaseUrl}${input}`;
	};

	window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
		if (typeof input === "string") {
			const isApiRequest = input.startsWith("/api");
			return originalFetch(resolveApiUrl(input), {
				...init,
				credentials: init?.credentials ?? (isApiRequest ? "include" : init?.credentials),
			});
		}

		if (input instanceof URL) {
			const isApiRequest = input.pathname.startsWith("/api");
			const nextInput = isApiRequest ? new URL(`${apiBaseUrl}${input.pathname}${input.search}`) : input;
			return originalFetch(nextInput, {
				...init,
				credentials: init?.credentials ?? (isApiRequest ? "include" : init?.credentials),
			});
		}

		const requestUrl = new URL(input.url, window.location.origin);
		const isApiRequest = requestUrl.pathname.startsWith("/api");
		if (!isApiRequest) {
			return originalFetch(input, init);
		}

		const nextUrl = `${apiBaseUrl}${requestUrl.pathname}${requestUrl.search}`;
		const nextRequest = new Request(nextUrl, input);
		return originalFetch(nextRequest, {
			...init,
			credentials: init?.credentials ?? input.credentials ?? "include",
		});
	};
}

createRoot(document.getElementById("root")!).render(<App />);
