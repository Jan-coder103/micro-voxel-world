# Retired development-page checks

These files preserve the browser checks for pages removed on 30 October 2026,
and the original unit files containing tests of removed presentation code.
The `.archived` suffix prevents TypeScript, ESLint, Vitest and Playwright from
collecting them. They are historical records, not runnable current tests.

Shared-model unit cases remain active. The depot workshop check was extracted
from battlefield.spec.ts into tests/browser/depot-workshop.spec.ts. Current
workshop navigation and production-entry checks live in workshop-shell.spec.ts.
