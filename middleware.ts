import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',                       // Root route
  '/api/webhook/clerk',       // Webhook route
  '/sign-in(.*)',             // Sign-in related routes
  '/sign-up(.*)',   
  '/search(.*)',          // Sign-up related routes
]);

// Define the protected middleware
export default clerkMiddleware((auth, request) => {
  // Protect all routes that are not public
  if (!isPublicRoute(request)) {
    auth().protect();  // Protect the route if it's not public
  }
}, { debug: true });  // Enable debugging to troubleshoot issues

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run middleware for API and TRPC routes
    '/(api|trpc)(.*)',
  ],
};
