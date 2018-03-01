# Boruca
### Transparent Cross-Window Class Proxying

> _Boruca_ is a native Costa Rican language (http://boruca.org/en/language)

Boruca transparently handles proxying classes across different `window` scopes.

## How to use

Include Boruca in both your windows:

**Important**

Boruca works only if a proxy is created in both windows! If only one-way function calling is required, the calling side can pass a dummy `class {}` into the `Boruca.proxy()` function.

```html
<script src="https://nimiq.github.io/libraries/boruca-messaging/src/boruca.js"></script>
```
_A minified file and an ES6 Module is currently not provided._

Then, in both windows, create a `Boruca.proxy()` by handing it a reference to the other window, the origin restriction, and your local class. The returned promise resolves to a class instance that mirrors the class made available in the other window:

**Window 1**
```javascript
// The class to be made available to the other window
class ApiClass1 {
    ...
}

const api2 = await Boruca.proxy(window2, origin2, ApiClass1);
```

**Window 2**
```javascript
// The class to be made available to the other window
class ApiClass2 {
    ...
}

const api1 = await Boruca.proxy(window1, origin1, ApiClass2);
```

After the `Boruca.proxy()` promise resolves, both windows are connected and both class proxies are fully usable, just as if they were in the same window (with the exception that all proxied functions are now necessarily asynchroneous and return promises).

## How it works
When calling `Boruca.proxy()`, Boruca creates an extended instance of the class passed in, in which function calls are augmented by listeners and senders of the `message` event on the remote and local window instances (using `window.postMessage()`). Additionally, Boruca makes a list of all (own property) function names available in the provided local class. It then waits for the other instance to initiate. Both Boruca instances in the two windows then exchange the list of function names provided by their own local class and build a synthetic proxy class with generated functions. This generated class is then returned to the caller and can be used to call functions across window borders.

Thus, each Boruca instance creates two classes: one augmented local class, and a generated proxy class. Some logic then makes sure that each class only receives the messages meant for it.

_MIT Licence_

&copy; 2018 Nimiq Foundation
