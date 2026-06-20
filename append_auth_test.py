import re

with open("src/lib/__tests__/auth.test.ts", "r") as f:
    content = f.read()

update_session_test = """
  describe('Auth - updateSession', () => {
    it('should not update if there is no session cookie', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;
      const res = await updateSession(mockRequest);
      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session');
      expect(res).toBeUndefined();
    });

    it('should return base response if decrypt throws', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
        },
      } as unknown as NextRequest;
      const res = await updateSession(mockRequest);
      expect(res).toBeDefined();
      expect(res?.headers.get('set-cookie')).toBeNull();
    });

    it('should update the session expiration time', async () => {
      const validToken = await encrypt({ user: { id: 'test' } });
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: validToken }),
        },
        nextUrl: {
          protocol: 'https:',
        },
      } as unknown as NextRequest;

      const res = await updateSession(mockRequest);
      expect(res).toBeDefined();
      const setCookieHeader = res?.headers.get('set-cookie');
      expect(setCookieHeader).not.toBeNull();
      expect(setCookieHeader).toContain('session=');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('HttpOnly');
    });
  });
"""

# Insert before the last closing bracket
last_brace_index = content.rfind('});')
if last_brace_index != -1:
    new_content = content[:last_brace_index] + update_session_test + "\n});\n"
    
    # ensure NextRequest, updateSession are imported
    if "NextRequest" not in new_content:
        new_content = "import { NextRequest } from 'next/server';\n" + new_content
    if "updateSession" not in new_content:
        new_content = new_content.replace("login, encrypt, decrypt, logout, getSession", "login, encrypt, decrypt, logout, getSession, updateSession")
        
    with open("src/lib/__tests__/auth.test.ts", "w") as f:
        f.write(new_content)
    print("Appended updateSession tests.")
else:
    print("Could not find closing brace.")
