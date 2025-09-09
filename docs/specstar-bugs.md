# Specstar Bugs

## Session "active" being set to `false` prematurely

* Session state "session_active" is set to `false` prematurely.
* The only hook that should update session_active is session_start and session_end
* Do not set session_active to false on stop

## TUI Loading

Currently the TUI opens to the Help page, instead there should be a configuration setting for the default page.

* Add configuration setting `startPage` that can be ("plan"|"observe"|"help")
* On startup (running command `specstar`), open the page specified in the settings or default to the help page if none set.

## TUI Config Settings

There are some config settings that do not make sense currently and some that we need to implement the functionality.

* Remove `"sessionPath": ".specstar/sessions",`, this should not be customizable. 

## TUI Lists Display

All lists in the TUI need some refactor.

* Update the style for highlighted elements in the list. Instead of a green background just make the text green.
* Remove the emojis from the list items
* Lists should scroll when longer than the parent box, currently overflowing

## Observe View Refactor

The observe view does not match the original spec as described in `docs/specstar-plan.md` and does not have a lot of useful functionality.

* There should be a left sidebar with a list of all sessions
* Each session in the list should have an indicator next to it for "session_active". Use a green dot for the indicator
* When highlighted, a user can press `enter` key to open session details in the right column
* Session details should be a dashboard style layout within the right column
* Data to display: all data in the session state object. (Session id, session title, session active, agents active/complete, list of files that have been read/edited/written, tool counts, etc)
