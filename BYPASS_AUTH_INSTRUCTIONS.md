# Bypass Authentication for Testing (Development Only)

## Method 1: Browser Console (Quickest)

1. **Open browser** at `http://localhost:3001/login`

2. **Open Developer Console** (F12 or Cmd+Option+I)

3. **Paste this code in Console:**

```javascript
// Set test auth cookies
document.cookie = "token=test-token-123; path=/; max-age=86400";
document.cookie = 'privileges=["FULL_ACCESS"]; path=/; max-age=86400';

// Reload page
window.location.href = '/trailer/create';
```

4. **Press Enter** - You'll be redirected to `/trailer/create`

---

## Method 2: Create Test Login Endpoint (Backend)

Add this to your NestJS backend temporarily:

**File:** `stage-nest-backend/src/cms/controllers/test.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { Response } from 'express';

@Controller('test')
export class TestController {
  @Get('auto-login')
  async autoLogin(@Res() res: Response) {
    // Set test cookies
    res.cookie('token', 'test-dev-token', {
      httpOnly: false,
      maxAge: 86400000
    });
    res.cookie('privileges', JSON.stringify(['FULL_ACCESS']), {
      httpOnly: false,
      maxAge: 86400000
    });

    return res.redirect('http://localhost:3001/trailer/create');
  }
}
```

Then visit: `http://localhost:3020/test/auto-login`

---

## Method 3: Disable Auth Middleware (Temporary)

**File:** `stage-admin/src/middleware.ts`

**Comment out the auth check:**

```typescript
export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // TEMPORARILY DISABLED FOR TESTING
  // if (!PublicRoute.includes(pathname)) {
  //   const token = request.cookies.get(CookieKeys.token);
  //   ...
  // }

  return NextResponse.next(); // Allow all requests
}
```

**Restart frontend:**
```bash
cd stage-admin
npm run dev
```

---

## After Testing

**IMPORTANT:** Remove bypass before production!

1. Delete test cookies from browser
2. Re-enable middleware
3. Delete test controller

---

## Quick Test Command

Just run this in your terminal:

```bash
# Open browser with auto-set cookies
open "http://localhost:3001/login" && sleep 2 && \
osascript -e 'tell application "Google Chrome" to execute front document javascript "document.cookie=\"token=test-token-123; path=/; max-age=86400\"; document.cookie=\"privileges=[\\\"FULL_ACCESS\\\"]; path=/; max-age=86400\"; window.location.href=\"/trailer/create\";"'
```

---

## Verify It Works

After setting cookies, go to:
```
http://localhost:3001/trailer/create
```

You should see the trailer creation form with:
- "Draft Narrative" button (NEW)
- "Generate Trailer (Old)" button
