# Introduction
**Reactive HTTP request manager built on top of axios for Vue 3.**
Supports **deduped requests**, **polling**, **lazy fetching**, **safe result mapping**, and works with both **Options API** and **Composition API**.

# Installation
```bash
npm install vue-smart-fetch
```
**Note:** `vue` and `axios` must be installed in your project.

# Setup
VueSmartFetch can automatically create a default axios instance, or you can provide a custom one with your own configuration.
```javascript
import { createApp } from 'vue';
import VueSmartFetch from 'vue-smart-fetch';
import axios from 'axios';
import App from './App.vue';

const app = createApp(App);

const axiosInstance = axios.create({
    baseURL: '/api',
    withCredentials: true
});

app.use(VueSmartFetch, { axios: axiosInstance });
app.mount('#app');
```
# Deduped Requests
When multiple fetches are made with the **same URL, HTTP method, params, and body**, only **one real network request** is sent. All `$fetch` instances share the same response, preventing duplicate requests and optimizing performance.
```javascript
const users1 = this.$fetch('/api/users');
const users2 = this.$fetch('/api/users');

// Only one request is sent
// Both users1 and users2 share the same result
```

# Basic Usage
Use `$fetch` to create a reactive request that automatically tracks **loading**, **error**, and **response data**.
```javascript
export default {
    data() {
        return {
            users: this.$fetch({
                url: 'https://example.com/api/users',
                safeResultGetter: result => result ? result.data : []
            })
        }
    }
}
```

## Using `safeResultGetter`
The `safeResultGetter` is a function that **maps or extracts the part of the response data you want**. It allows safe access to nested or optional data without manual null checks. 

If `safeResultGetter` is not provided, `safeResult` equals the raw `result`.

# Access Reactive Properties
```javascript
this.users.result       // Original Axios response data
this.users.safeResult   // Processed or overridden result
this.users.statusCode   // HTTP status code
this.users.headers      // Response headers
this.users.error        // Error object if request failed
this.users.isLoading    // true while request is in progress
this.users.isFinished   // true after request completes
```

# Lazy Fetch
Lazy fetch allows you to define a request that **does not run automatically**. You can start it manually whenever needed.
```javascript
export default {
    data() {
        return {
            posts: this.$fetch({
                url: 'https://example.com/api/posts',
                safeResultGetter: result => result ? result.data : [],
                lazy: true
            })
        }
    }
}
```
Start the request manually:
```javascript
this.posts.start();
```

# Polling Requests
Enable automatic polling to refetch data periodically. Polling can be a **fixed interval in milliseconds** or a **function returning an interval** based on the current data.
```javascript
this.users.poll(10000); // fetch every 10 seconds

// Dynamic interval example
this.users.poll(fetch => fetch.safeResult.length > 0 ? 30000 : 10000);
```
Stop polling when no longer needed:
```javascript
this.users.stopPoll();
```

# Overriding Safe Results
Manually modify the `safeResult` of a fetch instance **without refetching**.
```javascript
this.orders.overrideSafeResult(
  this.orders.safeResult.filter(order => order.status !== 'cancelled')
);
```
Clear the manual override to revert to the value computed by `safeResultGetter`:
```javascript
this.orders.clearSafeOverride();
```

# Modifying Fetch Parameters
You can update the URL or other request settings of an existing `$fetch` instance without creating a new one. This allows reusing the same reactive fetch object for different endpoints or query parameters.
```javascript
export default {
    data() {
        return {
            posts: this.$fetch({
                safeResultGetter: result => result ? result.data : [],
                lazy: true
            })
        }
    }
}
```
Update the URL or configuration dynamically:
```javascript
this.posts.fulfill('/api/posts?status=published');
this.posts.start();
```

# Methods Reference
| Method                      | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `start()`                   | Start the request (useful for lazy fetch).               |
| `resume()`                  | Start the request if status is `inactive`.               |
| `stop()`                    | Abort the current request if loading.                    |
| `clear()`                   | Clear `result` and any manual override.                  |
| `overrideSafeResult(value)` | Manually override `safeResult`.                          |
| `clearSafeOverride()`       | Remove manual override and revert to `safeResultGetter`. |
| `poll(timing)`              | Enable polling (`ms` or function returning ms).          |
| `stopPoll()`                | Stop ongoing polling.                                    |
| `fulfill(config)`           | Update URL/config for the next fetch.                    |

# Reactive Properties
| Property     | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| `result`     | Original Axios response data (`response.data`).               |
| `safeResult` | Processed result using `safeResultGetter` or manual override. |
| `statusCode` | HTTP status code from the response.                           |
| `headers`    | Axios response headers.                                       |
| `error`      | Error object if request fails. Null otherwise.                |
| `isLoading`  | True while the request is in progress.                        |
| `isFinished` | True when the request has completed (success or error).       |
