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
import type * as goals from "../goals.js";
import type * as history from "../history.js";
import type * as lib_act from "../lib/act.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_characterSeed from "../lib/characterSeed.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_date from "../lib/date.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_gacha from "../lib/gacha.js";
import type * as lib_pdca from "../lib/pdca.js";
import type * as lib_planFallback from "../lib/planFallback.js";
import type * as lib_playerLevel from "../lib/playerLevel.js";
import type * as lib_streak from "../lib/streak.js";
import type * as missions from "../missions.js";
import type * as pdca from "../pdca.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  characters: typeof characters;
  goals: typeof goals;
  history: typeof history;
  "lib/act": typeof lib_act;
  "lib/auth": typeof lib_auth;
  "lib/characterSeed": typeof lib_characterSeed;
  "lib/constants": typeof lib_constants;
  "lib/date": typeof lib_date;
  "lib/errors": typeof lib_errors;
  "lib/gacha": typeof lib_gacha;
  "lib/pdca": typeof lib_pdca;
  "lib/planFallback": typeof lib_planFallback;
  "lib/playerLevel": typeof lib_playerLevel;
  "lib/streak": typeof lib_streak;
  missions: typeof missions;
  pdca: typeof pdca;
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
