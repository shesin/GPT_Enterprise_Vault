/**
 * Test hooks (W6): `window.__SB_TEST__`, the `sb-test-resign-ai` override and the local premium flag exist only
 * in dev builds and Jest. `vite build` (production) sets __SB_TEST_HOOKS__ to false, so they are removed from the
 * shipped code; set SB_TEST_HOOKS=1 to keep them in a build (preview builds for the browser gates).
 */
declare const __SB_TEST_HOOKS__: boolean | undefined;

export const TEST_HOOKS_ENABLED: boolean =
  typeof __SB_TEST_HOOKS__ === 'undefined' ? true : __SB_TEST_HOOKS__;
