import {
  createRootRouteWithContext,
  createRoute,
  Outlet,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar.js';
import { MobileNav } from '../components/MobileNav.js';
import { HomePage } from '../pages/HomePage.js';

export interface RouterContext {
  queryClient: QueryClient;
}

// Root layout
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="min-h-dvh bg-omflix-black">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  ),
});

// Home route
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

// Route tree
export const routeTree = rootRoute.addChildren([homeRoute]);
