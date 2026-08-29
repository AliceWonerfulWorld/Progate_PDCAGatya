/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as characters from "../characters.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_characterSeed from "../lib/characterSeed.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_date from "../lib/date.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_gacha from "../lib/gacha.js";
import type * as lib_pdca from "../lib/pdca.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  characters: typeof characters;
  "lib/auth": typeof lib_auth;
  "lib/characterSeed": typeof lib_characterSeed;
  "lib/constants": typeof lib_constants;
  "lib/date": typeof lib_date;
  "lib/errors": typeof lib_errors;
  "lib/gacha": typeof lib_gacha;
  "lib/pdca": typeof lib_pdca;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
