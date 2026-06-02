# 18. Error Handling

## 18.1 API Error Responses

```typescript
// Standard error format
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

// Example: 404 Not Found
{
  "statusCode": 404,
  "message": "Schedule entry not found",
  "error": "Not Found",
  "timestamp": "2026-01-09T10:00:00.000Z",
  "path": "/api/schedule/123"
}
```

## 18.2 Error Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 400  | Bad Request - Invalid input          |
| 401  | Unauthorized - Auth required         |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource missing         |
| 409  | Conflict - Duplicate reminder        |
| 429  | Too Many Requests - Rate limited     |
| 500  | Internal Error - Server issue        |

## 18.3 Frontend Error Handling

```typescript
// Global error boundary
class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        Sentry.captureException(error);
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback />;
        }
        return this.props.children;
    }
}
```

---
