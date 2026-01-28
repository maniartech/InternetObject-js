# Change Log in Next Version

## Code Refactoring and Improvements

Restructured code in several core modules to enhance maintainability and readability. Key changes include:

- Moved serialization logic to a dedicated `serializer` module.
- Isolated loading functions into a separate `loader` module.
- The facade package discontinues to provide a clean public API by re-exporting from more relevant sub-modules like `serializer`, `loader`, `schema`, and `core`.
