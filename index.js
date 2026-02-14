import axios from 'axios';
import { reactive, computed } from 'vue';

const FetchStatus = {
    Inactive: 'inactive',
    Loading: 'loading',
    Done: 'done'
};

const pendingRequests = new Map();

function hasUrl(config) {
    return 'url' in config && typeof config.url === 'string' && config.url.trim().length > 0;
}

function getRequestKey(config) {
    const { method = 'get', url, params, data } = config || {};
    const safeConfig = { method, url, params, data };
    return JSON.stringify(safeConfig);
}

function createFetch(axiosInstance) {
    return function (initialConfig = {}) {
        let {
            onSuccess,
            onError,
            onFinish,
            safeResultGetter = result => result,
            lazy = false,
            poll = -1,
            ...axiosConfig
        } = typeof initialConfig === 'string' ? { url: initialConfig } : initialConfig;

        const state = reactive({
            result: null,
            statusCode: null,
            headers: null,
            error: null,
            status: FetchStatus.Inactive,
            overrideSafeResult: undefined
        });

        const fetchResult = {
            result: computed(() => state.result),
            statusCode: computed(() => state.statusCode),
            headers: computed(() => state.headers),
            error: computed(() => state.error),
            isLoading: computed(() => state.status === FetchStatus.Loading),
            isFinished: computed(() => state.status === FetchStatus.Done),
            safeResult: computed(() => state.overrideSafeResult === undefined ? safeResultGetter(state.result) : state.overrideSafeResult)
        };

        let controller = null;
        let shared = null;
        let currentKey = null;
        let currentConfig = axiosConfig || {};
        let pollTimer = null;

        async function runFetch(config) {
            if (!hasUrl(config)) {
                throw new Error('Config with url is required');
            }

            currentKey = getRequestKey(config);

            if (pendingRequests.has(currentKey)) {
                shared = pendingRequests.get(currentKey);
            }
            else {
                controller = new AbortController();

                shared = axiosInstance({
                    ...config,
                    signal: controller.signal
                }).finally(() => {
                    pendingRequests.delete(currentKey);
                });

                pendingRequests.set(currentKey, shared);
            }

            state.status = FetchStatus.Loading;

            try {
                const response = await shared;

                state.overrideSafeResult = undefined;
                state.result = response.data;
                state.statusCode = response.status;
                state.headers = response.headers;
                state.error = null;
                state.status = FetchStatus.Done;

                if (typeof onSuccess === 'function') {
                    onSuccess(fetchResult);
                }

                return response;
            }
            catch (error) {
                if (!axios.isCancel(error)) {
                    state.error = error;
                    state.status = FetchStatus.Done;

                    if (typeof onError === 'function') {
                        onError(fetchResult);
                    }
                }

                throw error;
            }
            finally {
                const pollTiming = typeof poll === 'function' ? poll(fetchResult) : poll;

                if (pollTiming >= 0) {
                    pollTimer = setTimeout(() => runFetch(currentConfig), pollTiming);
                }

                if (typeof onFinish === 'function') {
                    onFinish(fetchResult);
                }
            }
        }

        if (!lazy && hasUrl(currentConfig)) {
            runFetch(currentConfig);
        }
        else {
            state.status = FetchStatus.Inactive;
        }

        return {
            ...fetchResult,

            overrideSafeResult(value) {
                state.overrideSafeResult = value;
            },

            clearSafeOverride() {
                state.overrideSafeResult = undefined;
            },

            poll(timing) {
                poll = timing;
                const pollTiming = typeof poll === 'function' ? poll(fetchResult) : poll;

                if (!lazy && pollTiming >= 0 && !pollTimer && state.status === FetchStatus.Inactive && hasUrl(currentConfig)) {
                    runFetch(currentConfig);
                }
            },

            stopPoll() {
                if (pollTimer) {
                    clearTimeout(pollTimer);
                    pollTimer = null;
                }
            },

            stop() {
                if (controller && state.status === FetchStatus.Loading) {
                    controller.abort();
                    state.status = FetchStatus.Done;
                }
            },

            async resume() {
                if (state.status === FetchStatus.Inactive) {
                    await runFetch(currentConfig);
                }
            },

            async start() {
                if (state.status !== FetchStatus.Loading) {
                    await runFetch(currentConfig);
                }
            },

            clear() {
                state.overrideSafeResult = undefined;
                state.result = null;
            },

            fulfill(config) {
                currentConfig = typeof config === 'string' ? { url: config } : config;
            }
        };
    };
}

export default {
    install(app, options) {
        if (!options?.axios) {
            throw new Error('axios instance must be provided');
        }

        app.config.globalProperties.$fetch = createFetch(options.axios);

        app.provide('$fetch', app.config.globalProperties.$fetch);
    }
};
