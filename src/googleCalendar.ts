// Google Calendar API Integration
// Client ID: 2710449800-3c3gr0j64supeecoedmegmav5k2d7h72.apps.googleusercontent.com

const CLIENT_ID = '2710449800-3c3gr0j64supeecoedmegmav5k2d7h72.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';

let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;

const TOKEN_STORAGE_KEY = 'twy_google_token_session';
const TOKEN_EXPIRY_SKEW_MS = 30_000;

type StoredGoogleToken = {
    token: { access_token: string };
    expiresAt: number;
};

// Type declarations for Google API
declare global {
    interface Window {
        gapi: {
            load: (api: string, callback: () => void) => void;
            client: {
                init: (config: object) => Promise<void>;
                getToken: () => { access_token: string } | null;
                setToken: (token: { access_token: string } | null) => void;
                calendar: {
                    calendarList: {
                        list: () => Promise<any>;
                    };
                    events: {
                        insert: (params: object) => Promise<any>;
                        update: (params: object) => Promise<any>;
                        delete: (params: object) => Promise<any>;
                    };
                };
            };
        };
        google: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: object) => google.accounts.oauth2.TokenClient;
                    revoke: (token: string, callback: () => void) => void;
                };
            };
        };
    }

    namespace google.accounts.oauth2 {
        interface TokenClient {
            callback: (resp: TokenResponse) => void;
            requestAccessToken: (options: { prompt: string }) => void;
        }

        interface TokenResponse {
            access_token?: string;
            error?: string;
            error_description?: string;
            error_uri?: string;
            expires_in?: string;
            id_token?: string;
            scope?: string;
            token_type?: string;
            state?: string;
        }
    }
}

function clearStoredToken(): void {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

function saveStoredToken(token: { access_token: string }, expiresAt: number): void {
    const payload: StoredGoogleToken = { token, expiresAt };
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
}

function loadStoredToken(): StoredGoogleToken | null {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<StoredGoogleToken>;
        if (!parsed?.token?.access_token || typeof parsed.expiresAt !== "number") {
            clearStoredToken();
            return null;
        }
        if (parsed.expiresAt <= Date.now() + TOKEN_EXPIRY_SKEW_MS) {
            clearStoredToken();
            return null;
        }
        return { token: parsed.token, expiresAt: parsed.expiresAt };
    } catch {
        clearStoredToken();
        return null;
    }
}

// Initialize the Google API client
export async function initGoogleApi(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window.gapi === 'undefined') {
            reject(new Error('Google API not loaded'));
            return;
        }

        window.gapi.load('client', async () => {
            try {
                await window.gapi.client.init({
                    discoveryDocs: [DISCOVERY_DOC],
                });
                gapiInited = true;

                // Restore saved token if available
                const savedToken = loadStoredToken();
                if (savedToken) {
                    window.gapi.client.setToken(savedToken.token);
                }

                maybeEnableButtons();
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

// Initialize Google Identity Services
export function initGoogleIdentity(): void {
    if (typeof window.google === 'undefined') {
        console.error('Google Identity Services not loaded');
        return;
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Will be set in signIn
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons(): void {
    // Both APIs need to be loaded
    if (gapiInited && gisInited) {
        console.log('Google Calendar API ready');
    }
}

// Check if user is signed in
export function isSignedIn(): boolean {
    const stored = loadStoredToken();
    if (!stored) {
        if (window.gapi?.client?.getToken()) {
            window.gapi.client.setToken(null);
        }
        return false;
    }
    return gapiInited && gisInited && window.gapi?.client?.getToken() !== null;
}

// Get current access token
export function getAccessToken(): string | null {
    const token = window.gapi?.client?.getToken();
    return token?.access_token ?? null;
}

// Sign in to Google
export function signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Token client not initialized'));
            return;
        }

        tokenClient.callback = async (resp: google.accounts.oauth2.TokenResponse) => {
            if (resp.error) {
                reject(resp);
                return;
            }
            // Save token for this browser session only
            const token = window.gapi.client.getToken();
            if (token?.access_token) {
                const expiresInSeconds = Number(resp.expires_in ?? "3600");
                const expiresAt = Date.now() + Math.max(60, expiresInSeconds) * 1000;
                saveStoredToken({ access_token: token.access_token }, expiresAt);
            }
            resolve();
        };

        if (window.gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Skip display of account chooser for existing session
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
}

// Sign out from Google
export function signOut(): void {
    const token = window.gapi?.client?.getToken();
    if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
            window.gapi.client.setToken(null);
            clearStoredToken();
        });
    }
}

// Calendar type for listCalendars
export interface GoogleCalendar {
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
}

// List all calendars the user has access to
export async function listCalendars(): Promise<GoogleCalendar[]> {
    if (!isSignedIn()) {
        console.error('Not signed in to Google');
        return [];
    }

    try {
        const response = await window.gapi.client.calendar.calendarList.list();
        const items = response.result.items ?? [];
        return items.map((cal: any) => ({
            id: cal.id,
            summary: cal.summary,
            primary: cal.primary ?? false,
            backgroundColor: cal.backgroundColor
        }));
    } catch (err) {
        console.error('Error fetching calendars:', err);
        return [];
    }
}

// Create a calendar event
export async function createCalendarEvent(
    title: string,
    date: string,
    startTime: string,
    endTime: string,
    description?: string,
    calendarId: string = 'primary'
): Promise<string | null> {
    if (!isSignedIn()) {
        console.error('Not signed in to Google');
        return null;
    }

    try {
        const event = {
            summary: title,
            description: description ?? '12-Week-Year Block',
            start: {
                dateTime: `${date}T${startTime}:00`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
                dateTime: `${date}T${endTime}:00`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        };

        const response = await window.gapi.client.calendar.events.insert({
            calendarId: calendarId,
            resource: event,
        });

        return response.result.id ?? null;
    } catch (err) {
        console.error('Error creating calendar event:', err);
        return null;
    }
}

// Update a calendar event
export async function updateCalendarEvent(
    eventId: string,
    title: string,
    date: string,
    startTime: string,
    endTime: string,
    description?: string,
    calendarId: string = 'primary'
): Promise<boolean> {
    if (!isSignedIn()) {
        console.error('Not signed in to Google');
        return false;
    }

    try {
        const event = {
            summary: title,
            description: description ?? '12-Week-Year Block',
            start: {
                dateTime: `${date}T${startTime}:00`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
                dateTime: `${date}T${endTime}:00`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        };

        await window.gapi.client.calendar.events.update({
            calendarId: calendarId,
            eventId: eventId,
            resource: event,
        });

        return true;
    } catch (err) {
        console.error('Error updating calendar event:', err);
        return false;
    }
}

// Delete a calendar event
export async function deleteCalendarEvent(eventId: string, calendarId: string = 'primary'): Promise<boolean> {
    if (!isSignedIn()) {
        console.error('Not signed in to Google');
        return false;
    }

    try {
        await window.gapi.client.calendar.events.delete({
            calendarId: calendarId,
            eventId: eventId,
        });

        return true;
    } catch (err) {
        console.error('Error deleting calendar event:', err);
        return false;
    }
}
