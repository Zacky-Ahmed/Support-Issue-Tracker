# Frontend

React + Vite support desk connected to the Express/MongoDB API.

## Run

From this folder, run `npm install`, then `npm run dev`. Start the backend in another terminal. Vite uses port 5173 by default. If occupied, use `npm run dev -- --port 5174`.

- `npm run lint`: source checks
- `npm run build`: production output in dist

The development proxy forwards /api to localhost:5000. See the root README for production configuration.

## Interface

Create/edit dialogs, direct status updates, delete confirmation, client/title search, combined filters, overdue queue, summary counts, responsive table/cards, loading/error/empty states and save notifications. Data comes from MongoDB; no hardcoded demo records or local-storage copy are used.

Search and filters run on the loaded list so summary counts stay global. Refresh reloads external changes. The clock updates every 30 seconds to recalculate overdue highlights. Saving operations update the visible list only after the API confirms success; failed forms remain open with their values intact. Native modal dialogs provide focus containment and Escape support.

## Browser checks performed

- Empty form validation.
- Create a fictional issue and verify its returned ID.
- Change status, reload the browser, and confirm persistence.
- Combine search, priority, and status filters.
- Use a temporary 25-hour-old High priority fixture to verify overdue highlighting.
- Edit and resolve that issue; confirm overdue count returns to zero and the original report time remains.
- Show the no-results state after status filters exclude the updated issue.
- Open delete confirmation and cancel; confirm the record remains.
- Remove the temporary fixture via API, then attempt saving the stale open form: visible error, form retained, no success notification.
- Refresh to confirm empty-state rendering after cleanup.
- Inspect desktop and 390px mobile layouts; fix mobile overflow by displaying table rows as cards.

The successful DELETE API path is covered by backend integration tests. Browser verification exercised the confirmation and cancel path, not the final destructive button.
