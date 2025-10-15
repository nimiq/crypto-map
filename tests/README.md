# Test Suite Documentation

## Overview

This test suite provides unit tests for the Pay App's opening hours filtering functionality. Tests focus on edge cases and error handling to ensure robust behavior.

## Test Files

### `open-now.test.ts`

Comprehensive tests for the `filterOpenNow` function.

**Coverage:**

1. **Opening Hours Filtering**
   - Validates graceful degradation when `openingHours` is malformed
   - Tests timezone handling with proper cleanup via `finally` blocks
   - Ensures locations without opening hours data are filtered out
   - Verifies the function never throws, even with invalid data
   - Tests actual filtering logic during/outside business hours

2. **Edge Cases**
   - Empty arrays
   - Whitespace handling
   - Multiple malformed entries

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (development)
pnpm test --watch

# Run specific test file
pnpm test open-now.test.ts

# Run with typecheck
pnpm test && pnpm run typecheck
```

## Design Decisions

### Why Focus on Unit Tests?

The `filterOpenNow` function is the primary logic that can fail with bad data. By thoroughly testing this function with various edge cases, we catch the majority of potential runtime errors without needing complex mocking or external dependencies.

### Real-time Clock Mocking

Opening hours tests use `vi.setSystemTime()` to control the reference time, ensuring tests pass regardless of when they run. The `finally` blocks ensure timers are always restored, even if assertions fail.

### No External Dependencies

These tests run completely offline without requiring:

- Database connections
- OpenAI API calls
- Network requests

This makes them fast, deterministic, and suitable for CI environments.

## Continuous Integration

These tests are designed to run in CI environments without any external dependencies or secrets. All necessary logic is tested in isolation.
