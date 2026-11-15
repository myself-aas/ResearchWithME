import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createBrowserRoutes, HYDRATION_DATA_KEY } from './routes';
import MotionModeProvider from '@/components/motion/MotionModeProvider';
import MotionScope from '@/components/motion/MotionScope';
import './globals.css';

declare global {
  interface Window {
    __RWM_HYDRATION__?: unknown;
  }
}

const hydrationData = window[HYDRATION_DATA_KEY];
const options = hydrationData
  ? ({ hydrationData } as Parameters<typeof createBrowserRouter>[1])
  : undefined;

const router = createBrowserRouter(createBrowserRoutes(), options);
const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from the SSR document');

hydrateRoot(
  root,
  <StrictMode>
    <MotionModeProvider>
      <MotionScope>
        <RouterProvider router={router} />
      </MotionScope>
    </MotionModeProvider>
  </StrictMode>,
);
